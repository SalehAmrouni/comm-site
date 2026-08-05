'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('Processing request...')

    if (isSignUp) {
      const cleanDisplayName = displayName.trim() || email.split('@')[0]
      const finalAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : '/nopfp.png'

      // --- CHARACTER LIMIT VALIDATION ---
      if (cleanDisplayName.length > 20) {
        setMessage('ERROR: Display name cannot exceed 20 characters.')
        setLoading(false)
        return
      }

      if (cleanDisplayName.length < 3) {
        setMessage('ERROR: Display name must be at least 3 characters long.')
        setLoading(false)
        return
      }

      // 1. Sign up user in auth.users
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: cleanDisplayName,
            avatar_url: finalAvatar,
          },
        },
      })

      if (error) {
        setMessage(`ERROR: ${error.message}`)
        setLoading(false)
        return
      }

      // 2. Direct database fix: Force insert into public.profiles table
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email,
          display_name: cleanDisplayName,
          avatar_url: finalAvatar,
          role: 'user',
          status: 'active',
        })
      }

      setLoading(false)
      setMessage('SUCCESS! Account created. Check your email for verification link or log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      setLoading(false)

      if (error) {
        setMessage(`ERROR: ${error.message}`)
      } else {
        setMessage('SUCCESSFULLY LOGGED IN! Redirecting...')
        window.location.href = '/'
      }
    }
  }

  return (
    <main className="max-w-md mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      {/* Tab Switcher */}
      <div className="flex border-b-2 border-white mb-6 font-bold uppercase text-sm">
        <button
          type="button"
          onClick={() => { setIsSignUp(false); setMessage(''); }}
          className={`flex-1 py-2 text-center border-r-2 border-white ${!isSignUp ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => { setIsSignUp(true); setMessage(''); }}
          className={`flex-1 py-2 text-center ${isSignUp ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          Create Account
        </button>
      </div>

      <h1 className="text-xl font-black uppercase mb-4 text-center">
        {isSignUp ? '=== NEW USER REGISTRATION ===' : '=== USER AUTHENTICATION ==='}
      </h1>

      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs uppercase font-bold">[ Display Name ]</label>
                <span className={`text-[10px] font-mono ${displayName.length >= 20 ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                  {displayName.length}/20 CHARS
                </span>
              </div>
              <input
                type="text"
                placeholder="xX_Commissioner_Xx"
                value={displayName}
                maxLength={20}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
                required={isSignUp}
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Avatar Image URL (Optional) ]</label>
              <input
                type="url"
                placeholder="https://... or leave blank for default"
                value={avatarUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvatarUrl(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
              />
              <p className="text-[10px] text-neutral-400 mt-1">* Leaving blank defaults to /nopfp.png.</p>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Email Address ]</label>
          <input
            type="email"
            placeholder="user@domain.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Password ]</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
          {!isSignUp && (
            <div className="text-right mt-1">
              <Link href="/forgot-password" className="text-[10px] uppercase text-neutral-400 hover:underline font-bold">
                Forgot Password?
              </Link>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-black uppercase tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50 transition-none active:translate-x-0.5 active:translate-y-0.5"
        >
          {loading ? 'PROCESSING...' : isSignUp ? 'REGISTER ACCOUNT' : 'LOG IN'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 border-2 text-xs font-bold text-center uppercase ${
          message.startsWith('ERROR') ? 'border-red-500 bg-red-950/50 text-red-400' : 'border-white bg-neutral-900 text-white'
        }`}>
          {message}
        </div>
      )}
    </main>
  )
}