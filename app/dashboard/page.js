'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import LogSheet from '@/components/LogSheet'

const todayStr = () => new Date().toISOString().split('T')[0]

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState([])
  const [metrics, setMetrics] = useState({ steps:0, water:0, sleep_hours:0, breakfast:false, lunch:false, dinner:false })
  const [insight, setInsight] = useState(null)
  const [logOpen, setLogOpen] = useState(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const [{ data: prof }, { data: hab }, { data: met }, { data: logs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('daily_metrics').select('*').eq('user_id', user.id).eq('date', todayStr()).single(),
      supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('completed_date', todayStr()),
    ])

    if (!prof) { router.push('/onboarding'); return }
    setProfile(prof)
    const completedToday = new Set((logs || []).map(l => l.habit_id))
    setHabits((hab || []).map(h => ({ ...h, done_today: completedToday.has(h.id) })))
    setMetrics(met || { steps:0, water:0, sleep_hours:0, breakfast:false, lunch:false, dinner:false })

    // Load insight
    const res = await fetch('/api/insight', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ profile: prof, metrics: met }) })
    const { text } = await res.json()
    setInsight(text)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function toggleHabit(habit) {
    const today = todayStr()
    if (habit.done_today) {
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_date', today)
      setHabits(h => h.map(x => x.id === habit.id ? { ...x, done_today: false, streak: Math.max(0, x.streak - 1) } : x))
    } else {
      await supabase.from('habit_logs').insert({ habit_id: habit.id, user_id: user.id, completed_date: today })
      await supabase.from('habits').update({ streak: habit.streak + 1 }).eq('id', habit.id)
      setHabits(h => h.map(x => x.id === habit.id ? { ...x, done_today: true, streak: x.streak + 1 } : x))
    }
  }

  async function saveMetric(field, value) {
    const today = todayStr()
    const update = { ...metrics, [field]: value, user_id: user.id, date: today }
    setMetrics(update)
    const { data: existing } = await supabase.from('daily_metrics').select('id').eq('user_id', user.id).eq('date', today).single()
    if (existing) await supabase.from('daily_metrics').update(update).eq('id', existing.id)
    else await supabase.from('daily_metrics').insert(update)
  }

  const scoreItems = [
    metrics.steps >= 7500, metrics.water >= 8, metrics.sleep_hours >= 8,
    [metrics.breakfast, metrics.lunch, metrics.dinner].filter(Boolean).length >= 3,
    ...habits.map(h => h.done_today),
  ]
  const done = scoreItems.filter(Boolean).length
  const total = scoreItems.length
  const pct = total > 0 ? done / total : 0
  const offset = (188.5 * (1 - pct)).toFixed(1)

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const meals = [metrics.breakfast, metrics.lunch, metrics.dinner].filter(Boolean).length
  const isDay1 = profile?.start_date === todayStr() && metrics.steps === 0 && metrics.water === 0

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, overflowY:'auto', paddingBottom:72 }}>

        {/* Header */}
        <div style={{ padding:'20px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:26, fontWeight:500, lineHeight:1.2 }}>{greeting}{profile ? `,\n${profile.name}` : ''}</div>
            <div style={{ fontSize:12, color:'var(--text-2)', marginTop:3 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'})}</div>
          </div>
          <button onClick={()=>router.push('/profile')} style={{ width:42,height:42,borderRadius:'50%',background:'var(--accent-bg)',border:'2px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,cursor:'pointer' }}>🧑</button>
        </div>

        {/* Day 1 welcome */}
        {isDay1 && (
          <div style={{ margin:'16px 20px 0', background:'var(--accent-bg)', border:'1px solid rgba(193,113,28,.25)', borderRadius:18, padding:20 }}>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:18, fontWeight:500, marginBottom:6 }}>Welcome to your first day ✦</div>
            <div style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6 }}>Your health profile is set up. Tap any metric below to log today's data, tick off habits as you complete them, and chat with Aria any time.</div>
          </div>
        )}

        {/* Score ring */}
        <div style={{ margin:'14px 20px', background:'var(--surface)', borderRadius:18, padding:18, boxShadow:'0 2px 8px rgba(25,27,40,.08)', display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ position:'relative', width:74, height:74, flexShrink:0 }}>
            <svg width="74" height="74" viewBox="0 0 74 74" fill="none" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="37" cy="37" r="30" stroke="var(--border)" strokeWidth="6"/>
              <circle cx="37" cy="37" r="30" stroke="var(--accent)" strokeWidth="6"
                strokeDasharray="188.5" strokeDashoffset={offset} strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:600, color:'var(--accent)', lineHeight:1 }}>{done}</span>
              <span style={{ fontSize:10, color:'var(--text-3)', marginTop:1 }}>of {total}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:3 }}>Today's health score</div>
            <div style={{ fontFamily:'Fraunces,serif', fontSize:16, fontWeight:500 }}>
              {done === 0 ? 'Log your first check-in' : pct === 1 ? 'Perfect day! Keep it up' : pct >= 0.7 ? 'Strong day — almost there' : pct >= 0.4 ? 'Making good progress' : 'Just getting started'}
            </div>
            <div style={{ fontSize:12, color:'var(--teal)', marginTop:4 }}>
              {done === 0 ? 'Tap metrics to get started' : pct === 1 ? 'All goals met ✓' : `${total - done} goal${total-done>1?'s':''} left today`}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'0 20px' }}>
          {[
            { key:'steps', icon:'🚶', label:'Steps', val: metrics.steps > 0 ? metrics.steps.toLocaleString() : '–', good: metrics.steps >= 7500 },
            { key:'water', icon:'💧', label:'Water', val: `${metrics.water}/8`, good: metrics.water >= 8 },
            { key:'sleep', icon:'🌙', label:'Sleep', val: metrics.sleep_hours > 0 ? `${metrics.sleep_hours}h` : '–', good: metrics.sleep_hours >= 8 },
            { key:'meals', icon:'🥗', label:'Meals', val: `${meals}/3`, good: meals >= 3 },
          ].map(m => (
            <div key={m.key} onClick={() => setLogOpen(m.key)}
              style={{ background:'var(--surface)', borderRadius:14, padding:'12px 6px', textAlign:'center', cursor:'pointer', boxShadow:'0 1px 2px rgba(25,27,40,.06)', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ fontSize:18, display:'block', marginBottom:4 }}>{m.icon}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, display:'block', color: m.good ? 'var(--teal)' : metrics[m.key] ? 'var(--accent)' : 'var(--text)' }}>{m.val}</span>
              <span style={{ fontSize:9, letterSpacing:'.04em', textTransform:'uppercase', fontWeight:600, color:'var(--text-3)', display:'block', marginTop:2 }}>{m.label}</span>
              <span style={{ fontSize:8, color:'var(--text-3)', display:'block', marginTop:1 }}>tap to log</span>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 20px 10px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--text-2)' }}>Aria says</div>
          <button onClick={()=>router.push('/chat')} style={{ fontSize:13, color:'var(--accent)', fontWeight:500, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Chat →</button>
        </div>
        <div style={{ margin:'0 20px', background:'var(--accent-bg)', border:'1px solid rgba(193,113,28,.22)', borderRadius:16, padding:16, display:'flex', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'Fraunces,serif', fontSize:16, fontWeight:600, flexShrink:0 }}>✦</div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--accent)', marginBottom:4 }}>Aria · Your Coach</div>
            <div style={{ fontSize:14, lineHeight:1.55 }}>{insight || <span style={{ color:'var(--text-3)', fontStyle:'italic' }}>Aria is thinking about your day…</span>}</div>
          </div>
        </div>

        {/* Habits */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 20px 10px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--text-2)' }}>Today's habits</div>
        </div>
        <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:9 }}>
          {habits.map(h => (
            <div key={h.id} style={{ background:'var(--surface)', borderRadius:14, padding:'13px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 2px rgba(25,27,40,.06)' }}>
              <button onClick={() => toggleHabit(h)}
                style={{ width:26, height:26, borderRadius:'50%', border:`2px solid ${h.done_today ? 'var(--teal)' : 'var(--border)'}`, cursor:'pointer', background: h.done_today ? 'var(--teal)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: h.done_today ? 'white' : 'transparent', fontSize:12 }}>
                {h.done_today ? '✓' : ''}
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{h.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{h.streak > 0 ? <><b style={{color:'var(--accent)'}}>{h.streak} day{h.streak>1?'s':''}</b> streak</> : 'Starting today'}</div>
              </div>
              <div style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background: h.badge==='start'?'var(--teal-bg)':h.badge==='reduce'?'var(--rose-bg)':'var(--accent-bg)', color: h.badge==='start'?'var(--teal)':h.badge==='reduce'?'var(--rose)':'var(--accent)' }}>
                {h.badge.charAt(0).toUpperCase()+h.badge.slice(1)}
              </div>
            </div>
          ))}
        </div>

      </div>

      <LogSheet metric={logOpen} metrics={metrics} onClose={() => setLogOpen(null)} onSave={saveMetric} />
      <BottomNav active="dashboard" />
    </div>
  )
}
