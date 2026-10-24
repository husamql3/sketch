import { ConversationProvider, useConversation, useConversationClientTool } from '@elevenlabs/react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { convertToExcalidrawElements, Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { z } from 'zod'
import { elementSchema, FIGURE, type Element } from './elements'
import { drawElement } from './pen'
import { emptyTimeline, isDrawing, reduce, type Action, type Entry, type Timeline } from './timeline'

export type Session = { files: File[]; goal: string }

const KICKOFF = '[session start]'

export default function Board({ session }: { session: Session }) {
  return (
    <ConversationProvider>
      <Classroom session={session} />
    </ConversationProvider>
  )
}

function Classroom({ session }: { session: Session }) {
  const [board, setBoard] = useState<ExcalidrawImperativeAPI>()
  const [material, setMaterial] = useState<string[]>() // file names in the agent's knowledge base; undefined while uploading
  const [draft, setDraft] = useState('')
  const [callFailed, setCallFailed] = useState(false)

  // Ref-backed so async tool calls read the latest timeline synchronously; renders just mirror it.
  const timeline = useRef<Timeline>(emptyTimeline)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const dispatch = (a: Action) => {
    timeline.current = reduce(timeline.current, a)
    rerender()
  }

  // One signal for everything the tutor is doing right now; aborting it stops the pen and the stream.
  const cut = useRef(new AbortController())
  const queue = useRef(Promise.resolve())
  const lastTyped = useRef('')

  function interrupt() {
    cut.current.abort()
    cut.current = new AbortController()
    dispatch({ type: 'interrupted' })
  }

  const conversation = useConversation({
    onInterruption: interrupt,
    onMessage: ({ role, message }) => {
      if (role === 'user' && (message.startsWith(KICKOFF) || message === lastTyped.current)) return
      if (role === 'user' && isDrawing(timeline.current)) interrupt()
      dispatch({ type: 'said', who: role === 'agent' ? 'tutor' : 'student', text: message })
    },
    onAgentResponseCorrection: (c) =>
      dispatch({ type: 'corrected', original: c.original_agent_response, corrected: c.corrected_agent_response }),
    onError: (message) => dispatch({ type: 'noted', text: `خطأ في الصوت: ${message}` }),
  })

  useConversationClientTool('draw_on_board', (params) => {
    const signal = cut.current.signal
    const beat = queue.current.then(() => drawBeat(String(params.figure ?? 'board'), String(params.caption ?? ''), params.marks, signal))
    queue.current = beat.then(
      () => {},
      () => {},
    )
    return beat
  })

  async function drawBeat(figure: string, caption: string, rawMarks: unknown, signal: AbortSignal): Promise<string> {
    if (signal.aborted || !board) return 'Skipped: the student interrupted.'
    const marks = parseMarks(rawMarks)
    if (typeof marks === 'string') return `Nothing drawn, fix the marks and call again: ${marks}`
    const id = crypto.randomUUID()
    const isNewFigure = !timeline.current.figures.some((f) => f.name === figure)
    dispatch({ type: 'beatStarted', id, figure, instruction: caption })
    const origin = timeline.current.figures.find((f) => f.name === figure)!
    // Frame the figure's area (an unadded rectangle), even before anything is drawn in it.
    board.scrollToContent(
      convertToExcalidrawElements([{ type: 'rectangle', x: origin.x - 80, y: origin.y - 140, width: FIGURE.w + 160, height: FIGURE.h + 220 }]),
      { fitToViewport: true, animate: true, duration: 500 },
    )
    if (isNewFigure) {
      await drawElement(board, { type: 'text', at: { x: 0, y: -80 }, text: figure, size: 's', color: 'grey' }, origin, signal)
    }
    let drawn = 0
    for (const element of marks) {
      await drawElement(board, element, origin, signal)
      if (signal.aborted) break
      dispatch({ type: 'elementDrawn', id, element })
      drawn++
    }
    dispatch({ type: 'beatEnded', id })
    return signal.aborted
      ? `Cut off after ${drawn} marks: the student interrupted. Answer them first and do not redraw this unless asked.`
      : `Drawn ${drawn} marks in figure "${figure}". Explain what is on the board now.`
  }

  // The agent loads its knowledge base when the call starts, so the files go in first, then the call opens.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (session.files.length) dispatch({ type: 'noted', text: `جارٍ مشاركة ${session.files.map((f) => f.name).join('، ')} مع المعلّم…` })
    const form = new FormData()
    session.files.forEach((f) => form.append('files', f)) // no files still clears the previous session's material
    fetch('/api/intake', { method: 'POST', body: form })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ names: string[] }>) : Promise.reject(new Error(await r.text()))))
      .then(({ names }) => {
        if (names.length) dispatch({ type: 'noted', text: `أصبحت لدى المعلّم: ${names.join('، ')}` })
        setMaterial(names)
      })
      .catch((e: Error) => {
        dispatch({ type: 'noted', text: `تعذّرت مشاركة الملفات: ${e.message}` })
        setMaterial([])
      })
      .then(() => fetch('/api/voice-token'))
      .then(async (r) => (r.ok ? (r.json() as Promise<{ token: string }>) : Promise.reject(new Error(await r.text()))))
      .then(({ token }) => conversation.startSession({ conversationToken: token, connectionType: 'webrtc', stripAudioTags: true }))
      .catch((e: Error) => {
        setCallFailed(true)
        dispatch({ type: 'noted', text: `تعذّر بدء المكالمة: ${e.message}` })
      })
  }, [])

  const kickedOff = useRef(false)
  useEffect(() => {
    if (kickedOff.current || conversation.status !== 'connected' || material === undefined) return
    kickedOff.current = true
    conversation.sendUserMessage(
      [
        KICKOFF,
        material.length
          ? `Course material (full text in your knowledge base): ${material.join(', ')}`
          : 'No course material was uploaded.',
        `Student's goal: ${session.goal || 'not stated yet'}`,
      ].join('\n'),
    )
  }, [conversation.status, material])

  const live = conversation.status === 'connected'

  function send() {
    const text = draft.trim()
    if (!text || !live) return
    if (conversation.isSpeaking || isDrawing(timeline.current)) interrupt()
    lastTyped.current = text
    conversation.sendUserMessage(text)
    dispatch({ type: 'said', who: 'student', text })
    setDraft('')
  }

  const drawing = timeline.current.entries.findLast((e) => e.kind === 'beat' && e.status === 'drawing')
  const status = callFailed
    ? 'تعذّر الاتصال بالمعلّم. راجع مسار الدرس.'
    : material === undefined
      ? session.files.length
        ? 'جارٍ مشاركة مادتك مع المعلّم…'
        : 'جارٍ البدء…'
      : conversation.status === 'connecting'
        ? 'جارٍ الاتصال بمعلّمك…'
        : conversation.status !== 'connected'
          ? kickedOff.current
            ? 'انتهت المكالمة'
            : 'جارٍ البدء…'
          : drawing?.kind === 'beat'
            ? `يرسم: ${drawing.instruction}`
            : conversation.isSpeaking
              ? 'المعلّم يتحدث. تكلّم لتقاطعه.'
              : 'يستمع…'

  return (
    <div className="fixed inset-0 flex">
      <TimelinePanel entries={timeline.current.entries} />

      {/* Own column, so camera framing (scrollToContent) never lands under the timeline. */}
      <div className="relative flex-1">
        <Excalidraw
          excalidrawAPI={setBoard}
          theme="dark"
          langCode="ar-SA"
          gridModeEnabled
          UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false, toggleTheme: false } }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-[300] flex flex-col items-center gap-2 px-4">
          <p aria-live="polite" className="max-w-[560px] truncate rounded-full bg-black/60 px-3 py-1 text-[12px] text-zinc-300 backdrop-blur">
            {status}
          </p>
          <form
            style={{ viewTransitionName: 'composer' }}
            className="pointer-events-auto flex w-full max-w-[560px] items-center gap-2 rounded-2xl border border-white/10 bg-[#1a1a1d]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <Orb speaking={conversation.isSpeaking} live={conversation.status === 'connected'} muted={conversation.isMuted} />
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (live) conversation.sendUserActivity()
              }}
              aria-label="اكتب لمعلّمك"
              placeholder="تحدّث أو اكتب هنا…"
              className="h-9 min-w-0 flex-1 bg-transparent px-1 text-[14px] text-white placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => conversation.setMuted(!conversation.isMuted)}
              aria-pressed={conversation.isMuted}
              className="h-9 rounded-xl px-3 text-[13px] text-zinc-300 hover:bg-white/10"
            >
              {conversation.isMuted ? 'إلغاء الكتم' : 'كتم'}
            </button>
            <button
              type="button"
              onClick={() => conversation.endSession()}
              className="h-9 rounded-xl bg-rose-500/90 px-3 text-[13px] font-medium text-white hover:bg-rose-500"
            >
              إنهاء
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Orb({ speaking, live, muted }: { speaking: boolean; live: boolean; muted: boolean }) {
  const color = !live ? 'bg-zinc-600' : muted ? 'bg-amber-400' : speaking ? 'bg-sky-400' : 'bg-emerald-400'
  return (
    <span className="relative grid size-9 shrink-0 place-items-center" aria-hidden>
      <span
        className={`absolute size-5 rounded-full ${color}`}
        style={{ animation: speaking ? 'orb-pulse 1.1s ease-in-out infinite' : undefined }}
      />
    </span>
  )
}

// The single timeline: what was said and what was drawn, in the order it happened.
function TimelinePanel({ entries }: { entries: Entry[] }) {
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [entries.length])

  return (
    <aside className="m-3 me-0 flex w-[300px] shrink-0 flex-col rounded-2xl border border-white/10 bg-[#161618]">
      <h2 className="px-4 pt-3 pb-2 text-[12px] font-medium text-zinc-400">مسار الدرس</h2>
      <ol ref={list} className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 text-[13px] leading-snug">
        {entries.map((e) => (
          <li key={e.key}>
            <EntryRow entry={e} />
          </li>
        ))}
      </ol>
    </aside>
  )
}

function EntryRow({ entry: e }: { entry: Entry }) {
  if (e.kind === 'note') return <p className="px-1 break-words text-zinc-500">{e.text}</p>
  if (e.kind === 'interrupt')
    return (
      <p className="flex items-center gap-2 px-1 text-[12px] text-rose-300">
        <span className="h-px flex-1 bg-rose-300/30" /> قاطعتَ <span className="h-px flex-1 bg-rose-300/30" />
      </p>
    )
  if (e.kind === 'say')
    return (
      <div className={`rounded-xl px-3 py-2 ${e.who === 'tutor' ? 'bg-white/5' : 'ms-6 bg-sky-500/15'}`}>
        <p className="mb-0.5 text-[11px] text-zinc-500">{e.who === 'tutor' ? 'المعلّم' : 'أنت'}</p>
        <p dir="auto" className="text-zinc-200">
          {e.text}
          {e.cut && <span className="text-rose-300"> ✂</span>}
        </p>
      </div>
    )
  const badge = { drawing: 'text-sky-300', done: 'text-emerald-300', cut: 'text-rose-300' }[e.status]
  const label = { drawing: 'يرسم', done: 'تم', cut: 'قُطع' }[e.status]
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-3 py-2">
      <p className="mb-0.5 flex justify-between text-[11px] text-zinc-500">
        <span>✏️ {e.figure}</span>
        <span className={badge}>
          {label} · {e.drawn.length} علامات
        </span>
      </p>
      <p dir="auto" className="text-zinc-300">{e.instruction}</p>
    </div>
  )
}

// Marks come straight from the voice agent's LLM, so validate them before they touch the board.
function parseMarks(raw: unknown): Element[] | string {
  try {
    const result = z.array(elementSchema).min(1).safeParse(typeof raw === 'string' ? JSON.parse(raw) : raw)
    return result.success ? result.data : z.prettifyError(result.error)
  } catch (error) {
    return `marks is not valid JSON (${error})`
  }
}
