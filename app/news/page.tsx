'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '../supabaseClient'

interface PollOption {
  id: string
  option_text: string
  votes_count?: number
}

interface NewsPost {
  id: string
  author_id: string
  title: string
  html_content: string
  post_type: 'UPDATE' | 'POLL' | 'NEWSLETTER'
  created_at: string
  profiles: { display_name: string; avatar_url: string } | null
  poll_options?: PollOption[]
  user_voted_option_id?: string | null
  total_votes?: number
}

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [user, setUser] = useState<any>(null)
  const [isModOrAdmin, setIsModOrAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Newsletter Subscription state
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState('')

  // Create Post Modal / Form State (Mods/Admins)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [postType, setPostType] = useState<'UPDATE' | 'POLL' | 'NEWSLETTER'>('UPDATE')
  const [title, setTitle] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2'])
  const [previewMode, setPreviewMode] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const supabase = createClient()

  // Fetch News, Polls & Votes
  const fetchNews = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user || null
    setUser(currentUser)

    // Check user role
    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (profile && (profile.role === 'admin' || profile.role === 'mod')) {
        setIsModOrAdmin(true)
      }
    }

    // Fetch News Posts
    const { data: postsData, error } = await supabase
      .from('news_posts')
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching news:', error.message)
      setLoading(false)
      return
    }

    // Fetch options and votes for poll posts
    const enrichedPosts: NewsPost[] = await Promise.all(
      (postsData || []).map(async (post) => {
        if (post.post_type === 'POLL') {
          // Fetch poll options
          const { data: options } = await supabase
            .from('poll_options')
            .select('*')
            .eq('post_id', post.id)

          // Fetch all votes for this poll
          const { data: votes } = await supabase
            .from('poll_votes')
            .select('*')
            .eq('post_id', post.id)

          const totalVotes = votes?.length || 0
          let userVotedId: string | null = null

          if (currentUser && votes) {
            const myVote = votes.find((v) => v.user_id === currentUser.id)
            if (myVote) userVotedId = myVote.option_id
          }

          const optionsWithCounts = (options || []).map((opt) => {
            const count = votes?.filter((v) => v.option_id === opt.id).length || 0
            return { ...opt, votes_count: count }
          })

          return {
            ...post,
            poll_options: optionsWithCounts,
            total_votes: totalVotes,
            user_voted_option_id: userVotedId,
          }
        }
        return post
      })
    )

    setPosts(enrichedPosts)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  // Handle Poll Vote
  async function handleVote(postId: string, optionId: string) {
    if (!user) {
      alert('You must be logged in to vote!')
      return
    }

    const { error } = await supabase.from('poll_votes').insert([
      {
        post_id: postId,
        option_id: optionId,
        user_id: user.id,
      },
    ])

    if (error) {
      alert(`Voting error: ${error.message}`)
    } else {
      fetchNews()
    }
  }

  // Handle Newsletter Signup
  async function handleNewsletterSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!newsletterEmail) return

    setNewsletterStatus('SUBSCRIBING...')
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email: newsletterEmail.trim() }])

    if (error) {
      if (error.code === '23505') {
        setNewsletterStatus('YOU ARE ALREADY SUBSCRIBED!')
      } else {
        setNewsletterStatus(`ERROR: ${error.message}`)
      }
    } else {
      setNewsletterStatus('SUCCESS! YOU ARE NOW SUBSCRIBED.')
      setNewsletterEmail('')
    }
  }

  // Poll Option Management in Form
  const addPollOption = () => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])
  const updatePollOption = (idx: number, val: string) => {
    const copy = [...pollOptions]
    copy[idx] = val
    setPollOptions(copy)
  }
  const removePollOption = (idx: number) => setPollOptions(pollOptions.filter((_, i) => i !== idx))

  // Create News/Poll Post (Mods/Admins Only)
  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !isModOrAdmin) return

    setStatusMsg('PUBLISHING POST...')

    const { data: newPost, error } = await supabase
      .from('news_posts')
      .insert([
        {
          author_id: user.id,
          title: title.trim(),
          html_content: htmlContent.trim(),
          post_type: postType,
        },
      ])
      .select()
      .single()

    if (error) {
      setStatusMsg(`ERROR: ${error.message}`)
      return
    }

    // Insert Poll Options if type is POLL
    if (postType === 'POLL' && newPost) {
      const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o !== '')
      if (validOptions.length < 2) {
        setStatusMsg('ERROR: Polls require at least 2 valid options.')
        return
      }

      const optionsToInsert = validOptions.map((opt) => ({
        post_id: newPost.id,
        option_text: opt,
      }))

      const { error: pollErr } = await supabase.from('poll_options').insert(optionsToInsert)
      if (pollErr) {
        setStatusMsg(`ERROR SAVING POLL OPTIONS: ${pollErr.message}`)
        return
      }
    }

    setStatusMsg('POST PUBLISHED SUCCESSFULLY!')
    setTitle('')
    setHtmlContent('')
    setPollOptions(['Option 1', 'Option 2'])
    setShowCreateForm(false)
    setPreviewMode(false)
    fetchNews()
  }

  // Delete Post (Mods/Admins Only)
  async function handleDeletePost(postId: string) {
    if (!confirm('Are you sure you want to delete this news item?')) return
    const { error } = await supabase.from('news_posts').delete().eq('id', postId)
    if (error) alert(`Error deleting post: ${error.message}`)
    else fetchNews()
  }

  return (
    <div className="space-y-8">
      {/* Header & Moderator Post Button */}
      <div className="border-b-4 border-white pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">OFFICIAL NEWS & POLLS</h1>
          <p className="text-xs text-neutral-400 uppercase mt-1">
            Game Updates, Interactive Community Polls & Newsletters
          </p>
        </div>

        {isModOrAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
          >
            {showCreateForm ? 'Cancel Creation' : '+ Create News / Poll'}
          </button>
        )}
      </div>

      {/* NEWSLETTER SUBSCRIPTION BAR */}
      <div className="border-4 border-white bg-black p-4 shadow-[6px_6px_0px_0px_#ffffff] space-y-3">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-sm font-black uppercase text-yellow-400">[ SUBSCRIBE TO NEWSLETTER ]</h2>
            <p className="text-xs text-neutral-300 uppercase">
              Get game update announcements and dev logs delivered directly to your inbox.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="YOUR.EMAIL@DOMAIN.COM"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900 w-full sm:w-64"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white text-black font-black uppercase text-xs border-2 border-white hover:bg-neutral-300 shrink-0"
            >
              SUBSCRIBE
            </button>
          </form>
        </div>

        {newsletterStatus && (
          <p className={`text-xs font-bold uppercase ${newsletterStatus.startsWith('ERROR') ? 'text-red-400' : 'text-yellow-400'}`}>
            {newsletterStatus}
          </p>
        )}
      </div>

      {/* MOD / ADMIN CREATE POST FORM */}
      {showCreateForm && isModOrAdmin && (
        <div className="border-4 border-white bg-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#ffffff]">
          <div className="flex justify-between items-center border-b-2 border-white pb-2">
            <h2 className="text-lg font-black uppercase text-yellow-400">[ MODERATOR POST CREATOR ]</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 text-xs font-bold uppercase border border-white ${!previewMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 text-xs font-bold uppercase border border-white ${previewMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                HTML Preview
              </button>
            </div>
          </div>

          {!previewMode ? (
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold mb-1">[ Post Type ]</label>
                  <select
                    value={postType}
                    onChange={(e: any) => setPostType(e.target.value)}
                    className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none"
                  >
                    <option value="UPDATE">⚡ Game Update / Patch Notes</option>
                    <option value="POLL">📊 Community Poll</option>
                    <option value="NEWSLETTER">📰 Newsletter / Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold mb-1">[ Post Headline / Title ]</label>
                  <input
                    type="text"
                    placeholder="e.g. Version 1.2 Patch Notes Released!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Poll Options Input */}
              {postType === 'POLL' && (
                <div className="p-3 border-2 border-dashed border-yellow-400 bg-neutral-950 space-y-2">
                  <label className="block text-xs uppercase font-bold text-yellow-400">[ Poll Options ]</label>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updatePollOption(idx, e.target.value)}
                        className="flex-1 p-1.5 bg-black border border-white text-white font-mono text-xs"
                        placeholder={`Option ${idx + 1}`}
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(idx)}
                          className="px-2 py-1 bg-red-600 text-white font-bold text-xs uppercase"
                        >
                          X
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="mt-1 px-3 py-1 bg-neutral-800 text-white border border-white text-xs font-bold uppercase hover:bg-neutral-700"
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* HTML Content Code Editor */}
              <div>
                <label className="block text-xs uppercase font-bold mb-1">
                  [ Article Body Content (HTML Supported) ]
                </label>
                <textarea
                  rows={8}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="You can write plain text or HTML like <h3>Header</h3>, <p>Text</p>, <ul><li>Item</li></ul>, <img src='...' />"
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
                  required
                />
                <p className="text-[10px] text-neutral-400 mt-1 uppercase">
                  * HTML formatting tags like &lt;h2&gt;, &lt;b&gt;, &lt;code&gt;, &lt;a href="..."&gt;, &lt;img src="..."&gt;, and &lt;ul&gt; will render directly.
                </p>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
              >
                Publish {postType}
              </button>
            </form>
          ) : (
            <div className="p-4 border-2 border-neutral-700 bg-neutral-950 space-y-3">
              <span className="text-[10px] font-bold text-yellow-400 uppercase">[ LIVE HTML PREVIEW ]</span>
              <h1 className="text-xl font-black uppercase text-white">{title || 'UNTITLED POST'}</h1>
              <div 
                className="prose prose-invert max-w-none text-xs border-t border-neutral-800 pt-3"
                dangerouslySetInnerHTML={{ __html: htmlContent || '<p>No HTML content entered yet...</p>' }}
              />
            </div>
          )}

          {statusMsg && (
            <p className="text-xs font-bold uppercase text-center p-2 border border-white bg-neutral-900">
              {statusMsg}
            </p>
          )}
        </div>
      )}

      {/* NEWS & POLLS FEED */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase">LOADING NEWS & POLLS...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase text-neutral-400">
            NO NEWS OR POLLS PUBLISHED YET.
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="border-4 border-white bg-black p-6 space-y-4 shadow-[8px_8px_0px_0px_#ffffff] relative"
            >
              {/* Category Tag & Creation Date */}
              <div className="flex justify-between items-center border-b-2 border-white pb-2 text-xs font-bold uppercase">
                <span className={`px-2 py-0.5 text-black font-black ${
                  post.post_type === 'POLL' 
                    ? 'bg-yellow-400' 
                    : post.post_type === 'NEWSLETTER' 
                    ? 'bg-cyan-400' 
                    : 'bg-white'
                }`}>
                  [{post.post_type}]
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-neutral-400">{new Date(post.created_at).toLocaleDateString()}</span>
                  {isModOrAdmin && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] uppercase hover:bg-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-black uppercase text-white">{post.title}</h2>

              {/* HTML Content Renderer */}
              <div
                className="text-sm leading-relaxed text-neutral-200 border-b border-neutral-800 pb-4 space-y-2 [&_h1]:text-xl [&_h1]:font-black [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-yellow-400 [&_a]:text-yellow-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-h-96 [&_img]:border-2 [&_img]:border-white [&_code]:bg-neutral-900 [&_code]:p-1 [&_code]:border [&_code]:border-neutral-700"
                dangerouslySetInnerHTML={{ __html: post.html_content }}
              />

              {/* POLL INTERACTIVE VOTING SYSTEM */}
              {post.post_type === 'POLL' && post.poll_options && (
                <div className="p-4 border-2 border-yellow-400 bg-neutral-950 space-y-3 my-4">
                  <div className="flex justify-between items-center text-xs font-bold text-yellow-400 uppercase">
                    <span>📊 COMMUNITY POLL VOTING</span>
                    <span>{post.total_votes || 0} TOTAL VOTES</span>
                  </div>

                  <div className="space-y-2">
                    {post.poll_options.map((opt) => {
                      const total = post.total_votes || 0
                      const votes = opt.votes_count || 0
                      const percentage = total > 0 ? Math.round((votes / total) * 100) : 0
                      const isMyVote = post.user_voted_option_id === opt.id

                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-bold uppercase text-white flex items-center gap-1">
                              {opt.option_text} {isMyVote && <span className="text-yellow-400 font-bold">(YOUR VOTE ✓)</span>}
                            </span>
                            <span className="text-neutral-400">{votes} votes ({percentage}%)</span>
                          </div>

                          {/* Progress Bar & Vote Button */}
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 h-4 bg-neutral-900 border border-white relative overflow-hidden">
                              <div
                                className={`h-full ${isMyVote ? 'bg-yellow-400' : 'bg-white'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>

                            {!post.user_voted_option_id && user && (
                              <button
                                onClick={() => handleVote(post.id, opt.id)}
                                className="px-3 py-0.5 bg-white text-black font-black text-xs uppercase border border-white hover:bg-neutral-300 shrink-0"
                              >
                                Vote
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {!user && (
                    <p className="text-[10px] font-bold text-neutral-400 uppercase text-center pt-1">
                      [ Log in to vote in this poll ]
                    </p>
                  )}
                </div>
              )}

              {/* Author Footer */}
              <div className="flex items-center gap-2 pt-2 text-xs font-bold uppercase text-neutral-400">
                <img
                  src={post.profiles?.avatar_url || '/nopfp.png'}
                  alt="Author Avatar"
                  onError={(e: any) => { e.target.src = '/nopfp.png' }}
                  className="w-5 h-5 border border-white bg-black object-cover"
                />
                <span>POSTED BY @{post.profiles?.display_name || 'COMMISSIONERS TEAM'}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}