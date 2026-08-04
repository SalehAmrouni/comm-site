'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from './supabaseClient'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    getUser()
  }, [supabase])

  const avatarSrc = user?.user_metadata?.avatar_url || '/nopfp.png'

  return (
    <div className="space-y-8">
      {/* Hero Banner Box */}
      <section className="border-4 border-white bg-black p-6 md:p-8 shadow-[8px_8px_0px_0px_#ffffff] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-block px-2 py-1 bg-white text-black text-xs font-black uppercase">
            COMMISSIONERS OFFICIAL HUB
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase">
            COMMISSIONERS
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Welcome to the official network. Download custom community mods, post in the retro discussion forums, and share your creations.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a 
              href="https://randomunitydev.itch.io/commissioners" 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-white text-black border-2 border-white font-black uppercase hover:bg-neutral-300"
            >
              Play on itch.io ↗
            </a>
            <Link 
              href="/mods" 
              className="px-6 py-3 bg-black text-white border-2 border-white font-black uppercase hover:bg-white hover:text-black"
            >
              Browse Mods
            </Link>
          </div>
        </div>

        {/* User Card / Profile Box */}
        <div className="w-full md:w-64 border-2 border-white bg-neutral-950 p-4 text-center space-y-3">
          <h3 className="text-xs uppercase font-bold border-b-2 border-white pb-2">:: USER PROFILE ::</h3>
          {user ? (
            <div className="space-y-2">
              <img 
                src={avatarSrc} 
                alt="Avatar" 
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                className="w-16 h-16 mx-auto border-2 border-white bg-black object-cover"
              />
              <p className="text-sm font-bold uppercase">{user.user_metadata?.display_name || user.email.split('@')[0]}</p>
              <p className="text-[10px] text-emerald-400 font-bold">[ ONLINE ]</p>
              <Link 
                href="/profile"
                className="inline-block px-3 py-1 bg-white text-black text-xs font-bold uppercase border border-white hover:bg-neutral-300"
              >
                Settings
              </Link>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-xs text-neutral-400">YOU ARE CURRENTLY VISITING AS GUEST.</p>
              <Link 
                href="/login" 
                className="inline-block w-full py-2 bg-white text-black font-bold uppercase text-xs"
              >
                Log In / Register
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 2000s Portal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* News Box */}
        <div className="border-4 border-white bg-black p-6 space-y-4">
          <h2 className="text-lg font-black uppercase border-b-2 border-white pb-2 flex justify-between">
            <span>[ SYSTEM NEWS ]</span>
            <span>2026</span>
          </h2>
          <div className="space-y-4 text-xs">
            <article className="border-b border-neutral-800 pb-3">
              <span className="text-neutral-500 font-bold">[AUG 03]</span>
              <h3 className="text-sm font-bold uppercase mt-1">COMMISSIONERS HUB LAUNCHED</h3>
              <p className="text-neutral-400 mt-1">The main community portal is online. Login functionality, mods section, user profiles, and forums are active.</p>
            </article>
          </div>
        </div>

        {/* Community Activity */}
        <div className="border-4 border-white bg-black p-6 space-y-4">
          <h2 className="text-lg font-black uppercase border-b-2 border-white pb-2">
            [ QUICK DIRECTORY ]
          </h2>
          <ul className="space-y-2 text-sm font-bold uppercase">
            <li>
              <Link href="/mods" className="block p-3 border-2 border-white hover:bg-white hover:text-black">
                → MOD ARCHIVE & UPLOADS
              </Link>
            </li>
            <li>
              <Link href="/forum" className="block p-3 border-2 border-white hover:bg-white hover:text-black">
                → DISCUSSION BOARDS
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}