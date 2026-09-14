'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STEPS = [
  { q:"Before I start helping you, I want to get to know you. What's your first name?", type:'text', ph:'Type your name…', field:'name', ok: v => v.trim().length >= 2 },
  { q:"What's your #1 health priority right now? Focus on just one — you can always work on others later.", type:'opts', field:'goal',
    opts:['More energy throughout the day','Lose weight and feel lighter','Build a consistent exercise habit','Eat healthier without stress','Sleep better','Reduce screen time / build better habits','Something else…'], other:true },
  { q:"What do you usually eat?", type:'opts', field:'diet', opts:['Vegetarian (no meat or eggs)','Eggs + vegetarian','Non-vegetarian (chicken, fish, etc.)','Vegan (no animal products)'] },
  { q:"How much sleep do you get on most nights?", type:'opts', field:'sleep', opts:['Less than 6 hours','6–7 hours','7–8 hours','8–9 hours','More than 9 hours'] },
  { q:"How physically active are you right now? Be honest — no judgment!", type:'opts', field:'activity', opts:['Very inactive (mostly sitting)','A bit active (some walking)','Moderately active (exercise 1–2×/week)','Quite active (exercise 3–4×/week)','Very active (daily exercise)'] },
  { q:"Any health conditions or allergies I should know about? (Type 'none' if nothing applies.)", type:'text', ph:'e.g. asthma, peanut allergy… or none', field:'conditions', ok: v => v.trim().length > 0 },
]

function makeHabits(goal) {
  const g = goal.toLowerCase()
  let h1, h2
  if (g.includes('energy')) { h1 = { name:'10-min walk after lunch', badge:'start' }; h2 = { name:'Drink water before phone', badge:'start' } }
  else if (g.includes('weight')) { h1 = { name:'20-min walk each day', badge:'start' }; h2 = { name:'Eat slowly — no rushing', badge:'start' } }
  else if (g.includes('exercise')) { h1 = { name:'15 min movement today', badge:'start' }; h2 = { name:'Stretch before bed', badge:'start' } }
  else if (g.includes('eat') || g.includes('food') || g.includes('healthier')) { h1 = { name:'Add one vegetable to a meal', badge:'start' }; h2 = { name:'No packaged snacks after 8 PM', badge:'reduce' } }
  else if (g.includes('sleep')) { h1 = { name:'Phone off 30 min before bed', badge:'start' }; h2 = { name:'Same bedtime every night', badge:'start' } }
  else { h1 = { name:'5-min mindful break midday', badge:'start' }; h2 = { name:'Limit screen time after 9 PM', badge:'reduce' } }
  return [h1, h2, { name:'Check in with Aria', badge:'continue' }]
}

const tpl = (s, name) => s.replace('{{name}}', name || 'you')

export default function Onboarding() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [val, setVal] = useState('')
  const [otherVal, setOtherVal] = useState('')
  const [showOther, setShowOther] = useState(false)
  const [saving, setSaving] = useState(false)

  const current = STEPS[step]
  const progress = step / (STEPS.length - 1)

  function pickOpt(o) {
    if (o === 'Something else…') {
      setVal(o); setShowOther(true)
    } else {
      setVal(o); setShowOther(false); setOtherVal('')
    }
  }

  const isValid = () => {
    if (current.type === 'opts') {
      if (val === 'Something else…') return otherVal.trim().length > 0
      return !!val
    }
    return current.ok ? current.ok(val) : val.trim().length > 0
  }

  function next() {
    if (!isValid()) return
    const finalVal = val === 'Something else…' ? otherVal.trim() : val
    const newAnswers = { ...answers, [current.field]: finalVal }
    setAnswers(newAnswers)
    setVal(''); setOtherVal(''); setShowOther(false)
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else complete(newAnswers)
  }

  function back() {
    if (step === 0) return
    setVal(''); setOtherVal(''); setShowOther(false)
    setStep(s => s - 1)
  }

  async function complete(data) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('profiles').upsert({ user_id: user.id, ...data, start_date: today })
    const habits = makeHabits(data.goal)
    await supabase.from('habits').delete().eq('user_id', user.id)
    await supabase.from('habits').insert(habits.map(h => ({ ...h, user_id: user.id, streak: 0, done_today: false })))
    router.push('/dashboard')
  }

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column', minHeight:'100dvh', padding:'28px 20px 32px', overflowY:'auto' }}>

      {/* Back */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        {step > 0 && (
          <button onClick={back} style={{ background:'none', border:'none', color:'var(--text-2)', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', padding:'4px 0' }}>
            ← Back
          </button>
        )}
      </div>

      <div style={{ fontFamily:'Fraunces,serif', fontSize:28, fontWeight:600, color:'var(--accent)', marginBottom:4 }}>Aria</div>
      <div style={{ fontSize:14, color:'var(--text-2)', marginBottom:20 }}>Your personal health companion</div>

      {/* Progress */}
      <div style={{ display:'flex', gap:5, marginBottom:28 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= step ? 'var(--accent)' : 'var(--border)', transition:'background .3s' }} />
        ))}
      </div>

      {/* Question */}
      <div style={{ background:'var(--surface)', borderRadius:'16px 16px 16px 4px', padding:'14px 16px', boxShadow:'0 2px 8px rgba(25,27,40,.08)', marginBottom:18 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--accent)', marginBottom:5 }}>Aria</div>
        <p style={{ fontSize:15, lineHeight:1.6, margin:0 }}>{tpl(current.q, answers.name)}</p>
      </div>

      {/* Input */}
      {current.type === 'opts' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {current.opts.map(o => (
            <button key={o} onClick={() => pickOpt(o)}
              style={{ background:'var(--surface)', border:`1.5px solid ${val === o ? 'var(--accent)' : 'var(--border)'}`, borderRadius:12, padding:'13px 16px', fontSize:14, fontFamily:'inherit', color: val === o ? 'var(--accent)' : 'var(--text)', cursor:'pointer', textAlign:'left', fontWeight: val === o ? 500 : 400, background: val === o ? 'var(--accent-bg)' : 'var(--surface)' }}>
              {o}
            </button>
          ))}
          {showOther && (
            <textarea value={otherVal} onChange={e => setOtherVal(e.target.value)}
              placeholder="Describe your goal…" rows={2} autoFocus
              style={{ background:'var(--surface)', border:'1.5px solid var(--accent)', borderRadius:12, padding:'14px 16px', fontFamily:'inherit', fontSize:14, color:'var(--text)', resize:'none', outline:'none', width:'100%', marginTop:4, lineHeight:1.5 }} />
          )}
        </div>
      ) : (
        <textarea value={val} onChange={e => setVal(e.target.value)}
          placeholder={current.ph} rows={2}
          style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 16px', fontFamily:'inherit', fontSize:14, color:'var(--text)', resize:'none', outline:'none', width:'100%', minHeight:80, lineHeight:1.5 }} />
      )}

      <button onClick={next} disabled={!isValid() || saving}
        style={{ background:'var(--accent)', color:'white', border:'none', borderRadius:12, padding:14, fontFamily:'inherit', fontSize:15, fontWeight:600, cursor:'pointer', marginTop:20, width:'100%', opacity: isValid() && !saving ? 1 : 0.35 }}>
        {saving ? 'Setting up your profile…' : step === STEPS.length - 1 ? 'Start my health journey →' : 'Continue →'}
      </button>
    </div>
  )
}
