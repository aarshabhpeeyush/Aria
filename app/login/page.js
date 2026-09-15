'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setDone(true)
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Wrong email or password. Try again.'); setLoading(false); return }
      const { data: prof } = await supabase.from('profiles').select('onboarded').eq('user_id', data.user.id).single()
      router.push(prof?.onboarded ? '/dashboard' : '/onboarding')
    }
    setLoading(false)
  }

  if (done) return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100dvh', padding:'0 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
      <h2 style={{ fontFamily:'Fraunces,serif', fontSize:24, fontWeight:500, marginBottom:8 }}>Check your email</h2>
      <p style={{ color:'var(--text-2)', fontSize:15, lineHeight:1.6 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to log in.</p>
      <button onClick={()=>setDone(false)} style={{ marginTop:24, color:'var(--accent)', background:'none', border:'none', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Back to login</button>
    </div>
  )

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column', minHeight:'100dvh', padding:'0 24px' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:'Fraunces,serif', fontSize:36, fontWeight:600, color:'var(--accent)', marginBottom:4 }}>Aria</div>
        <div style={{ color:'var(--text-2)', fontSize:15, marginBottom:40 }}>Your personal health companion</div>

        <div style={{ display:'flex', gap:0, background:'var(--surface-2)', borderRadius:12, padding:4, marginBottom:28 }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={()=>{setMode(m);setError('')}}
              style={{ flex:1, padding:'10px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:500, transition:'all .15s',
                background: mode===m ? 'var(--surface)' : 'transparent',
                color: mode===m ? 'var(--text)' : 'var(--text-3)',
                boxShadow: mode===m ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              }}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required
            style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 16px', fontSize:15, fontFamily:'inherit', color:'var(--text)', outline:'none' }} />
          <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}
            style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 16px', fontSize:15, fontFamily:'inherit', color:'var(--text)', outline:'none' }} />
          {error && <div style={{ color:'var(--rose)', fontSize:13, padding:'8px 12px', background:'var(--rose-bg)', borderRadius:8 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background:'var(--accent)', color:'white', border:'none', borderRadius:12, padding:14, fontSize:15, fontWeight:600, fontFamily:'inherit', cursor:'pointer', opacity: loading ? 0.6 : 1, marginTop:4 }}>
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{ textAlign:'center', color:'var(--text-3)', fontSize:13, marginTop:20 }}>
            Don't have an account?{' '}
            <button onClick={()=>setMode('signup')} style={{ color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500 }}>Sign up free</button>
          </p>
        )}
      </div>
      <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-3)', fontSize:12 }}>
        Your health data is private and never shared.
      </div>
    </div>
  )
}
