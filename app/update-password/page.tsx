'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabaseClient'

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('UPDATING PASSWORD...')

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setLoading(false)

    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage('SUCCESS! PASSWORD UPDATED. REDIRECTING TO LOGIN...')
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <main className="max-w-md mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      <h1 className="text-xl font-black uppercase mb-4 text-center">
        [ SET NEW PASSWORD ]
      </h1>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ New Password ]</label>
          <input
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
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
          {loading ? 'SAVING...' : 'UPDATE PASSWORD'}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 border-2 border-white bg-neutral-900 text-xs font-bold text-center uppercase">
          {message}
        </div>
      )}
    </main>
  )
}