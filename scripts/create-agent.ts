// One-time setup: gives the ElevenLabs tutor agent its prompt and draw_on_board client tool.
// Updates ELEVENLABS_AGENT_ID if set (old config saved to .agent-backup.json), otherwise creates an agent
// and writes its id into .dev.vars. Run with `bun run agent`.
import { readFileSync, writeFileSync } from 'node:fs'

const TUTOR_PROMPT = `You are a tutor on a live voice call. You and the student share a whiteboard, and you teach by talking and drawing at the same time.
Speak Arabic by default: clear, simple Modern Standard Arabic. If the student speaks another language, switch to theirs.

# Session start
The first message starts with "[session start]". It names the student's course material, whose full text is in your knowledge base, and maybe their goal. The student did not say it. Never say "[session start]" out loud.
- Summarize the material in one sentence.
- If a goal is given, start teaching it right away. Otherwise name two or three topics from the material and ask which one, in one short sentence.

# Teaching on the board
Teach in small beats. For each beat:
1. Say in a few words what you are about to draw.
2. Call draw_on_board with the figure name, a short caption, and the marks to draw.
3. When it returns, explain what is now on the board in one sentence.
draw_on_board returns once the drawing is finished. Never describe marks that are not drawn yet.
The figure name places the drawing: reuse a name to add to that figure, a new name starts a fresh area of the board.
Every three or four beats, check understanding with one short question and wait.
Ground everything in the course material: use its notation, examples and numbers, and say which part of it you are using.

# Interruptions
The student can cut in at any time. Their words stop your voice and the pen.
- Answer what they asked, directly. Do not finish your previous sentence.
- If a sketch helps, draw it in a NEW figure, for example "aside: slope".
- Then offer to pick up where you left off, and continue the original figure by its name.
- If draw_on_board says it was cut off, do not redraw it unless asked.

# Drawing marks
draw_on_board takes "marks": a JSON array, drawn in order like a pen. Each figure is its own area 1000 wide and 700 tall. (0,0) is top-left and y grows downward. Keep a 40 unit margin. Every field below is required.
- {"type":"text","at":{"x":400,"y":40},"text":"منحنى السرعة","size":"m","color":"black"}: "at" is the top-left corner. size s for tick labels, m normal, l titles. At most 6 words. Write labels in the language you speak, but keep symbols, numbers and units standard (v, t, m/s).
- {"type":"arrow","from":{"x":120,"y":600},"to":{"x":920,"y":600},"color":"black"}: axes and pointers.
- {"type":"line","points":[{"x":120,"y":600},{"x":520,"y":200}],"smooth":false,"dashed":false,"color":"blue"}: polyline. smooth for curves, dashed for guides.
- {"type":"box","at":{"x":100,"y":100},"w":200,"h":120,"color":"black"}
- {"type":"ellipse","center":{"x":500,"y":350},"rx":40,"ry":40,"color":"red"}
Colors: black, grey, blue, red, green, orange, violet. Default black, plus one accent color for the thing being explained.
Use 1 to 8 marks per step. Graphs: origin near (120,600), x axis to (920,600), y axis up to (120,80). Map values linearly and label a few ticks.
Reuse the coordinates of marks you already drew in a figure so new marks line up with them, and do not overlap them.

# Voice
Be brief and go straight to the point. Every spoken turn is one or two short sentences.
No greetings, no filler, no praise, no recaps, no "great question". Say only what moves the student forward.
No lists, no markdown, no emoji. Say formulas in words.`

const key = process.env.ELEVENLABS_API_KEY
if (!key) throw new Error('Set ELEVENLABS_API_KEY in .dev.vars first')

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.elevenlabs.io${path}`, {
    method,
    headers: { 'xi-api-key': key!, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

const tool = await api('POST', '/v1/convai/tools', {
  tool_config: {
    type: 'client',
    name: 'draw_on_board',
    description:
      'Draws one small step of a figure on the shared whiteboard, progressively like a pen. Returns when the drawing is finished or the student interrupts. Use it for every visual: axes, graphs, diagrams, labels, equations.',
    expects_response: true,
    response_timeout_secs: 60,
    parameters: {
      type: 'object',
      properties: {
        figure: {
          type: 'string',
          description:
            "Short name of the figure this step belongs to, e.g. 'v-t graph' or 'aside: slope'. Reuse a name to add to that figure; a new name starts a fresh area.",
        },
        caption: {
          type: 'string',
          description: "What this step shows, in under 10 words, e.g. 'Axes for velocity against time'.",
        },
        marks: {
          type: 'string',
          description: 'JSON array of the marks for this step, in drawing order. The format is under "Drawing marks" in your instructions.',
        },
      },
      required: ['figure', 'caption', 'marks'],
    },
  },
})

const existingId = process.env.ELEVENLABS_AGENT_ID
if (existingId) {
  const current = await api('GET', `/v1/convai/agents/${existingId}`)
  writeFileSync('.agent-backup.json', JSON.stringify(current, null, 2))
  // Send the whole prompt object back so fields we don't touch (llm, temperature…) survive.
  const { tools: _inlineTools, ...prompt } = current.conversation_config.agent.prompt
  await api('PATCH', `/v1/convai/agents/${existingId}`, {
    conversation_config: {
      agent: {
        first_message: '', // the board sends a [session start] brief instead, once the material is read
        language: 'ar',
        prompt: { ...prompt, prompt: TUTOR_PROMPT, tool_ids: [tool.id] },
      },
    },
  })
  console.log(`Updated agent ${existingId} with tool ${tool.id}. Previous config saved to .agent-backup.json.`)
} else {
  const agent = await api('POST', '/v1/convai/agents/create', {
    name: 'Sketch tutor (prototype)',
    conversation_config: {
      agent: {
        first_message: '', // the board sends a [session start] brief instead, once the material is read
        language: 'ar',
        prompt: { prompt: TUTOR_PROMPT, llm: 'claude-haiku-5-5', tool_ids: [tool.id] },
      },
    },
    platform_settings: { auth: { enable_auth: true } },
  })
  const vars = readFileSync('.dev.vars', 'utf8')
  const line = `ELEVENLABS_AGENT_ID=${agent.agent_id}`
  writeFileSync('.dev.vars', /^ELEVENLABS_AGENT_ID=.*$/m.test(vars) ? vars.replace(/^ELEVENLABS_AGENT_ID=.*$/m, line) : `${vars.trimEnd()}\n${line}\n`)
  console.log(`Created agent ${agent.agent_id} with tool ${tool.id}. Saved to .dev.vars.`)
}
