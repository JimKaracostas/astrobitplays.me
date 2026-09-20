export function App() {
  const socials = [
    {
      name: 'YouTube',
      handle: '@astrobitplayss',
      url: 'https://youtube.com/@astrobitplayss',
      icon: (
        <svg className="w-5 h-5 fill-current text-[#ff0000]" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      hoverBorder: 'hover:border-red-500/60'
    },
    {
      name: 'Twitch',
      handle: '@astrobitplays',
      url: 'https://twitch.tv/astrobitplays',
      icon: (
        <svg className="w-5 h-5 fill-current text-[#9146FF]" viewBox="0 0 24 24">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      ),
      hoverBorder: 'hover:border-purple-500/60'
    },
    {
      name: 'X',
      handle: '@astrobitplays',
      url: 'https://x.com/astrobitplays',
      icon: (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      hoverBorder: 'hover:border-slate-400/60'
    },
    {
      name: 'Instagram',
      handle: '@astrobitplays',
      url: 'https://instagram.com/astrobitplays',
      icon: (
        <svg className="w-5 h-5 fill-current text-[#E1306C]" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      hoverBorder: 'hover:border-pink-500/60'
    },
    {
      name: 'TikTok',
      handle: '@astrobitplays',
      url: 'https://tiktok.com/@astrobitplays',
      icon: (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      hoverBorder: 'hover:border-cyan-400/60'
    }
  ]

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-200 flex flex-col justify-between items-center px-4 py-8 selection:bg-cyan-500/30 selection:text-white overflow-hidden">
      {/* Repeating Branded Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 bg-repeat bg-center"
        style={{
          backgroundImage: "url('/bg-pattern.jpg')",
          backgroundSize: '480px auto'
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#07090e]/60 via-transparent to-[#07090e]/90" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-xl flex items-center justify-between pb-6 border-b border-[#1c2230]">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="AstroBitPlays Logo" 
            className="w-9 h-9 rounded-lg object-cover border border-cyan-500/30 shadow-sm"
          />
          <span className="font-black text-lg text-white uppercase tracking-tight">
            ASTROBIT<span className="text-cyan-400">PLAYS</span>
          </span>
        </div>
      </header>

      {/* Center Hero */}
      <main className="relative z-10 w-full max-w-md my-auto py-10 flex flex-col items-center text-center">
        {/* Main Logo Emblem */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-25 blur-lg group-hover:opacity-40 transition duration-300" />
          <img 
            src="/logo.jpg" 
            alt="AstroBitPlays" 
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-cyan-500/30 shadow-2xl transition duration-300 group-hover:scale-105"
          />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-xs font-mono uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Status</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3 uppercase">
          Work in progress
        </h1>

        <p className="text-sm text-slate-400 mb-8 max-w-sm leading-relaxed">
          The official website is currently being built. Check out our channels below:
        </p>

        {/* Social Links with Official Icons Only */}
        <div className="w-full space-y-2.5 text-left">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between px-4 py-3 rounded-xl bg-[#0e121a]/85 backdrop-blur border border-[#1d2433] ${s.hoverBorder} transition-all duration-200 group hover:bg-[#131924]`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition">
                  {s.name}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono group-hover:text-cyan-300 transition">
                {s.handle}
              </span>
            </a>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-xl pt-6 border-t border-[#1c2230] text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} AstroBitPlays</span>
        <span className="font-mono text-slate-400">Coming soon</span>
      </footer>
    </div>
  )
}

export default App
