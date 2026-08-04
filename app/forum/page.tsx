'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../supabaseClient'

export default function ForumPage() {
  const [threads, setThreads] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // New Thread state
  const [showNewThread, setShowNewThread] = useState(false)
  const [category, setCategory] = useState('General Discussion')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)

      const { data } = await supabase
        .from('forum_threads')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setThreads(data)
      setLoading(false)
    }

    loadData()
  }, [supabase])

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setStatusMsg('POSTING THREAD...')

    const displayName = user.user_metadata?.display_name || user.email.split('@')[0]
    const avatar = user.user_metadata?.avatar_url || '/nopfp.png'

    const { data, error } = await supabase.from('forum_threads').insert([
      {
        category,
        title,
        content,
        author_id: user.id,
        author_name: displayName,
        author_avatar: avatar,
      },
    ]).select()

    if (error) {
      setStatusMsg(`ERROR: ${error.message}`)
    } else {
      setStatusMsg('THREAD CREATED!')
      if (data) setThreads([data[0], ...threads])
      setTitle('')
      setContent('')
      setShowNewThread(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b-4 border-white pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">COMMISSIONERS FORUM BOARD</h1>
          <p className="text-xs text-neutral-400 uppercase mt-1">Public discussion forum</p>
        </div>

        {user ? (
          <button 
            type="button"
            onClick={() => setShowNewThread(!showNewThread)}
            className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
          >
            {showNewThread ? 'Cancel' : '+ New Discussion'}
          </button>
        ) : (
          <span className="text-xs font-bold uppercase bg-neutral-900 border border-white p-2">
            [ Log in to start threads ]
          </span>
        )}
      </div>

      {/* New Thread Form */}
      {showNewThread && (
        <div className="border-4 border-white bg-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#ffffff]">
          <h2 className="text-lg font-black uppercase border-b-2 border-white pb-2">[ CREATE THREAD ]</h2>
          <form onSubmit={handleCreateThread} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Category ]</label>
              <select 
                value={category} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none"
              >
                <option value="General Discussion">General Discussion</option>
                <option value="Modding & Custom Content">Modding & Custom Content</option>
                <option value="Bug Reports & Feedback">Bug Reports & Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Subject / Title ]</label>
              <input 
                type="text" 
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none"
                placeholder="Thread title..."
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Content ]</label>
              <textarea 
                rows={4}
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none"
                placeholder="Write your post here..."
                required
              />
            </div>

            <button type="submit" className="px-6 py-2 bg-white text-black font-bold uppercase border-2 border-white">
              Post Thread
            </button>
          </form>
          {statusMsg && <p className="text-xs font-bold uppercase text-center mt-2">{statusMsg}</p>}
        </div>
      )}

      {/* Thread Listing */}
      {loading ? (
        <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase">LOADING THREADS...</div>
      ) : threads.length === 0 ? (
        <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase text-neutral-400">
          NO DISCUSSIONS STARTED YET.
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((t) => {
            const avatarSrc = t.author_avatar || '/nopfp.png'
            return (
              <div key={t.id} className="border-4 border-white bg-black p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase text-neutral-400 border-b-2 border-white pb-2">
                  <span>[ {t.category} ]</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg font-black uppercase text-white">{t.title}</h2>
                <p className="text-xs text-neutral-300 leading-relaxed">{t.content}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800 text-xs font-bold">
                  <img 
                    src={avatarSrc} 
                    alt="Avatar" 
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                    className="w-6 h-6 border border-white bg-black object-cover" 
                  />
                  <span className="text-neutral-400">POSTED BY @{t.author_name}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}