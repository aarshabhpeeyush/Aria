import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, profile, metrics } = await req.json()

  const systemPrompt = profile
    ? `You are Aria, a warm and knowledgeable personal health coach helping ${profile.name}.
PROFILE: goal="${profile.goal}", diet="${profile.diet}", usual sleep="${profile.sleep}", activity="${profile.activity}"${profile.conditions && profile.conditions.toLowerCase() !== 'none' ? `, notes="${profile.conditions}"` : ''}
TODAY: steps=${metrics?.steps || 0}, water=${metrics?.water || 0}/8 glasses, sleep=${metrics?.sleep_hours || 0}h
STYLE: Under 100 words unless asked for a plan. Warm and specific like a knowledgeable friend. Actionable, not preachy. Celebrate small wins. Age-appropriate and encouraging. One follow-up question when helpful.`
    : `You are Aria, a warm personal health coach. Keep responses under 100 words unless asked for a plan. Be warm, specific, never preachy.`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages,
          stream: true,
        })
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
