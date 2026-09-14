'use client'
import { useState, useEffect } from 'react'

export default function LogSheet({ metric, metrics, onClose, onSave }) {
  const [stepsVal, setStepsVal] = useState('')
  const [sleepVal, setSleepVal] = useState('')
  const [waterVal, setWaterVal] = useState(0)
  const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false })

  useEffect(() => {
    if (metrics) {
      setStepsVal(metrics.steps > 0 ? String(metrics.steps) : '')
      setSleepVal(metrics.sleep_hours > 0 ? String(metrics.sleep_hours) : '')
      setWaterVal(metrics.water || 0)
      setMeals({ breakfast: metrics.breakfast, lunch: metrics.lunch, dinner: metrics.dinner })
    }
  }, [metrics, metric])

  function save() {
    if (metric === 'steps') onSave('steps', parseInt(stepsVal) || 0)
    else if (metric === 'sleep') onSave('sleep_hours', parseFloat(sleepVal) || 0)
    else if (metric === 'water') onSave('water', waterVal)
    else if (metric === 'meals') {
      onSave('breakfast', meals.breakfast)
      onSave('lunch', meals.lunch)
      onSave('dinner', meals.dinner)
    }
    onClose()
  }

  const titles = { steps:'Steps today', water:'Water today', sleep:"Last night's sleep", meals:'Meals today' }
  const isOpen = !!metric

  return (
    <>
      <div onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none', position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:200, backdropFilter:'blur(2px)' }} />
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:`translateX(-50%) translateY(${isOpen?'0':'100%'})`, width:'100%', maxWidth:430, background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:`16px 20px max(28px, env(safe-area-inset-bottom, 28px))`, zIndex:201, transition:'transform .3s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ width:36, height:4, background:'var(--border)', borderRadius:2, margin:'0 auto 20px' }} />
        <div style={{ fontFamily:'Fraunces,serif', fontSize:20, fontWeight:500, marginBottom:20 }}>{titles[metric] || ''}</div>

        {metric === 'water' && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, padding:'16px 0' }}>
              <button onClick={() => setWaterVal(v => Math.max(0, v-1))}
                style={{ width:50,height:50,borderRadius:'50%',border:'2px solid var(--border)',background:'none',cursor:'pointer',fontSize:24,color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
              <div style={{ fontFamily:'Fraunces,serif', fontSize:52, fontWeight:500, minWidth:80, textAlign:'center', color:'var(--accent)' }}>{waterVal}</div>
              <button onClick={() => setWaterVal(v => Math.min(20, v+1))}
                style={{ width:50,height:50,borderRadius:'50%',border:'2px solid var(--border)',background:'none',cursor:'pointer',fontSize:24,color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
            </div>
            <div style={{ textAlign:'center', fontSize:13, color:'var(--text-3)' }}>glasses · target: 8</div>
          </>
        )}

        {metric === 'steps' && (
          <>
            <input type="number" value={stepsVal} onChange={e=>setStepsVal(e.target.value)} placeholder="0" min="0" max="99999" inputMode="numeric" autoFocus
              style={{ background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:12,padding:16,fontFamily:"'DM Mono',monospace",fontSize:28,textAlign:'center',color:'var(--text)',outline:'none',width:'100%' }} />
            <div style={{ marginTop:8, textAlign:'center', fontSize:13, color:'var(--text-3)' }}>steps · target: 7,500</div>
          </>
        )}

        {metric === 'sleep' && (
          <>
            <input type="number" value={sleepVal} onChange={e=>setSleepVal(e.target.value)} placeholder="7.5" min="0" max="24" step="0.5" inputMode="decimal" autoFocus
              style={{ background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:12,padding:16,fontFamily:"'DM Mono',monospace",fontSize:28,textAlign:'center',color:'var(--text)',outline:'none',width:'100%' }} />
            <div style={{ marginTop:8, textAlign:'center', fontSize:13, color:'var(--text-3)' }}>hours · target: 8+</div>
          </>
        )}

        {metric === 'meals' && ['Breakfast','Lunch','Dinner'].map(n => {
          const k = n.toLowerCase()
          return (
            <div key={k} onClick={() => setMeals(m => ({...m, [k]: !m[k]}))}
              style={{ display:'flex', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', gap:14 }}>
              <div style={{ width:26,height:26,borderRadius:'50%',border:`2px solid ${meals[k]?'var(--teal)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:meals[k]?'white':'transparent',background:meals[k]?'var(--teal)':'none',flexShrink:0 }}>{meals[k]?'✓':''}</div>
              <div style={{ fontSize:15, fontWeight:500 }}>{n}</div>
            </div>
          )
        })}

        <button onClick={save}
          style={{ background:'var(--accent)',color:'white',border:'none',borderRadius:12,padding:14,fontFamily:'inherit',fontSize:15,fontWeight:600,cursor:'pointer',width:'100%',marginTop:20 }}>
          Save
        </button>
      </div>
    </>
  )
}
