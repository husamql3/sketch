import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { Session } from './Board'
import { Intake } from './Intake'

// The front door: one promise, one composer, then three quick steps. Starting a session works exactly as before.
export function Landing({ ready, onStart }: { ready: boolean; onStart: (s: Session) => void }) {
  return (
    <main className="board-dots relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-52 mx-auto h-[460px] w-[min(900px,90vw)] rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6">
        <header className="flex h-20 shrink-0 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg outline-offset-4 transition-opacity hover:opacity-80">
            <BrandMark />
            <span className="text-[15px] font-semibold text-white">سكتش</span>
          </Link>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">نموذج أولي · معلّم صوتي</span>
            <span className="sm:hidden">معلّم صوتي</span>
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-14">
          <div className="mx-auto w-full max-w-[620px] rise-in lg:mx-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-zinc-400">
              <span className="size-1.5 rounded-full bg-sky-400" />
              معلّم يشرح بالصوت… ويرسم باليد
            </p>

            <h1 className="text-[32px] leading-[1.3] font-semibold text-balance text-white sm:text-[42px] lg:text-[52px]">
              ما الذي تريد أن تفهمه؟
            </h1>

            <p className="mt-4 max-w-[540px] text-[15px] leading-8 text-zinc-400 sm:text-[16px]">
              أحضر مادة مقررك، وتحدّث عمّا لا تفهمه. يشرح لك معلّمك بصوت طبيعي، ويرسم الفكرة أمامك على اللوح.
              قاطعه متى شئت.
            </p>

            <div className="mt-8 max-w-[620px]">
              <Intake ready={ready} onStart={onStart} />
            </div>

            <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-zinc-500">
              <li className="flex items-center gap-1.5">
                <MicIcon /> صوت طبيعي
              </li>
              <li className="flex items-center gap-1.5">
                <PenIcon /> شرح مرسوم
              </li>
              <li className="flex items-center gap-1.5">
                <BoltIcon /> مقاطعة فورية
              </li>
              <li className="flex items-center gap-1.5">
                <FileIcon /> ملفاتك معك
              </li>
            </ul>
          </div>

          <BoardPreview />
        </section>

        <section className="border-t border-white/5 py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-white">كيف تسير الجلسة</h2>
            <p className="text-[13px] text-zinc-500">ثلاث خطوات… ثم يبدأ الدرس.</p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-3">
            <Step
              n="٠١"
              icon={<FileIcon />}
              title="أحضر مادتك"
              text="أضِف ملفات PDF أو ملاحظاتك، أو ابدأ بسؤال واحد فقط."
            />
            <Step
              n="٠٢"
              icon={<MicIcon />}
              title="تحدّث بحرية"
              text="اشرح ما يربكك بصوتك. المعلّم يستمع ويجيب فورًا."
            />
            <Step
              n="٠٣"
              icon={<PenIcon />}
              title="شاهد الفكرة تُرسم"
              text="يتقدّم الشرح على اللوح خطوة بخطوة، وتستطيع مقاطعته في أي وقت."
            />
          </ol>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/5 py-6 text-[12px] text-zinc-600 sm:flex-row">
          <p>سكتش — لوح ومعلّم صوتي.</p>
          <p>الأفضل على حاسوب بميكروفون.</p>
        </footer>
      </div>
    </main>
  )
}

// A static peek at the board, so the promise is visible before the first call.
function BoardPreview() {
  return (
    <aside aria-hidden className="relative hidden lg:block">
      <div className="absolute -inset-8 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#161618]/90 shadow-2xl shadow-black/50">
        <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          <span className="text-[12px] text-zinc-400">لوح الدرس</span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            يرسم الآن
          </span>
        </header>

        <div className="relative h-[330px] p-4">
          <svg viewBox="0 0 520 300" className="h-full w-full" fill="none">
            <path
              d="M58 246H466M58 246V44M58 196h6M58 146h6M58 96h6M158 246v6M258 246v6M358 246v6"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M92 232c84-4 106-66 184-100s122-56 170-74"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1.5"
              strokeDasharray="4 7"
            />
            <path
              pathLength="1"
              className="sketch-draw"
              d="M84 226c84 6 118-56 198-92s122-56 170-74"
              stroke="#7dd3fc"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="84" cy="226" r="4" fill="#7dd3fc" />
            <circle cx="452" cy="60" r="4" fill="#7dd3fc" />
            <text x="466" y="272" textAnchor="middle" fill="#71717a" fontSize="11">
              الزمن
            </text>
            <text x="30" y="48" fill="#71717a" fontSize="11">
              السرعة
            </text>
          </svg>

          <span className="absolute top-5 start-5 rounded-lg border border-white/10 bg-[#101011]/85 px-2.5 py-1 text-[11px] text-zinc-400">
            منحنى السرعة والزمن
          </span>
          <span
            dir="ltr"
            className="absolute bottom-5 end-5 rounded-lg border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[12px] text-sky-300"
          >
            v = Δx / Δt
          </span>
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
          <span className="size-1.5 shrink-0 rounded-full bg-sky-400" />
          <p className="truncate text-[12px] text-zinc-400">يرسم: منحنى السرعة والزمن</p>
          <span className="ms-auto shrink-0 text-[11px] text-zinc-600">٣ علامات</span>
        </div>
      </div>
    </aside>
  )
}

function Step({ n, icon, title, text }: { n: string; icon: ReactNode; title: string; text: string }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-[#161618]/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-300">
          {icon}
        </span>
        <span className="text-[11px] text-zinc-600 tabular-nums">{n}</span>
      </div>
      <h3 className="text-[14px] font-medium text-white">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-6 text-zinc-500">{text}</p>
    </li>
  )
}

const BrandMark = () => (
  <span className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-300">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d="M4 16.5c3.5-.5 3.5-9 7.5-9s3.5 8 8 7" />
      <circle cx="20.4" cy="14.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  </span>
)

const icon = { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const MicIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
)

const PenIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-hidden>
    <path d="m15.5 4.5 4 4L8 20H4v-4z" />
    <path d="m13 7 4 4" />
  </svg>
)

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-hidden>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
  </svg>
)

const FileIcon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-hidden>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
)
