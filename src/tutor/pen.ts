// Progressive drawing: each mark is revealed like a pen stroke, and stops mid-stroke when the signal aborts.
import { CaptureUpdateAction, convertToExcalidrawElements, ROUNDNESS } from '@excalidraw/excalidraw'
import type { ExcalidrawElementSkeleton } from '@excalidraw/excalidraw/data/transform'
import type { ExcalidrawLinearElement } from '@excalidraw/excalidraw/element/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { Element } from './elements'

const PEN_SPEED = 900 // canvas units per second
const TYPE_SPEED = 28 // characters per second

// Excalidraw's own palette; its dark theme inverts these, so "black" shows as near-white.
const COLORS: Record<Element['color'], string> = {
  black: '#1e1e1e',
  grey: '#868e96',
  blue: '#1971c2',
  red: '#e03131',
  green: '#2f9e44',
  orange: '#f08c00',
  violet: '#6741d9',
}
const FONT_SIZES = { s: 18, m: 24, l: 36 }

type Vec = { x: number; y: number }

export function drawElement(api: ExcalidrawImperativeAPI, el: Element, origin: Vec, signal: AbortSignal): Promise<void> {
  const id = crypto.randomUUID()
  const strokeColor = COLORS[el.color]
  // Rebuilds the mark under the same id each frame. Tutor strokes stay out of the student's undo stack.
  const put = (skeleton: ExcalidrawElementSkeleton) => {
    const [next] = convertToExcalidrawElements([{ ...skeleton, id, strokeColor }], { regenerateIds: false })
    const scene = api.getSceneElementsIncludingDeleted()
    const elements = scene.some((e) => e.id === id) ? scene.map((e) => (e.id === id ? next : e)) : [...scene, next]
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER })
  }

  if (el.type === 'text') {
    const at = { x: origin.x + el.at.x, y: origin.y + el.at.y }
    let shown = 0
    return animate(el.text.length / TYPE_SPEED, signal, (t) => {
      const n = Math.ceil(t * el.text.length)
      if (n === shown) return
      shown = n
      put({ type: 'text', ...at, text: el.text.slice(0, n), fontSize: FONT_SIZES[el.size] })
    })
  }

  if (el.type === 'arrow') {
    const d = { x: el.to.x - el.from.x, y: el.to.y - el.from.y }
    const at = { x: origin.x + el.from.x, y: origin.y + el.from.y }
    return animate(Math.hypot(d.x, d.y) / PEN_SPEED, signal, (t) => put(linear('arrow', at, [{ x: 0, y: 0 }, { x: d.x * t, y: d.y * t }])))
  }

  const pts = outline(el)
  if (pts.length < 2) return Promise.resolve()
  const start = pts[0]
  const at = { x: origin.x + start.x, y: origin.y + start.y }
  const rel = pts.map((p) => ({ x: p.x - start.x, y: p.y - start.y }))
  const lengths = rel.map((p, i) => (i === 0 ? 0 : Math.hypot(p.x - rel[i - 1].x, p.y - rel[i - 1].y)))
  const cumulative = lengths.map((_, i) => lengths.slice(0, i + 1).reduce((a, b) => a + b, 0))
  const total = cumulative.at(-1)!
  const style = {
    strokeStyle: el.type === 'line' && el.dashed ? ('dashed' as const) : ('solid' as const),
    roundness: el.type === 'ellipse' || (el.type === 'line' && el.smooth) ? { type: ROUNDNESS.PROPORTIONAL_RADIUS } : null,
  }
  return animate(total / PEN_SPEED, signal, (t) => {
    const d = t * total
    const i = cumulative.findIndex((c) => c >= d)
    const k = i <= 0 ? 1 : i
    const f = lengths[k] ? (d - cumulative[k - 1]) / lengths[k] : 1
    const tip = { x: rel[k - 1].x + (rel[k].x - rel[k - 1].x) * f, y: rel[k - 1].y + (rel[k].y - rel[k - 1].y) * f }
    put({ ...linear('line', at, [...rel.slice(0, k), tip]), ...style })
  })
}

// Excalidraw sizes linear elements from width/height, falling back to 100 when 0, so derive them from the points.
function linear(type: 'line' | 'arrow', at: Vec, pts: Vec[]): ExcalidrawElementSkeleton {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return {
    type,
    ...at,
    width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
    height: Math.max(1, Math.max(...ys) - Math.min(...ys)),
    // LocalPoint is a branded tuple and its constructor isn't exported.
    points: pts.map((p) => [p.x, p.y]) as unknown as ExcalidrawLinearElement['points'],
  }
}

function outline(el: Exclude<Element, { type: 'text' | 'arrow' }>): Vec[] {
  if (el.type === 'line') return el.points
  if (el.type === 'box') {
    const { x, y } = el.at
    return [el.at, { x: x + el.w, y }, { x: x + el.w, y: y + el.h }, { x, y: y + el.h }, el.at]
  }
  return Array.from({ length: 41 }, (_, i) => ({
    x: el.center.x + el.rx * Math.cos((i / 40) * Math.PI * 2),
    y: el.center.y + el.ry * Math.sin((i / 40) * Math.PI * 2),
  }))
}

function animate(seconds: number, signal: AbortSignal, frame: (t: number) => void) {
  return new Promise<void>((resolve) => {
    const begin = performance.now()
    const duration = Math.max(seconds, 0.05) * 1000
    const tick = (now: number) => {
      if (signal.aborted) return resolve()
      const t = Math.min(1, (now - begin) / duration)
      frame(t)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}
