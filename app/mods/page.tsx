'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../supabaseClient'

export default function ModsPage() {
  const [mods, setMods] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const itemsPerPage = 18 // 3 per row * 6 per column = 18 per page
  const supabase = createClient()

  useEffect(() => {
    async function fetchMods() {
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data } = await supabase
        .from('mods')
        .select('*')
        .range(from, to)

      setMods(data || [])
    }
    fetchMods()
  }, [page])

  return (
    <main className="max-w-7xl mx-auto p-6 font-mono text-white">
      <h1 className="text-2xl font-black mb-6 uppercase text-center">[ MODS GALLERY ]</h1>

      {/* 3 PER ROW (grid-cols-3) LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mods.map((mod) => (
          <div key={mod.id} className="border-4 border-white bg-black p-4 flex flex-col justify-between">
            {/* OPTIONAL IMAGE DISPLAY */}
            {mod.image_url ? (
              <img 
                src={mod.image_url} 
                alt={mod.title} 
                className="w-full h-48 object-cover border-2 border-white mb-3" 
              />
            ) : (
              <div className="w-full h-48 border-2 border-dashed border-neutral-700 bg-neutral-900 flex items-center justify-center text-xs text-neutral-500 mb-3">
                [ NO IMAGE AVAILABLE ]
              </div>
            )}

            <h2 className="font-bold text-lg uppercase mb-1">{mod.title}</h2>
            <p className="text-xs text-neutral-400 mb-4 line-clamp-2">{mod.description}</p>
            
            {/* PAGE LINK ADDED HERE */}
            <Link 
              href={`/mods/${mod.id}`}
              className="w-full py-2 bg-white text-black text-center font-bold uppercase hover:bg-neutral-300 mt-auto block"
            >
              VIEW MOD
            </Link>
          </div>
        ))}
      </div>

      {/* PAGINATION CONTROLS */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border-2 border-white bg-black font-bold uppercase disabled:opacity-30"
        >
          PREVIOUS
        </button>
        <span className="text-xs font-bold">PAGE {page}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={mods.length < itemsPerPage}
          className="px-4 py-2 border-2 border-white bg-black font-bold uppercase disabled:opacity-30"
        >
          NEXT
        </button>
      </div>
    </main>
  )
}