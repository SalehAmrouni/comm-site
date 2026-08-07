'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../supabaseClient'
import Link from 'next/link'
import ModInspectorModal from '../../components/ModInspectorModal'
import EditModModal from '../../components/EditModModal'

export default function ModDetailPage() {
  const params = useParams()
  const modId = params.id

  const [mod, setMod] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      if (!modId) return

      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // 2. Fetch mod details
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .eq('id', modId)
        .single()

      if (error) {
        setError('MOD NOT FOUND OR HAS BEEN REMOVED.')
      } else {
        setMod(data)
      }
      setLoading(false)
    }

    loadData()
  }, [modId])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto my-12 p-6 border-4 border-white bg-black text-white font-mono text-center shadow-[8px_8px_0px_0px_#ffffff]">
        <p className="animate-pulse text-xs uppercase font-bold">[ LOADING MOD DATA... ]</p>
      </main>
    )
  }

  if (error || !mod) {
    return (
      <main className="max-w-3xl mx-auto my-12 p-6 border-4 border-white bg-black text-white font-mono text-center shadow-[8px_8px_0px_0px_#ffffff]">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <Link href="/mods" className="underline text-xs uppercase hover:text-neutral-300">
          &lt; BACK TO ALL MODS
        </Link>
      </main>
    )
  }

  const downloadLink = mod.download_url || mod.file_url
  
  // Ownership check: user ID matches mod's author_id or user_id
  const isOwner = currentUser && (currentUser.id === mod.author_id || currentUser.id === mod.user_id)

  return (
    <main className="max-w-3xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff]">
      {/* Top Header & Navigation */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/mods" className="text-xs uppercase font-bold text-neutral-400 hover:text-white underline">
          &lt; BACK TO MODS LIST
        </Link>

        {/* OWNER EDIT BUTTON */}
        {isOwner && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-3 py-1 bg-yellow-400 text-black font-black text-xs uppercase border-2 border-white hover:bg-yellow-300 shadow-[3px_3px_0px_0px_#ffffff]"
          >
            EDIT MOD ✏️
          </button>
        )}
      </div>

      {/* Mod Title */}
      <h1 className="text-2xl font-black uppercase mb-4 border-b-2 border-white pb-2">
        {mod.title}
      </h1>

      {/* Preview Image */}
      {mod.image_url ? (
        <div className="mb-6 border-2 border-white overflow-hidden bg-neutral-900">
          <img
            src={mod.image_url}
            alt={mod.title}
            className="w-full max-h-96 object-contain"
          />
        </div>
      ) : (
        <div className="mb-6 p-8 border-2 border-dashed border-neutral-700 bg-neutral-900 text-center text-xs text-neutral-500 uppercase">
          [ NO PREVIEW IMAGE PROVIDED ]
        </div>
      )}

      {/* Description Section */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase text-yellow-400 mb-2">[ DESCRIPTION ]</h2>
        <div className="p-4 border-2 border-neutral-700 bg-neutral-900 text-sm whitespace-pre-wrap leading-relaxed">
          {mod.description || 'No description provided.'}
        </div>
      </div>

      {/* Download Action & Inspector */}
      {downloadLink ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-4 bg-white text-black text-center font-black uppercase text-sm border-2 border-white hover:bg-neutral-300 shadow-[4px_4px_0px_0px_#888888] transition-transform active:translate-x-1 active:translate-y-1"
          >
            DOWNLOAD MOD FILE 💾
          </a>

          <button
            onClick={() => setIsInspectorOpen(true)}
            className="py-4 px-6 bg-yellow-400 text-black font-black uppercase text-sm border-2 border-white hover:bg-yellow-300 shadow-[4px_4px_0px_0px_#ffffff] transition-transform active:translate-x-1 active:translate-y-1 shrink-0"
          >
            TAKE A PEEK? 🔍
          </button>
        </div>
      ) : (
        <div className="p-3 border-2 border-red-500 bg-neutral-900 text-red-400 text-xs text-center font-bold uppercase">
          NO DOWNLOAD LINK AVAILABLE FOR THIS MOD
        </div>
      )}

      {/* Inspector Modal */}
      <ModInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        fileUrl={downloadLink}
        modTitle={mod.title}
      />

      {/* Owner Edit Modal */}
      {isOwner && (
        <EditModModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          mod={mod}
          onSuccess={(updatedMod) => setMod(updatedMod)}
        />
      )}
    </main>
  )
}