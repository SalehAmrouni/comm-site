'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabaseClient'

export default function UploadModPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('AUTHENTICATION REQUIRED. REDIRECTING TO LOGIN...')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setUser(session.user)
      }
    }
    checkAuth()
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage('UPLOADING MOD TO DATABASE...')

    const displayName = user.user_metadata?.display_name || user.email.split('@')[0]

    const { error } = await supabase.from('mods').insert([
      {
        title,
        description,
        file_url: fileUrl,
        author_id: user.id,
        author_name: displayName,
      },
    ])

    setLoading(false)

    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage('SUCCESS! MOD PUBLISHED.')
      setTimeout(() => router.push('/mods'), 1500)
    }
  }

  return (
    <main className="max-w-2xl mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      <Link href="/mods" className="text-xs font-bold uppercase hover:underline mb-4 inline-block">
        ← Back to Mods Archive
      </Link>

      <h1 className="text-xl font-black uppercase border-b-2 border-white pb-2 mb-6">
        [ SUBMIT CUSTOM MOD ]
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Mod Title ]</label>
          <input 
            type="text" 
            placeholder="e.g. Sharp Outlines Skin Pack" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Mod Description ]</label>
          <textarea 
            rows={4}
            placeholder="Describe what your mod adds or replaces..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Download URL ]</label>
          <input 
            type="url" 
            placeholder="https://drive.google.com/... or direct download link" 
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !user}
          className="w-full py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
        >
          {loading ? 'PUBLISHING...' : 'PUBLISH MOD'}
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