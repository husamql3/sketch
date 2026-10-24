import { useRef, useState } from 'react'
import type { Session } from './Board'

// The opening chat: course material plus an optional first question. Submitting moves everything onto the board.
export function Intake({ ready, onStart }: { ready: boolean; onStart: (s: Session) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [goal, setGoal] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  const add = (list: FileList | null) => list && setFiles((f) => [...f, ...Array.from(list)])
  const canStart = ready && (files.length > 0 || goal.trim() !== '')

  async function submit() {
    if (!canStart) return
    // Ask for the mic while we still have the click, before the board opens.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      return setError('اسمح بالوصول إلى الميكروفون لتتحدث مع معلّمك.')
    }
    onStart({ files, goal: goal.trim() })
  }

  return (
    <main
      className="board-dots grid min-h-dvh place-items-center px-6"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        add(e.dataTransfer.files)
      }}
    >
      <div className="w-full max-w-[640px]">
        <h1 className="mb-2 text-center text-[28px] font-semibold text-balance text-white">
          ما الذي تريد أن تفهمه؟
        </h1>
        <p className="mb-8 text-center text-[15px] text-zinc-400">
          أحضر مادة مقررك، وتحدّث عمّا لا تفهمه، ولنحلّه معًا على اللوح.
        </p>

        <form
          style={{ viewTransitionName: 'composer' }}
          className={`rounded-2xl border bg-[#1a1a1d]/95 shadow-2xl shadow-black/60 backdrop-blur transition-colors ${dragging ? 'border-sky-400/70' : 'border-white/10'}`}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2 px-3 pt-3">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1 ps-2.5 pe-1 text-[13px]"
                >
                  <FileIcon />
                  <span className="max-w-[220px] truncate">{f.name}</span>
                  <span className="text-zinc-500 tabular-nums">{formatSize(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`إزالة ${f.name}`}
                    onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="grid size-7 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea
            autoFocus
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            aria-label="ما الذي تريد أن تتعلمه؟"
            placeholder="ما الذي يربكك؟ مثلًا: لا أفهم منحنى السرعة والزمن"
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => picker.current?.click()}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              <ClipIcon /> إضافة ملفات
            </button>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              accept=".pdf,.txt,.md"
              onChange={(e) => {
                add(e.target.files)
                e.target.value = ''
              }}
            />
            <span className="flex items-center gap-1.5 text-[13px] text-zinc-500">
              <span className="size-1.5 rounded-full bg-emerald-400" /> معلّم صوتي
            </span>
            <button
              type="submit"
              disabled={!canStart}
              aria-label="ابدأ الجلسة"
              className="ms-auto grid size-8 place-items-center rounded-full bg-white text-black transition-opacity disabled:opacity-25"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-center text-[13px] text-rose-300">
            {error}
          </p>
        )}
        <p className="mt-4 text-center text-[13px] text-zinc-500">
          أفلِت ملفات PDF أو ملاحظاتك في أي مكان. تحدّث بصوتك، ويمكنك المقاطعة في أي وقت.
        </p>
      </div>
    </main>
  )
}

const formatSize = (bytes: number) =>
  new Intl.NumberFormat('ar', { style: 'unit', unit: bytes > 1e6 ? 'megabyte' : 'kilobyte', maximumFractionDigits: 1 }).format(
    bytes > 1e6 ? bytes / 1e6 : Math.max(1, bytes / 1e3),
  )

const icon = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ClipIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-hidden>
    <path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15.5 7" />
  </svg>
)

const FileIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} className="text-rose-300" aria-hidden>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
)

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} strokeWidth={2.25} aria-hidden>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)
