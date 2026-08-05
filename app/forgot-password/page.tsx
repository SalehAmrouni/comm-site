'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../supabaseClient'

function inspectError(err: any): string {
  if (!err) return 'Unknown Error'
  if (typeof err === 'string') return err
  const details: Record<string, any> = {}
  Object.getOwnPropertyNames(err).forEach((key) => {
    details[key] = err[key]
  })
  for (const key in err) {
    details[key] = err[key]
  }
  return JSON.stringify(details, null, 2)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [rawError, setRawError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('SENDING RESET LINK...')
    setRawError('')

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://comm-site.vercel.app/update-password',
      })

      setLoading(false)

      if (error) {
        // Deep log into browser dev console
        console.dir(error)

        const formatted = inspectError(error)
        setRawError(formatted)
        setMessage(`ERROR: ${error.message || 'Request Failed'}`)
        
        // Popup alert so error can't be missed or hidden
        alert(`Supabase Error:\n${formatted}`)
      } else {
        console.log('Reset response data:', data)
        setMessage('SUCCESS! CHECK YOUR EMAIL FOR THE PASSWORD RESET LINK.')
      }
    } catch (err: any) {
      setLoading(false)
      console.dir(err)
      const formatted = inspectError(err)
      setRawError(formatted)
      setMessage(`CRITICAL ERROR: ${err?.message || 'Unexpected Failure'}`)
      alert(`Caught Error:\n${formatted}`)
    }
  }

  return (
    <main className="max-w-md mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      <Link href="/login" className="text-xs font-bold uppercase hover:underline mb-4 inline-block">
        ← Back to Login
      </Link>

      <h1 className="text-xl font-black uppercase mb-4 text-center">
        [ FORGOT PASSWORD ]
      </h1>

      <form onSubmit={handleResetRequest} className="space-y-4">
        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Your Registered Email ]</label>
          <input
            type="email"
            placeholder="user@domain.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-black uppercase tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
        >
          {loading ? 'SENDING...' : 'SEND RESET LINK'}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 border-2 border-white bg-neutral-900 text-xs font-bold text-center uppercase">
          {message}
        </div>
      )}

      {/* Raw Unmasked Error Box */}
      {rawError && (
        <div className="mt-4 p-3 border-2 border-red-500 bg-black text-left">
          <p className="text-[10px] font-bold text-red-500 uppercase mb-1">[ RAW DEBUG OUTPUT ]</p>
          <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap overflow-x-auto">
            {rawError}
          </pre>
        </div>
      )}
    </main>
  )
}