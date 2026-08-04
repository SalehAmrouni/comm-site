'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '../supabaseClient'

export default function ModsPage() {
  const [mods, setMods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMods() {
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMods(data)
      }
      setLoading(false)
    }

    fetchMods()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase">COMMISSIONERS MOD DATABASE</h1>
          <p className="text-xs text-neutral-400 uppercase mt-1">Browse, download, and share community mods</p>
        </div>
        <Link 
          href="/upload-mod" 
          className="px-6 py-3 bg-white text-black font-black uppercase border-2 border-white hover:bg-neutral-300"
        >
          + Upload Mod
        </Link>
      </div>

      {loading ? (
        <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase">
          LOADING MOD ARCHIVE...
        </div>
      ) : mods.length === 0 ? (
        <div className="p-8 border-4 border-white text-center font-bold text-xs uppercase text-neutral-400">
          NO MODS FOUND IN ARCHIVE. BE THE FIRST TO UPLOAD ONE!
        </div>
      ) : (
        <div className="border-4 border-white bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs uppercase font-mono">
            <thead>
              <tr className="border-b-2 border-white bg-neutral-900 text-white">
                <th className="p-3 border-r-2 border-white">Mod Title</th>
                <th className="p-3 border-r-2 border-white">Description</th>
                <th className="p-3 border-r-2 border-white">Author</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {mods.map((mod) => (
                <tr key={mod.id} className="border-b-2 border-white hover:bg-neutral-900">
                  <td className="p-3 border-r-2 border-white font-bold">{mod.title}</td>
                  <td className="p-3 border-r-2 border-white text-neutral-300">{mod.description}</td>
                  <td className="p-3 border-r-2 border-white font-bold text-neutral-400">@{mod.author_name}</td>
                  <td className="p-3">
                    <a 
                      href={mod.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-block px-3 py-1 bg-white text-black font-bold uppercase hover:bg-neutral-300"
                    >
                      Download ↓
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}