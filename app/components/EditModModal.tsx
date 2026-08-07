'use client'

import React, { useState } from 'react'
import { createClient } from '../supabaseClient'

interface ModData {
  id: string
  title: string
  description: string
  image_url?: string
  download_url?: string
}

interface EditModModalProps {
  isOpen: boolean
  onClose: () => void
  mod: ModData
  onSuccess: (updatedMod: ModData) => void
}

export default function EditModModal({
  isOpen,
  onClose,
  mod,
  onSuccess,
}: EditModModalProps) {
  const [title, setTitle] = useState(mod.title || '')
  const [description, setDescription] = useState(mod.description || '')
  const [imageUrl, setImageUrl] = useState(mod.image_url || '')
  const [downloadUrl, setDownloadUrl] = useState(mod.download_url || '')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const updates = {
      title,
      description,
      image_url: imageUrl,
      download_url: downloadUrl,
    }

    // Using .maybeSingle() to safely handle empty row responses
    const { data, error: updateError } = await supabase
      .from('mods')
      .update(updates)
      .eq('id', mod.id)
      .select()
      .maybeSingle()

    if (updateError) {
      setError(updateError.message || 'FAILED TO UPDATE MOD.')
      setSaving(false)
      return
    }

    // If no row came back, RLS blocked the update
    if (!data) {
      setError('PERMISSION DENIED: YOU ARE NOT REGISTERED AS THE OWNER OF THIS MOD IN THE DATABASE.')
      setSaving(false)
      return
    }

    setSaving(false)
    onSuccess(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="relative w-full max-w-xl bg-black border-4 border-white p-6 shadow-[12px_12px_0px_0px_#ffffff] text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-white pb-3 mb-4">
          <h2 className="text-lg font-black uppercase text-yellow-400">
            ✏️ EDIT MOD DETAILS
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white text-black font-bold text-xs uppercase hover:bg-neutral-300 border border-white"
          >
            [ CLOSE ✖ ]
          </button>
        </div>

        {error && (
          <div className="p-3 border-2 border-red-500 bg-red-950/40 text-red-400 text-xs font-bold uppercase mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
              MOD TITLE
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border-2 border-white p-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
              DOWNLOAD URL
            </label>
            <input
              type="url"
              required
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full bg-neutral-900 border-2 border-white p-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
              PREVIEW IMAGE URL (OPTIONAL)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://i.imgur.com/..."
              className="w-full bg-neutral-900 border-2 border-white p-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">
              DESCRIPTION
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-900 border-2 border-white p-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-white text-white font-bold text-xs uppercase hover:bg-neutral-800"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-yellow-400 text-black font-black text-xs uppercase border-2 border-white hover:bg-yellow-300 shadow-[4px_4px_0px_0px_#ffffff] transition-transform active:translate-x-1 active:translate-y-1"
            >
              {saving ? '[ SAVING... ]' : 'SAVE CHANGES 💾'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}