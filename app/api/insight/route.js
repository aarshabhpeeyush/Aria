import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile, metrics } = await req.json()
  if (!profile) return Response.json({ text: 'Complete your profile to get personalized insights.' })

  // Fetch past week + habit streaks for trend-aware insight
  const [{ data: weekMetrics }, { data: habits }] = await Promise.all([
    supabase.from('daily_metrics').select('date,steps,water,sleep_hours')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    supabase.from('habits').select('name,streak').eq('user_id', user.id),
  ])

  const pastDays = (weekMetrics || []).slice(1)
  const avgSleep = pastDays.length ? (pastDays.reduce((s, d) => s + (d.sleep_hours || 0), 0) / pastDays.length).toFixed(1) : null
  const avgSteps = pastDays.length ? Math.round(pastDays.reduce((s, d) => s + (d.steps || 0), 0) / pastDays.length) : null
  const topStreak = (habits || []).reduce((best, h) => h.streak > best ? h.streak : best, 0)

  const now = new Date()
  const tod = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  const prompt = `You are Aria, a personal health coach. Write a SHORT personalized health insight for ${profile.name} for this ${tod} (${dateStr}).
Profile: goal="${profile.goal}", diet="${profile.diet}", usual sleep="${profile.sleep}", activity="${profile.activity}"${profile.conditions && profile.conditions.toLowerCase() !== 'none' ? `, notes="${profile.conditions}"` : ''}
Today: steps=${metrics?.steps || 0}, water=${metrics?.water || 0}/8 glasses, sleep=${metrics?.sleep_hours || 0}h
${avgSleep ? `7-day averages: ${avgSteps} steps/day, ${avgSleep}h sleep/night` : ''}
${topStreak > 1 ? `Best habit streak: ${topStreak} days` : ''}
Write 2 sentences. Reference trends when meaningful (e.g. "your sleep has been low this week"). Warm, direct, specific. No greeting. Under 55 words.`

  const { content } = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ text: content[0].text })
}
