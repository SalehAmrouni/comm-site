'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '../supabaseClient'

interface Profile {
  display_name: string | null
  avatar_url: string | null
}

interface Reply {
  id: string
  thread_id: string
  user_id: string
  content: string
  created_at: string
  profiles: Profile | null
}

interface Thread {
  id: string
  user_id: string
  title: string
  category: string
  content: string
  created_at: string
  profiles: Profile | null
  forum_replies: { count: number }[]
}

export default function ForumPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // New Thread state
  const [showNewThread, setShowNewThread] = useState(false)
  const [category, setCategory] = useState('General Discussion')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  // Selected / Expanded Thread state
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replyStatus, setReplyStatus] = useState('')
  const [loadingReplies, setLoadingReplies] = useState(false)

  const supabase = createClient()

  // Fetch all threads with author profile data
  const fetchThreads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('forum_threads')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        ),
        forum_replies (
          count
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching threads:', error.message)
    } else if (data) {
      setThreads(data as Thread[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      await fetchThreads()
    }
    init()
  }, [supabase, fetchThreads])

  // Fetch replies when a thread is selected
  async function handleSelectThread(thread: Thread) {
    setActiveThread(thread)
    setLoadingReplies(true)
    setReplyStatus('')

    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching replies:', error.message)
    } else if (data) {
      setReplies(data as Reply[])
    }
    setLoadingReplies(false)
  }

  // Handle Thread Submission
  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setStatusMsg('POSTING THREAD...')

    const { error } = await supabase.from('forum_threads').insert([
      {
        user_id: user.id,
        category,
        title,
        content,
      },
    ])

    if (error) {
      setStatusMsg(`ERROR: ${error.message}`)
    } else {
      setStatusMsg('SUCCESS! THREAD CREATED.')
      setTitle('')
      setContent('')
      setShowNewThread(false)
      await fetchThreads()
    }
  }

  // Handle Reply Submission
  async function handlePostReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !activeThread) return

    setReplyStatus('POSTING REPLY...')

    const { error } = await supabase.from('forum_replies').insert([
      {
        thread_id: activeThread.id,
        user_id: user.id,
        content: replyContent,
      },
    ])

    if (error) {
      setReplyStatus(`ERROR: ${error.message}`)
    } else {
      setReplyStatus('REPLY POSTED!')
      setReplyContent('')
      // Refresh replies
      handleSelectThread(activeThread)
      fetchThreads()
    }
  }

  const filteredThreads = selectedCategory === 'ALL'
    ? threads
    : threads.filter((t) => t.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b-4 border-white pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">COMMISSIONERS FORUM</h1>
          <p className="text-xs text-neutral-400 uppercase mt-1">Community Discussion Boards</p>
        </div>

        {user ? (
          <button 
            type="button"
            onClick={() => { setShowNewThread(!showNewThread); setActiveThread(null); }}
            className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
          >
            {showNewThread ? 'Cancel' : '+ Create Thread'}
          </button>
        ) : (
          <span className="text-xs font-bold uppercase bg-neutral-900 border border-white p-2">
            [ Log in to start threads ]
          </span>
        )}
      </div>

      {/* Category Filter Navigation */}
      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
        {['ALL', 'General Discussion', 'Modding & Custom Content', 'Bug Reports & Feedback'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-2 border-2 border-white ${
              selectedCategory === cat ? 'bg-white text-black' : 'bg-black text-white hover:bg-neutral-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create New Thread Box */}
      {showNewThread && (
        <div className="border-4 border-white bg-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#ffffff]">
          <h2 className="text-lg font-black uppercase border-b-2 border-white pb-2">[ NEW DISCUSSION THREAD ]</h2>
          <form onSubmit={handleCreateThread} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Select Category ]</label>
              <select 
                value={category} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
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
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
                placeholder="Enter topic subject..."
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold mb-1">[ Post Message ]</label>
              <textarea 
                rows={4}
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
                placeholder="Write your discussion content..."
                required
              />
            </div>

            <button type="submit" className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300">
              Publish Thread
            </button>
          </form>
          {statusMsg && <p className="text-xs font-bold uppercase text-center mt-2 border p-2 border-white">{statusMsg}</p>}
        </div>
      )}

      {/* Active Expanded Thread View */}
      {activeThread ? (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setActiveThread(null)}
            className="text-xs font-bold uppercase border-2 border-white px-3 py-1 bg-black hover:bg-white hover:text-black"
          >
            ← Back to Thread List
          </button>

          {/* Original Thread Post */}
          <div className="border-4 border-white bg-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#ffffff]">
            <div className="flex justify-between items-center text-xs font-bold uppercase text-neutral-400 border-b-2 border-white pb-2">
              <span>[ {activeThread.category} ]</span>
              <span>{new Date(activeThread.created_at).toLocaleString()}</span>
            </div>

            <h2 className="text-2xl font-black uppercase text-white">{activeThread.title}</h2>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{activeThread.content}</p>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
              <img 
                src={activeThread.profiles?.avatar_url || '/nopfp.png'} 
                alt="Author Avatar" 
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                className="w-10 h-10 border-2 border-white bg-black object-cover" 
              />
              <div>
                <p className="text-xs font-bold uppercase text-white">@{activeThread.profiles?.display_name || 'Anonymous'}</p>
                <p className="text-[10px] text-neutral-500 uppercase">Thread Author</p>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-black uppercase border-b-2 border-white pb-1">
              [ REPLIES ({replies.length}) ]
            </h3>

            {loadingReplies ? (
              <div className="p-4 border-2 border-white text-center font-bold text-xs uppercase">LOADING REPLIES...</div>
            ) : replies.length === 0 ? (
              <div className="p-4 border-2 border-white text-center font-bold text-xs uppercase text-neutral-500">
                NO REPLIES YET. BE THE FIRST TO RESPOND!
              </div>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="border-2 border-white bg-neutral-950 p-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase border-b border-neutral-800 pb-1">
                    <div className="flex items-center gap-2">
                      <img 
                        src={reply.profiles?.avatar_url || '/nopfp.png'} 
                        alt="Reply Avatar" 
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                        className="w-5 h-5 border border-white bg-black object-cover" 
                      />
                      <span className="text-white">@{reply.profiles?.display_name || 'Anonymous'}</span>
                    </div>
                    <span>{new Date(reply.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))
            )}

            {/* Post Reply Box */}
            {user ? (
              <form onSubmit={handlePostReply} className="border-4 border-white bg-black p-4 space-y-3">
                <label className="block text-xs uppercase font-bold">[ Post A Reply ]</label>
                <textarea
                  rows={3}
                  value={replyContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
                  placeholder="Type your response here..."
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
                >
                  Submit Reply
                </button>
                {replyStatus && <p className="text-xs font-bold uppercase text-neutral-400 mt-1">{replyStatus}</p>}
              </form>
            ) : (
              <div className="p-4 border-2 border-white bg-neutral-950 text-center text-xs font-bold uppercase text-neutral-400">
                [ Log in to leave a reply ]
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Thread Listing View */
        <div>
          {loading ? (
            <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase">LOADING FORUM THREADS...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase text-neutral-400">
              NO THREADS FOUND IN THIS CATEGORY.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredThreads.map((t) => {
                const replyCount = t.forum_replies?.[0]?.count || 0
                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleSelectThread(t)}
                    className="border-4 border-white bg-black p-4 space-y-3 cursor-pointer hover:bg-neutral-950 transition-none shadow-[4px_4px_0px_0px_#ffffff]"
                  >
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-neutral-400 border-b-2 border-white pb-2">
                      <span className="bg-white text-black px-2 py-0.5">{t.category}</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>

                    <h2 className="text-xl font-black uppercase text-white hover:underline">{t.title}</h2>
                    <p className="text-xs text-neutral-400 line-clamp-2">{t.content}</p>

                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <img 
                          src={t.profiles?.avatar_url || '/nopfp.png'} 
                          alt="Avatar" 
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                          className="w-6 h-6 border border-white bg-black object-cover" 
                        />
                        <span className="text-neutral-300">BY @{t.profiles?.display_name || 'Anonymous'}</span>
                      </div>
                      <span className="text-white bg-neutral-900 px-2 py-1 border border-white">
                        {replyCount} {replyCount === 1 ? 'REPLY' : 'REPLIES'} →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}