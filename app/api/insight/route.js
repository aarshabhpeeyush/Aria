import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

const client = new Anthropic()

export async function POST(req) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile, metrics } = await req.json()
  if (!profile) return Response.json({ text: 'Complete your profile to get personalized insights.' })

  const now = new Date()
  const tod = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  const prompt = `You are Aria, a personal health coach. Write a SHORT personalized health insight for ${profile.name} for this ${tod} (${dateStr}).
Profile: goal="${profile.goal}", diet="${profile.diet}", usual sleep="${profile.sleep}", activity="${profile.activity}"${profile.conditions && profile.conditions.toLowerCase() !== 'none' ? `, notes="${profile.conditions}"` : ''}
Today logged: steps=${metrics?.steps || 0}, water=${metrics?.water || 0}/8 glasses, sleep=${metrics?.sleep_hours || 0}h
Write 2 sentences. Specific to their profile and today's data. Warm, direct. No greeting opener. Under 55 words.`

  const { content } = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({ text: content[0].text })
}
