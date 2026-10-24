// PROTOTYPE: one timeline for speech and drawing.
// Pure module (no DOM, no Excalidraw, no ElevenLabs) so it can be lifted into the real app as-is.
// Rule it encodes: an interruption cuts the beat being drawn, and a cut beat can never progress again.
import { FIGURE, type Element } from './elements'

export type Speaker = 'tutor' | 'student'
export type BeatStatus = 'drawing' | 'done' | 'cut'

export type Entry =
  | { kind: 'say'; key: string; who: Speaker; text: string; cut?: boolean }
  | { kind: 'beat'; key: string; figure: string; instruction: string; status: BeatStatus; drawn: Element[] }
  | { kind: 'interrupt'; key: string }
  | { kind: 'note'; key: string; text: string }

export type Figure = { name: string; x: number; y: number }

export type Timeline = { entries: Entry[]; figures: Figure[] }

export type Action =
  | { type: 'said'; who: Speaker; text: string }
  | { type: 'corrected'; original: string; corrected: string }
  | { type: 'noted'; text: string }
  | { type: 'beatStarted'; id: string; figure: string; instruction: string }
  | { type: 'elementDrawn'; id: string; element: Element }
  | { type: 'beatEnded'; id: string }
  | { type: 'interrupted' }

export const emptyTimeline: Timeline = { entries: [], figures: [] }

const FIGURE_GAP = 240

export function reduce(tl: Timeline, a: Action): Timeline {
  const key = String(tl.entries.length)
  switch (a.type) {
    case 'said':
      return { ...tl, entries: [...tl.entries, { kind: 'say', key, who: a.who, text: a.text }] }
    case 'noted':
      return { ...tl, entries: [...tl.entries, { kind: 'note', key, text: a.text }] }
    case 'corrected':
      // ElevenLabs reports what the student actually heard before cutting in.
      return {
        ...tl,
        entries: tl.entries.map((e) =>
          e.kind === 'say' && e.who === 'tutor' && e.text === a.original ? { ...e, text: a.corrected, cut: true } : e,
        ),
      }
    case 'beatStarted': {
      // A new figure name gets fresh space to the right; a known name keeps drawing where it was.
      const last = tl.figures.at(-1)
      const figures = tl.figures.some((f) => f.name === a.figure)
        ? tl.figures
        : [...tl.figures, { name: a.figure, x: last ? last.x + FIGURE.w + FIGURE_GAP : 0, y: 0 }]
      const beat: Entry = { kind: 'beat', key: a.id, figure: a.figure, instruction: a.instruction, status: 'drawing', drawn: [] }
      return { figures, entries: [...tl.entries, beat] }
    }
    case 'elementDrawn':
      return updateBeat(tl, a.id, (b) => ({ ...b, drawn: [...b.drawn, a.element] }))
    case 'beatEnded':
      return updateBeat(tl, a.id, (b) => ({ ...b, status: 'done' }))
    case 'interrupted': {
      if (tl.entries.at(-1)?.kind === 'interrupt') return tl
      const entries = tl.entries.map((e) => (e.kind === 'beat' && e.status === 'drawing' ? { ...e, status: 'cut' as const } : e))
      return { ...tl, entries: [...entries, { kind: 'interrupt', key }] }
    }
  }
}

type Beat = Extract<Entry, { kind: 'beat' }>

// Only a beat that is still drawing can change; late events for a cut beat are dropped.
function updateBeat(tl: Timeline, id: string, fn: (b: Beat) => Beat): Timeline {
  return {
    ...tl,
    entries: tl.entries.map((e) => (e.kind === 'beat' && e.key === id && e.status === 'drawing' ? fn(e) : e)),
  }
}

export const isDrawing = (tl: Timeline) => tl.entries.some((e) => e.kind === 'beat' && e.status === 'drawing')
