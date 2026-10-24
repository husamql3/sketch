import { z } from 'zod'

// What the tutor draws, one mark at a time. Coordinates are local to a figure.
export const FIGURE = { w: 1000, h: 700 }

const color = z.enum(['black', 'grey', 'blue', 'red', 'green', 'orange', 'violet'])
const point = z.object({ x: z.number(), y: z.number() })

export const elementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), at: point, text: z.string(), size: z.enum(['s', 'm', 'l']), color }),
  z.object({ type: z.literal('arrow'), from: point, to: point, color }),
  z.object({ type: z.literal('line'), points: z.array(point), smooth: z.boolean(), dashed: z.boolean(), color }),
  z.object({ type: z.literal('box'), at: point, w: z.number(), h: z.number(), color }),
  z.object({ type: z.literal('ellipse'), center: point, rx: z.number(), ry: z.number(), color }),
])

export type Element = z.infer<typeof elementSchema>
