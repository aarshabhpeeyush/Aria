import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, profile, metrics } = await req.json()

  // Fetch past week of metrics and habit streaks for memory context
  const [{ data: weekMetrics }, { data: habits }] = await Promise.all([
    supabase.from('daily_metrics').select('date,steps,water,sleep_hours,breakfast,lunch,dinner')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    supabase.from('habits').select('name,streak,badge').eq('user_id', user.id),
  ])

  const weekSummary = (weekMetrics || []).slice(1).map(d => {
    const meals = [d.breakfast, d.lunch, d.dinner].filter(Boolean).length
    return `${d.date}: ${d.steps} steps, ${d.water}/8 water, ${d.sleep_hours}h sleep, ${meals}/3 meals`
  }).join('\n')

  const habitSummary = (habits || []).map(h =>
    `"${h.name}" — ${h.streak} day streak`
  ).join(', ')

  const systemPrompt = profile
    ? `You are Aria, a warm and knowledgeable personal health coach with memory of ${profile.name}'s journey.

PROFILE: goal="${profile.goal}", diet="${profile.diet}", usual sleep="${profile.sleep}", activity level="${profile.activity}"${profile.conditions && profile.conditions.toLowerCase() !== 'none' ? `, health notes="${profile.conditions}"` : ''}

TODAY (${new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}): steps=${metrics?.steps || 0}, water=${metrics?.water || 0}/8 glasses, sleep=${metrics?.sleep_hours || 0}h, meals=${[metrics?.breakfast, metrics?.lunch, metrics?.dinner].filter(Boolean).length}/3

PAST WEEK:
${weekSummary || 'No data yet — this is their first week.'}

HABITS: ${habitSummary || 'No habits set yet.'}

MEMORY: You have the full conversation history above. Reference past conversations naturally — if they mentioned something before, you remember it. Notice patterns across the week (e.g. consistent low sleep, skipped water days) and bring them up when relevant.

STYLE: Under 100 words unless asked for a plan. Warm and specific like a knowledgeable friend. Actionable, not preachy. Celebrate streaks and progress. One follow-up question when helpful.`
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
