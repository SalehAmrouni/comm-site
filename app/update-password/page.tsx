'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../supabaseClient'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // 1. Listen for recovery auth event from the email link
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasSession(true)
        }
      }
    )

    // 2. Check if a valid session is already active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ password })

      setLoading(false)

      if (error) {
        setMessage(`ERROR: ${error.message.toUpperCase()}`)
      } else {
        setMessage('SUCCESS! PASSWORD UPDATED. REDIRECTING TO LOGIN...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err: any) {
      setLoading(false)
      setMessage(`ERROR: ${err.message || 'FAILED TO UPDATE PASSWORD'}`)
    }
  }

  return (
    <main className="max-w-md mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      <h1 className="text-xl font-black uppercase mb-4 text-center">
        [ SET NEW PASSWORD ]
      </h1>

      {!hasSession ? (
        <div className="p-4 border-2 border-yellow-500 bg-neutral-900 text-xs font-bold text-yellow-400 text-center uppercase">
          WAITING FOR AUTH SESSION...
          <br />
          <span className="text-[10px] text-neutral-400 font-normal normal-case block mt-2">
            Please make sure you arrived here by clicking the reset link sent to your email.
          </span>
        </div>
      ) : (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-bold mb-1">[ NEW PASSWORD ]</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-black uppercase tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
          >
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}

      {message && (
        <div className="mt-4 p-3 border-2 border-white bg-neutral-900 text-xs font-bold text-center uppercase">
          {message}
        </div>
      )}
    </main>
  )
}