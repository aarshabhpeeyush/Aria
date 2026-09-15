import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

const client = new Anthropic()

async function getUser(req) {
  // Support both cookie auth (web) and Bearer token (mobile)
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    return { user, supabase }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function POST(req) {
  const { user, supabase } = await getUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, profile, metrics } = await req.json()

  const [{ data: weekMetrics }, { data: habits }] = await Promise.all([
    supabase.from('daily_metrics').select('date,steps,water,sleep_hours,breakfast,lunch,dinner')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    supabase.from('habits').select('name,streak,badge').eq('user_id', user.id),
  ])

  const weekSummary = (weekMetrics || []).slice(1).map(d => {
    const meals = [d.breakfast, d.lunch, d.dinner].filter(Boolean).length
    return `${d.date}: ${d.steps} steps, ${d.water}/8 water, ${d.sleep_hours}h sleep, ${meals}/3 meals`
  }).join('\n')

  const habitSummary = (habits || []).map(h => `"${h.name}" — ${h.streak} day streak`).join(', ')

  const age_location = profile?.age_location || ''
  const conditions = profile?.conditions || 'none'
  const isMinor = /\b(1[0-7]|[1-9])\b/.test(age_location)

  const guardrails = `
SAFETY RULES — NEVER BREAK THESE:
- ALLERGENS: The user's conditions/allergies are: "${conditions}". Check every food suggestion against this. Never suggest anything that contains or may contain a listed allergen. If they ask about a food with their allergen, flag it clearly.
- NO MEDICINES: Never recommend, suggest, or comment on medicines, supplements, or dosages. If asked, say only: "That's a question for your doctor or pharmacist."
- NO DIAGNOSIS: Never diagnose. If a symptom recurs across multiple messages, flag it and recommend the right type of specialist.
- MEDICATIONS: If user is on any medication (noted in conditions), add: "Since you're on [medication], mention your diet to your doctor — some foods affect how medications work." Nothing more.
- EATING DISORDERS: If user mentions restricting food as punishment, guilt after eating, or purging — stop diet advice immediately, slow down, listen first.
- PREGNANCY: If user mentions pregnancy, stop all diet/exercise advice and recommend their OB-GYN.
- INJURY: If user mentions an injury during conversation, stop movement recommendations immediately.
- CRISIS: If user expresses hopelessness or mentions self-harm, stop health coaching, provide relevant crisis line, ask "Are you safe right now?"
${isMinor ? '- MINOR: This user appears to be under 18. No calorie restriction, no weight loss framing, no body composition goals. Focus only on energy, sleep, movement, and general wellness.' : ''}
`

  const systemPrompt = profile
    ? `You are Aria, a warm personal health coach with memory of ${profile.name}'s journey.

PROFILE: goal="${profile.goal}", diet="${profile.diet}", usual sleep="${profile.sleep}", activity="${profile.activity}", location/age="${age_location}"${conditions.toLowerCase() !== 'none' ? `, health notes="${conditions}"` : ''}

TODAY: steps=${metrics?.steps || 0}, water=${metrics?.water || 0}/8 glasses, sleep=${metrics?.sleep_hours || 0}h, meals=${[metrics?.breakfast, metrics?.lunch, metrics?.dinner].filter(Boolean).length}/3

PAST WEEK:
${weekSummary || 'No data yet — this is their first week.'}

HABITS: ${habitSummary || 'No habits set yet.'}

${guardrails}

STYLE: Under 100 words unless asked for a plan. Warm and specific. Actionable, not preachy. Celebrate small wins. One follow-up question when helpful. Reference past conversations naturally.`
    : `You are Aria, a warm personal health coach. Keep responses under 100 words unless asked for a plan. Be warm, specific, never preachy. Never recommend medicines or diagnose.`

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
