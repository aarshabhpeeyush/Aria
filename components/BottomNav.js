'use client'
import { useRouter } from 'next/navigation'

const tabs = [
  { id:'dashboard', label:'Home', path:'/dashboard', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id:'chat', label:'Coach', path:'/chat', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { id:'profile', label:'Profile', path:'/profile', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
]

export default function BottomNav({ active }) {
  const router = useRouter()
  return (
    <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', paddingBottom:'env(safe-area-inset-bottom, 0px)', zIndex:50 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => router.push(t.path)}
          style={{ flex:1, background:'none', border:'none', cursor:'pointer', padding:'10px 4px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: active === t.id ? 'var(--accent)' : 'var(--text-3)', fontFamily:'inherit', fontSize:11, fontWeight:500, letterSpacing:'.02em', transition:'color .15s' }}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  )
}
