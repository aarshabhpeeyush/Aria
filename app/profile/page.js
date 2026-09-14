'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function Profile() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    setProfile(data)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const row = (label, value) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border)', gap:12 }}>
      <div style={{ fontSize:14, color:'var(--text-2)', flexShrink:0 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:500, textAlign:'right' }}>{value}</div>
    </div>
  )

  const start = profile ? new Date(profile.start_date) : null
  const weeks = start ? Math.max(1, Math.ceil((Date.now() - start.getTime()) / (7*24*60*60*1000))) : 1

  return (
    <div className="app-shell" style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, overflowY:'auto', paddingBottom:72 }}>

        {/* Top */}
        <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'24px 20px 20px', textAlign:'center' }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'var(--accent-bg)',border:'3px solid var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 12px' }}>🧑</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:22, fontWeight:500 }}>{profile?.name || '—'}</div>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:3 }}>
            {start ? `With Aria since ${start.toLocaleDateString('en-US',{month:'long',year:'numeric'})} · Week ${weeks}` : 'Setting up your profile…'}
          </div>
        </div>

        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>

          {/* About you */}
          <div style={{ background:'var(--surface)', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 2px rgba(25,27,40,.06)' }}>
            <div style={{ padding:'10px 16px', background:'var(--surface-2)', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-2)', borderBottom:'1px solid var(--border)' }}>About you</div>
            {row('Diet', profile?.diet?.split(' ')[0] || '—')}
            {row('Usual sleep', profile?.sleep || '—')}
            {row('Activity', profile?.activity?.split('(')[0]?.trim() || '—')}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', gap:12 }}>
              <div style={{ fontSize:14, color:'var(--text-2)' }}>Health notes</div>
              <div style={{ fontSize:14, fontWeight:500, textAlign:'right', color: profile?.conditions?.toLowerCase() === 'none' ? 'var(--text-3)' : 'var(--text)' }}>{profile?.conditions || '—'}</div>
            </div>
          </div>

          {/* Goals */}
          <div style={{ background:'var(--surface)', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 2px rgba(25,27,40,.06)' }}>
            <div style={{ padding:'10px 16px', background:'var(--surface-2)', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-2)', borderBottom:'1px solid var(--border)' }}>Goals &amp; Targets</div>
            {row('#1 Goal', profile?.goal || '—')}
            {row('Daily steps', '7,500')}
            {row('Sleep target', '8+ hours')}
            {row('Water target', '8 glasses / day')}
          </div>

          {/* Connected apps */}
          <div style={{ background:'var(--surface)', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 2px rgba(25,27,40,.06)' }}>
            <div style={{ padding:'10px 16px', background:'var(--surface-2)', fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-2)', borderBottom:'1px solid var(--border)' }}>Connected apps</div>
            {[
              { icon:'🍎', name:'Apple Health', badge:'Needs native app', bg:'#f2f2f7', color:'var(--text-3)' },
              { icon:'🤖', name:'Google Fit', badge:'Needs native app', bg:'#e8f5e9', color:'var(--text-3)' },
              { icon:'🏃', name:'Fitbit', badge:'Coming soon', bg:'#e3f0ff', color:'var(--text-3)' },
              { icon:'✏️', name:'Manual logging', badge:'Active', bg:'var(--teal-bg)', color:'var(--teal)' },
            ].map(app => (
              <div key={app.name} style={{ display:'flex', alignItems:'center', padding:'12px 16px', gap:14, borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:36,height:36,borderRadius:10,background:app.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>{app.icon}</div>
                <div style={{ flex:1, fontSize:14, fontWeight:500 }}>{app.name}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background: app.color==='var(--teal)' ? 'var(--teal-bg)' : 'var(--surface-2)', color: app.color }}>{app.badge}</span>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/onboarding')}
            style={{ background:'var(--accent-bg)', color:'var(--accent)', border:'1.5px solid rgba(193,113,28,.3)', borderRadius:12, padding:14, fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', width:'100%' }}>
            Update my profile
          </button>

          <button onClick={signOut}
            style={{ background:'none', color:'var(--text-3)', border:'1.5px solid var(--border)', borderRadius:12, padding:14, fontFamily:'inherit', fontSize:14, fontWeight:500, cursor:'pointer', width:'100%' }}>
            Sign out
          </button>

        </div>
      </div>
      <BottomNav active="profile" />
    </div>
  )
}
