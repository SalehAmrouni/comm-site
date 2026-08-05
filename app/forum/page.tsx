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

// MAX CHARACTER LIMIT CONSTANTS
const TITLE_MAX_LENGTH = 100
const CONTENT_MAX_LENGTH = 5000 // Generous limit for long bug reports / logs
const REPLY_MAX_LENGTH = 2500
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB Limit

// LIGHTWEIGHT RETRO MARKDOWN RENDERER COMPONENT
function MarkdownText({ content }: { content: string }) {
  if (!content) return null

  // Split into lines for basic block formatting
  const lines = content.split('\n')

  return (
    <div className="space-y-2 text-sm leading-relaxed text-neutral-200">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-xl font-black uppercase text-white border-b border-neutral-700 pb-1 mt-2">{parseInlineMarkdown(line.replace('# ', ''))}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-lg font-bold uppercase text-yellow-400 mt-2">{parseInlineMarkdown(line.replace('## ', ''))}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-base font-bold uppercase text-white mt-1">{parseInlineMarkdown(line.replace('### ', ''))}</h3>
        }
        // Unordered Lists
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 pl-4 text-xs font-mono">
              <span className="text-yellow-400">■</span>
              <span>{parseInlineMarkdown(line.trim().substring(2))}</span>
            </div>
          )
        }
        // Code Block Line
        if (line.startsWith('```')) {
          return <div key={idx} className="border-t border-neutral-800 my-1"></div>
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2"></div>
        }

        return <p key={idx} className="whitespace-pre-wrap">{parseInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

// PARSE INLINE MARKDOWN (Bold, Italic, Code, Links, Images)
function parseInlineMarkdown(text: string) {
  // Regex pattern matcher for image markdown: ![alt](url)
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g
  // Regex pattern matcher for link markdown: [text](url)
  const linkRegex = /\[(.*?)\]\((.*?)\)/g
  // Code snippet pattern: `code`
  const codeRegex = /`(.*?)`/g
  // Bold pattern: **bold**
  const boldRegex = /\*\*(.*?)\*\*/g

  // Simple token replacement parser
  let parts: (string | React.ReactNode)[] = [text]

  // Convert Bold **text**
  parts = flatMapParts(parts, (str) => {
    const subParts = str.split(boldRegex)
    return subParts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-white bg-neutral-800 px-1">{part}</strong> : part)
  })

  // Convert Inline Code `code`
  parts = flatMapParts(parts, (str) => {
    const subParts = str.split(codeRegex)
    return subParts.map((part, i) => i % 2 === 1 ? <code key={i} className="bg-neutral-900 border border-neutral-700 text-yellow-300 font-mono text-xs px-1 py-0.5 rounded-none">{part}</code> : part)
  })

  // Convert Images ![alt](url)
  parts = flatMapParts(parts, (str) => {
    const elements: (string | React.ReactNode)[] = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = imgRegex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        elements.push(str.substring(lastIdx, match.index))
      }
      const alt = match[1] || 'Attached Image'
      const src = match[2]
      elements.push(
        <a key={match.index} href={src} target="_blank" rel="noreferrer" className="block my-2">
          <img src={src} alt={alt} className="max-h-80 border-2 border-white object-contain bg-black hover:opacity-90" />
        </a>
      )
      lastIdx = imgRegex.lastIndex
    }
    if (lastIdx < str.length) {
      elements.push(str.substring(lastIdx))
    }
    return elements
  })

  // Convert Hyperlinks [text](url)
  parts = flatMapParts(parts, (str) => {
    const elements: (string | React.ReactNode)[] = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        elements.push(str.substring(lastIdx, match.index))
      }
      const linkText = match[1]
      const href = match[2]
      elements.push(
        <a key={match.index} href={href} target="_blank" rel="noreferrer" className="text-yellow-400 underline font-bold hover:text-white">
          {linkText} ↗
        </a>
      )
      lastIdx = linkRegex.lastIndex
    }
    if (lastIdx < str.length) {
      elements.push(str.substring(lastIdx))
    }
    return elements
  })

  return parts
}

function flatMapParts(parts: (string | React.ReactNode)[], fn: (str: string) => (string | React.ReactNode)[]): (string | React.ReactNode)[] {
  const result: (string | React.ReactNode)[] = []
  parts.forEach((p) => {
    if (typeof p === 'string') {
      result.push(...fn(p))
    } else {
      result.push(p)
    }
  })
  return result
}

export default function ForumPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // New Thread State
  const [showNewThread, setShowNewThread] = useState(false)
  const [previewThread, setPreviewThread] = useState(false)
  const [category, setCategory] = useState('General Discussion')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [uploadingThreadFile, setUploadingThreadFile] = useState(false)

  // Selected / Expanded Thread State
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replyStatus, setReplyStatus] = useState('')
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [uploadingReplyFile, setUploadingReplyFile] = useState(false)

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

  // Handle Attachment Upload (<10MB Limit)
  async function handleFileUpload(file: File, target: 'thread' | 'reply') {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errMsg = 'ERROR: File size exceeds the 10MB maximum limit.'
      if (target === 'thread') setStatusMsg(errMsg)
      else setReplyStatus(errMsg)
      return
    }

    if (target === 'thread') {
      setUploadingThreadFile(true)
      setStatusMsg('UPLOADING ATTACHMENT...')
    } else {
      setUploadingReplyFile(true)
      setReplyStatus('UPLOADING ATTACHMENT...')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    const filePath = `forum/${fileName}`

    const { error } = await supabase.storage
      .from('forum-attachments')
      .upload(filePath, file)

    if (error) {
      const errText = `UPLOAD ERROR: ${error.message}`
      if (target === 'thread') setStatusMsg(errText)
      else setReplyStatus(errText)
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('forum-attachments')
        .getPublicUrl(filePath)

      const fileUrl = publicUrlData.publicUrl
      const isImage = file.type.startsWith('image/')
      const markdownSnippet = isImage 
        ? `\n![${file.name}](${fileUrl})\n` 
        : `\n[📎 Download ${file.name}](${fileUrl})\n`

      if (target === 'thread') {
        setContent((prev) => prev + markdownSnippet)
        setStatusMsg('FILE ATTACHED SUCCESSFULLY!')
      } else {
        setReplyContent((prev) => prev + markdownSnippet)
        setReplyStatus('FILE ATTACHED SUCCESSFULLY!')
      }
    }

    if (target === 'thread') setUploadingThreadFile(false)
    else setUploadingReplyFile(false)
  }

  // Handle Thread Submission
  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (title.length > TITLE_MAX_LENGTH) {
      setStatusMsg(`ERROR: Title exceeds ${TITLE_MAX_LENGTH} characters.`)
      return
    }

    if (content.length > CONTENT_MAX_LENGTH) {
      setStatusMsg(`ERROR: Content exceeds ${CONTENT_MAX_LENGTH} characters.`)
      return
    }

    setStatusMsg('POSTING THREAD...')

    const { error } = await supabase.from('forum_threads').insert([
      {
        user_id: user.id,
        category,
        title: title.trim(),
        content: content.trim(),
      },
    ])

    if (error) {
      setStatusMsg(`ERROR: ${error.message}`)
    } else {
      setStatusMsg('SUCCESS! THREAD CREATED.')
      setTitle('')
      setContent('')
      setShowNewThread(false)
      setPreviewThread(false)
      await fetchThreads()
    }
  }

  // Handle Reply Submission
  async function handlePostReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !activeThread) return

    if (replyContent.length > REPLY_MAX_LENGTH) {
      setReplyStatus(`ERROR: Reply exceeds ${REPLY_MAX_LENGTH} characters.`)
      return
    }

    setReplyStatus('POSTING REPLY...')

    const { error } = await supabase.from('forum_replies').insert([
      {
        thread_id: activeThread.id,
        user_id: user.id,
        content: replyContent.trim(),
      },
    ])

    if (error) {
      setReplyStatus(`ERROR: ${error.message}`)
    } else {
      setReplyStatus('REPLY POSTED!')
      setReplyContent('')
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
          <p className="text-xs text-neutral-400 uppercase mt-1">Community Discussion & Bug Reporting Boards</p>
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
          <div className="flex justify-between items-center border-b-2 border-white pb-2">
            <h2 className="text-lg font-black uppercase">[ NEW DISCUSSION THREAD ]</h2>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setPreviewThread(false)}
                className={`px-3 py-1 text-xs font-bold uppercase border border-white ${!previewThread ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                Write
              </button>
              <button 
                type="button"
                onClick={() => setPreviewThread(true)}
                className={`px-3 py-1 text-xs font-bold uppercase border border-white ${previewThread ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                Markdown Preview
              </button>
            </div>
          </div>

          {!previewThread ? (
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold mb-1">[ Select Category ]</label>
                <select 
                  value={category} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900 text-xs"
                >
                  <option value="General Discussion">General Discussion</option>
                  <option value="Modding & Custom Content">Modding & Custom Content</option>
                  <option value="Bug Reports & Feedback">Bug Reports & Feedback</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs uppercase font-bold">[ Subject / Title ]</label>
                  <span className={`text-[10px] font-mono ${title.length >= TITLE_MAX_LENGTH ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                    {title.length}/{TITLE_MAX_LENGTH} CHARS
                  </span>
                </div>
                <input 
                  type="text" 
                  value={title}
                  maxLength={TITLE_MAX_LENGTH}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
                  placeholder="Enter topic subject..."
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs uppercase font-bold">[ Post Message (Markdown Supported) ]</label>
                  <span className={`text-[10px] font-mono ${content.length >= CONTENT_MAX_LENGTH ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                    {content.length}/{CONTENT_MAX_LENGTH} CHARS
                  </span>
                </div>
                <textarea 
                  rows={6}
                  value={content}
                  maxLength={CONTENT_MAX_LENGTH}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
                  placeholder="Use **bold**, *italic*, `code`, # headers, or attach files below..."
                  required
                />
              </div>

              {/* File Attachment Input (<10MB) */}
              <div className="p-3 border-2 border-dashed border-neutral-700 bg-neutral-950 space-y-2">
                <label className="block text-xs uppercase font-bold text-yellow-400">[ Attach File / Image (&lt; 10MB) ]</label>
                <input 
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'thread')
                  }}
                  disabled={uploadingThreadFile}
                  className="block w-full text-xs text-neutral-400 file:mr-4 file:py-1.5 file:px-3 file:border-2 file:border-white file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-neutral-300"
                />
                <p className="text-[10px] text-neutral-500 uppercase">* Uploaded file URLs will automatically insert as markdown links into your post body.</p>
              </div>

              <button 
                type="submit" 
                disabled={uploadingThreadFile}
                className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
              >
                Publish Thread
              </button>
            </form>
          ) : (
            <div className="p-4 border-2 border-neutral-700 bg-neutral-950 space-y-3">
              <span className="text-[10px] font-bold text-yellow-400 uppercase">[ MARKDOWN PREVIEW DISPLAY ]</span>
              <h1 className="text-xl font-black uppercase text-white">{title || 'UNTITLED THREAD'}</h1>
              <div className="border-t border-neutral-800 pt-3">
                {content.trim() ? <MarkdownText content={content} /> : <p className="text-xs text-neutral-500 italic">No post content entered yet...</p>}
              </div>
            </div>
          )}

          {statusMsg && (
            <p className={`text-xs font-bold uppercase text-center p-2 border ${statusMsg.startsWith('ERROR') ? 'border-red-500 text-red-400 bg-red-950/40' : 'border-white text-white bg-neutral-900'}`}>
              {statusMsg}
            </p>
          )}
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
              <span className="bg-white text-black px-2 py-0.5 font-bold">{activeThread.category}</span>
              <span>{new Date(activeThread.created_at).toLocaleString()}</span>
            </div>

            <h2 className="text-2xl font-black uppercase text-white">{activeThread.title}</h2>

            {/* Markdown Thread Content */}
            <div className="py-2">
              <MarkdownText content={activeThread.content} />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
              <img 
                src={activeThread.profiles?.avatar_url || '/nopfp.png'} 
                alt="Author Avatar" 
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
                className="w-10 h-10 border-2 border-white bg-black object-cover shrink-0" 
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
                        className="w-5 h-5 border border-white bg-black object-cover shrink-0" 
                      />
                      <span className="text-white">@{reply.profiles?.display_name || 'Anonymous'}</span>
                    </div>
                    <span>{new Date(reply.created_at).toLocaleString()}</span>
                  </div>

                  {/* Markdown Reply Content */}
                  <div className="pt-1">
                    <MarkdownText content={reply.content} />
                  </div>
                </div>
              ))
            )}

            {/* Post Reply Box */}
            {user ? (
              <form onSubmit={handlePostReply} className="border-4 border-white bg-black p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase font-bold">[ Post A Reply ]</label>
                  <span className={`text-[10px] font-mono ${replyContent.length >= REPLY_MAX_LENGTH ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                    {replyContent.length}/{REPLY_MAX_LENGTH} CHARS
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={replyContent}
                  maxLength={REPLY_MAX_LENGTH}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
                  className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
                  placeholder="Type your Markdown response here..."
                  required
                />

                {/* Reply File Attachment (<10MB) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-yellow-400">[ Attach File &lt;10MB ]</label>
                    <input 
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'reply')
                      }}
                      disabled={uploadingReplyFile}
                      className="text-[10px] text-neutral-400 file:py-1 file:px-2 file:border file:border-white file:text-[10px] file:bg-white file:text-black hover:file:bg-neutral-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingReplyFile}
                    className="px-4 py-2 bg-white text-black font-black uppercase text-xs border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
                  >
                    Submit Reply
                  </button>
                </div>

                {replyStatus && (
                  <p className={`text-xs font-bold uppercase p-1.5 border mt-2 ${replyStatus.startsWith('ERROR') ? 'border-red-500 text-red-400 bg-red-950/40' : 'border-white text-white'}`}>
                    {replyStatus}
                  </p>
                )}
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
                          className="w-6 h-6 border border-white bg-black object-cover shrink-0" 
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