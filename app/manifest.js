export default function manifest() {
  return {
    name: 'Aria — Health Coach',
    short_name: 'Aria',
    description: 'Your personal AI health companion',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#191B28',
    theme_color: '#C1711C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
