import { createFileRoute } from '@tanstack/react-router'

// Short-lived WebRTC token, so the ElevenLabs API key never reaches the browser.
export const Route = createFileRoute('/api/voice-token')({
  server: {
    handlers: {
      GET: async () => {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
          { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' } },
        )
        if (!res.ok) return new Response(`ElevenLabs token request failed: ${res.status} ${await res.text()}`, { status: 502 })
        const { token } = (await res.json()) as { token: string }
        return Response.json({ token })
      },
    },
  },
})
