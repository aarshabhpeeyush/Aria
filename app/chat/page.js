'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

const todayStr = () => new Date().toISOString().split('T')[0]

function suggestions(profile) {
  const h = new Date().getHours()
  const g = (profile?.goal || '').toLowerCase()
  const byTime = h < 12 ? ['Plan my morning','Healthy breakfast idea?'] : h < 17 ? ['Healthy lunch idea?','Afternoon energy boost'] : ['Help me wind down','What should I eat for dinner?']
  const byGoal = g.includes('energy') ? ['Why am I always tired?','Quick energy fix'] : g.includes('weight') ? ['What should I avoid eating?'] : g.includes('sleep') ? ['Help me sleep better'] : g.includes('exercise') ? ['Short workout for today'] : ['Motivate me today']
  return [...byTime.slice(0,1), ...byGoal.slice(0,2)]
}

export default function Chat() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const abortRef = useRef(null)
  const bottomRef = useRef(null)
  const taRef = useRef(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const [{ data: prof }, { data: met }, { data: hist }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('daily_metrics').select('*').eq('user_id', user.id).eq('date', todayStr()).single(),
      supabase.from('chat_history').select('*').eq('user_id', user.id).order('created_at').limit(40),
    ])
    setProfile(prof)
    setMetrics(met)
    if (hist && hist.length > 0) {
      setMessages(hist.map(r => ({ role: r.role, content: r.content })))
    } else {
      setMessages([{ role:'assistant', content:`Hi${prof ? ', ' + prof.name : ''}! I'm Aria, your personal health coach. How can I help you today?` }])
    }
  }, [supabase, router])

  useEffect(() => { load() }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || sending) return
    setInput('')
    if (taRef.current) { taRef.current.style.height = 'auto' }
    const userMsg = { role:'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setSending(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    let full = ''
    setMessages(prev => [...prev, { role:'assistant', content:'' }])

    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: history, profile, metrics }),
      })
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { text } = JSON.parse(data)
            if (text) { full += text; setMessages(prev => [...prev.slice(0,-1), { role:'assistant', content: full }]) }
          } catch {}
        }
      }
      // Save to DB
      if (user) {
        await supabase.from('chat_history').insert([
          { user_id: user.id, role:'user', content: msg },
          { user_id: user.id, role:'assistant', content: full },
        ])
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev.slice(0,-1), { role:'assistant', content:"Something went wrong. Try again." }])
      }
    } finally {
      setSending(false)
      abortRef.current = null
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column', height:'100dvh' }}>
      {/* Header */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontFamily:'Fraunces,serif',fontSize:17,fontWeight:600 }}>✦</div>
        <div>
          <div style={{ fontSize:15, fontWeight:600 }}>Aria</div>
          <div style={{ fontSize:12, color: sending ? 'var(--accent)' : 'var(--teal)', marginTop:1 }}>{sending ? 'typing…' : 'Your health coach'}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:8, maxWidth:'88%', alignSelf: m.role==='user'?'flex-end':'flex-start', flexDirection: m.role==='user'?'row-reverse':'row' }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background: m.role==='user'?'var(--accent-bg)':'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize: m.role==='user'?16:14,color: m.role==='user'?'var(--accent)':'white',flexShrink:0,alignSelf:'flex-end',fontFamily:'Fraunces,serif',fontWeight:600 }}>
              {m.role==='user'?'🧑':'✦'}
            </div>
            <div style={{ padding:'10px 14px', borderRadius:18, fontSize:14, lineHeight:1.55, background: m.role==='user'?'var(--accent)':'var(--surface)', color: m.role==='user'?'white':'var(--text)', borderBottomRightRadius: m.role==='user'?4:18, borderBottomLeftRadius: m.role==='user'?18:4, boxShadow: m.role==='assistant'?'0 1px 2px rgba(25,27,40,.06)':'' }}>
              {m.content || <span style={{opacity:.4}}>…</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ display:'flex', gap:8, padding:'8px 16px', overflowX:'auto', scrollbarWidth:'none', flexShrink:0 }}>
        {suggestions(profile).map(s => (
          <button key={s} onClick={() => send(s)} style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'7px 14px',fontSize:13,fontFamily:'inherit',color:'var(--text-2)',cursor:'pointer',whiteSpace:'nowrap',fontWeight:500 }}>{s}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'10px 14px', paddingBottom:'max(12px, env(safe-area-inset-bottom, 12px))', background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-end', flexShrink:0, marginBottom: 56 }}>
        <textarea ref={taRef} value={input} onChange={e=>{setInput(e.target.value);grow(e.target)}} onKeyDown={onKey}
          placeholder="Message Aria…" rows={1}
          style={{ flex:1,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:22,padding:'10px 16px',fontFamily:'inherit',fontSize:14,color:'var(--text)',resize:'none',outline:'none',lineHeight:1.45,maxHeight:100,overflowY:'auto' }} />
        {sending
          ? <button onClick={()=>abortRef.current?.abort()} style={{ width:40,height:40,borderRadius:'50%',border:'none',background:'var(--rose-bg)',color:'var(--rose)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
          : <button onClick={()=>send()} disabled={!input.trim()} style={{ width:40,height:40,borderRadius:'50%',border:'none',background:'var(--accent)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,opacity:input.trim()?1:.4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        }
      </div>
      <BottomNav active="chat" />
    </div>
  )
}
