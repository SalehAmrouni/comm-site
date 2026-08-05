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
      // 1. Fallback to email prefix truncated safely to 20 characters max
      const rawFallback = email.split('@')[0] || 'User'
      const fallbackName = rawFallback.slice(0, 20)
      const cleanDisplayName = (displayName.trim() || fallbackName).slice(0, 20)
      const finalAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : '/nopfp.png'

      // 2. Display Name Validation
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

      // 3. Register User with Supabase Auth
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

      // 4. Upsert into public.profiles (Safely sync DB row without primary key collisions)
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email,
              display_name: cleanDisplayName,
              avatar_url: finalAvatar,
              role: 'user',
            },
            { onConflict: 'id' }
          )

        if (profileError) {
          console.warn('Profile sync notice:', profileError.message)
        }
      }

      setLoading(false)
      setMessage('SUCCESS! Account created. You can now log in.')
    } else {
      // LOG IN EXISTING USER
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setLoading(false)

      if (error) {
        setMessage(`ERROR: ${error.message}`)
      } else {
        setMessage('LOGGED IN SUCCESSFULLY! Redirecting...')
        window.location.href = '/'
      }
    }
  }

  return (
    <main className="max-w-md mx-auto my-12 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff]">
      <h1 className="text-xl font-black uppercase text-center mb-6 border-b-4 border-white pb-3">
        {isSignUp ? '[ REGISTER ACCOUNT ]' : '[ USER LOGIN ]'}
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
                placeholder="e.g. SpeedRunner99"
                value={displayName}
                maxLength={20}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Avatar Image URL ]</label>
              <input
                type="url"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Email Address ]</label>
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Password ]</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-black uppercase text-xs tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
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

      <div className="mt-6 pt-4 border-t-2 border-white text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage('')
          }}
          className="text-xs uppercase underline font-bold hover:text-neutral-300"
        >
          {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Register"}
        </button>
      </div>
    </main>
  )
}