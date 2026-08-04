'use client'

import { useState, useEffect } from 'react'
import { createClient } from './supabaseClient'

export default function ModList() {
  const [mods, setMods] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    // 1. Fetch public mods (anyone can see these!)
    async function fetchMods() {
      const { data } = await supabase.from('mods').select('*')
      if (data) setMods(data)
    }

    // 2. Check if user is currently logged in
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }

    fetchMods()
    checkUser()
  }, [])

  function handleCreateModClick() {
    if (!user) {
      alert("You need to be logged in to upload mods for Commissioners!")
      window.location.href = "/login"
    } else {
      window.location.href = "/upload-mod"
    }
  }

  return (
    <div className="p-8 bg-gray-950 text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Commissioners - Community Mods</h1>
        <button 
          onClick={handleCreateModClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition"
        >
          + Upload Mod
        </button>
      </div>

      {/* Publicly viewable list of mods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mods.map((mod) => (
          <div key={mod.id} className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <h2 className="text-xl font-bold">{mod.title}</h2>
            <p className="text-gray-400 text-sm mt-2">{mod.description}</p>
            <a 
              href={mod.file_url} 
              download 
              className="inline-block mt-4 text-blue-400 hover:underline text-sm font-semibold"
            >
              Download Mod ↓
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}