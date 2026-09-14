export default function Offline() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100dvh', padding:'0 24px', textAlign:'center', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🌿</div>
      <h2 style={{ fontFamily:'Fraunces, serif', fontSize:24, fontWeight:500, marginBottom:8 }}>You're offline</h2>
      <p style={{ color:'#888', fontSize:15, lineHeight:1.6 }}>Connect to the internet to sync your health data and chat with Aria.</p>
    </div>
  )
}
