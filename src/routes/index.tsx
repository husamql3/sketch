import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import type { Session } from '../tutor/Board'
import { Landing } from '../tutor/Landing'

export const Route = createFileRoute('/')({ component: Home })

// Intake and board are two phases of one page, so the composer can morph into the call dock.
function Home() {
  const [session, setSession] = useState<Session>()
  // The board is client-only; load it in the background while the student fills in the intake.
  const [Board, setBoard] = useState<ComponentType<{ session: Session }>>()
  useEffect(() => {
    import('../tutor/Board').then((m) => setBoard(() => m.default))
  }, [])

  const start = (s: Session) => {
    if (!document.startViewTransition) return setSession(s)
    document.startViewTransition(() => flushSync(() => setSession(s)))
  }

  if (session && Board) return <Board session={session} />
  return <Landing ready={!!Board} onStart={start} />
}
