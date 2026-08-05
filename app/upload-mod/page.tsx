'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../supabaseClient'
import { useRouter } from 'next/navigation'

export default function UploadModPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('') // Restored mod file link field
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  // Guard: Redirect guests to login
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [supabase, router])

  async function handleCreateMod(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)
    setMessage('')

    try {
      let finalImageUrl = imageUrlInput

      // 1. Upload preview image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `public/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('mod-images')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('mod-images')
          .getPublicUrl(filePath)

        finalImageUrl = publicUrlData.publicUrl
      }

      // 2. Get current user ID
      const { data: { user } } = await supabase.auth.getUser()

      // 3. Insert mod record with mod download_url and user_id
      const { error: dbError } = await supabase.from('mods').insert([
        {
          title,
          description,
          download_url: downloadUrl, // Saving mod file link
          image_url: finalImageUrl || null,
          user_id: user?.id || null
        },
      ])

      if (dbError) throw dbError

      setMessage('MOD POSTED SUCCESSFULLY!')
      setTimeout(() => router.push('/mods'), 1500)
    } catch (err: any) {
      setMessage(`ERROR: ${err.message || 'FAILED TO POST MOD'}`)
    } finally {
      setUploading(false)
    }
  }

  if (checkingAuth) {
    return (
      <main className="max-w-xl mx-auto my-12 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff] text-center">
        <p className="text-xs uppercase font-bold animate-pulse">[ VERIFYING ACCOUNT ACCESS... ]</p>
      </main>
    )
  }

  return (
    <main className="max-w-xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff]">
      <h1 className="text-xl font-black uppercase mb-6 text-center">[ UPLOAD MOD ]</h1>

      <form onSubmit={handleCreateMod} className="space-y-4">
        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ MOD TITLE ]</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none"
            placeholder="e.g., HD Texture Overhaul"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ MOD FILE / DOWNLOAD URL ]</label>
          <input
            type="url"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            className="w-full p-2 bg-black border-2 border-yellow-400 text-yellow-400 font-mono outline-none"
            placeholder="https://drive.google.com/..., https://mediafire.com/..., or direct .zip link"
            required
          />
          <span className="text-[10px] text-neutral-400 mt-1 block">
            Paste the direct download URL or cloud host link for your mod file (.zip, .rar, .7z).
          </span>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ DESCRIPTION ]</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono h-24 outline-none"
            placeholder="Describe your mod features, installation instructions, etc."
            required
          />
        </div>

        {/* IMAGE OPTION SECTION */}
        <div className="border-2 border-dashed border-neutral-700 p-4 bg-neutral-900 space-y-3">
          <label className="block text-xs uppercase font-bold text-yellow-400">
            [ MOD PREVIEW IMAGE (OPTIONAL) ]
          </label>

          <div>
            <span className="block text-[10px] text-neutral-400 mb-1">Option A: Upload Image File</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="text-xs text-neutral-300 file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-white file:text-black file:font-bold file:uppercase cursor-pointer"
            />
          </div>

          <div className="text-center text-xs font-bold text-neutral-500">- OR -</div>

          <div>
            <span className="block text-[10px] text-neutral-400 mb-1">Option B: Direct Image URL</span>
            <input
              type="url"
              placeholder="https://example.com/preview.png"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="w-full p-2 bg-black border border-neutral-600 text-xs text-white outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
        >
          {uploading ? 'POSTING MOD...' : 'SUBMIT MOD'}
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