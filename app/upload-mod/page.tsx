'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function UploadModPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    alert(`Mod submitted: ${title}`)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
        <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-2xl font-bold mb-6">Upload a Mod for Commissioners</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Mod Title</label>
            <input 
              type="text" 
              placeholder="e.g. Custom Character Skin Pack" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Description</label>
            <textarea 
              rows={4}
              placeholder="Describe what your mod does..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">Mod Download Link</label>
            <input 
              type="url" 
              placeholder="https://drive.google.com/... or direct link" 
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button 
            type="submit" 
            className="mt-4 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition"
          >
            Submit Mod
          </button>
        </form>
      </div>
    </main>
  )
}