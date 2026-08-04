import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'COMMISSIONERS - Official Community Hub',
  description: 'Download Commissioners, browse mods, and join the discussion forum.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white font-mono antialiased min-h-screen flex flex-col selection:bg-white selection:text-black">
        {/* Retro Header Bar */}
        <header className="border-b-4 border-white bg-black p-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Logo / Brand */}
            <Link href="/" className="text-2xl font-black tracking-widest uppercase hover:underline">
              [ COMMISSIONERS ]
            </Link>

            {/* Navigation Tabs (From your diagram) */}
            <nav className="flex flex-wrap gap-2 text-sm uppercase font-bold">
              <Link 
                href="/" 
                className="px-4 py-2 bg-black border-2 border-white hover:bg-white hover:text-black transition-none active:translate-x-0.5 active:translate-y-0.5"
              >
                Home
              </Link>
              <Link 
                href="/mods" 
                className="px-4 py-2 bg-black border-2 border-white hover:bg-white hover:text-black transition-none active:translate-x-0.5 active:translate-y-0.5"
              >
                Mods
              </Link>
              <Link 
                href="/forum" 
                className="px-4 py-2 bg-black border-2 border-white hover:bg-white hover:text-black transition-none active:translate-x-0.5 active:translate-y-0.5"
              >
                Forum
              </Link>
              <Link 
                href="/login" 
                className="px-4 py-2 bg-white text-black border-2 border-white hover:bg-neutral-300 transition-none active:translate-x-0.5 active:translate-y-0.5"
              >
                Account / Login
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </div>

        {/* Retro Footer */}
        <footer className="border-t-4 border-white bg-black p-4 text-center text-xs text-neutral-400 uppercase tracking-widest mt-auto">
          COMMISSIONERS COMMUNITY NETWORK // EST. 2000s WEB ERA // ALL RIGHTS RESERVED
        </footer>
      </body>
    </html>
  )
}