import { createFileRoute } from '@tanstack/react-router'

const API = 'https://api.elevenlabs.io/v1/convai'
const ACCEPTED = /\.(pdf|txt|md)$/i

// Puts the student's files into the tutor agent's knowledge base, so the voice agent reads the real material.
// shortcut: the knowledge base sits on the shared agent, so the last session to start wins; use one agent per session before real users.
export const Route = createFileRoute('/api/intake')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const files = (await request.formData()).getAll('files').filter((f): f is File => f instanceof File)
        const rejected = files.find((f) => !ACCEPTED.test(f.name))
        if (rejected) return new Response(`ملف غير مدعوم: ${rejected.name}. استخدم PDF أو TXT أو MD.`, { status: 415 })

        const call = async (path: string, init?: RequestInit) => {
          const res = await fetch(`${API}${path}`, {
            ...init,
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '', ...init?.headers },
          })
          if (!res.ok) throw new Error(`ElevenLabs ${path} failed: ${res.status} ${await res.text()}`)
          return res.json()
        }

        try {
          const docs = await Promise.all(
            files.map(async (file) => {
              const body = new FormData()
              body.append('file', file)
              body.append('name', file.name)
              const { id } = await call('/knowledge-base/file', { method: 'POST', body })
              // "prompt" puts the whole document in the agent's context; no RAG indexing to wait for.
              return { type: 'file', id, name: file.name, usage_mode: 'prompt' }
            }),
          )
          const agentId = process.env.ELEVENLABS_AGENT_ID
          const agent = await call(`/agents/${agentId}`)
          // Send the whole prompt object back so the prompt text, llm and tools survive.
          const { tools: _inlineTools, ...prompt } = agent.conversation_config.agent.prompt
          await call(`/agents/${agentId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ conversation_config: { agent: { prompt: { ...prompt, knowledge_base: docs } } } }),
          })
          return Response.json({ names: files.map((f) => f.name) })
        } catch (error) {
          return new Response(error instanceof Error ? error.message : String(error), { status: 502 })
        }
      },
    },
  },
})
