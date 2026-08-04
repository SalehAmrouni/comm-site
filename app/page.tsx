'use client'

import React, { useState } from 'react'
import { createClient } from './supabaseClient'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Creating account...')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Success! Check your email for the confirmation link.')
  }

  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Signing in...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Logged in successfully!')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-950 text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl">
        <h1 className="text-3xl font-extrabold text-center mb-2">Game Hub</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Log in or create an account to post mods and comments</p>

        <form className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-1 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleLogIn}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg transition"
            >
              Log In
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 font-semibold border border-gray-700 rounded-lg transition"
            >
              Sign Up
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded text-center text-sm text-blue-400">
            {message}
          </div>
        )}
      </div>
    </main>
  )
}