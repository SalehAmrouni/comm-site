'use client'

import Link from 'next/link'

export default function ModsPage() {
  // Sample placeholder mods with retro layout
  const sampleMods = [
    { id: 1, title: 'High Contrast Skin Pack', author: 'ModderX', downloads: 142, date: '2026-08-01' },
    { id: 2, title: 'Custom Sound Effects (Retro)', author: 'ChiptuneMaster', downloads: 89, date: '2026-08-02' },
  ]

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

      {/* Retro Table */}
      <div className="border-4 border-white bg-black overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs uppercase font-mono">
          <thead>
            <tr className="border-b-2 border-white bg-neutral-900 text-white">
              <th className="p-3 border-r-2 border-white">Mod Title</th>
              <th className="p-3 border-r-2 border-white">Author</th>
              <th className="p-3 border-r-2 border-white">Downloads</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sampleMods.map((mod) => (
              <tr key={mod.id} className="border-b-2 border-white hover:bg-neutral-900">
                <td className="p-3 border-r-2 border-white font-bold">{mod.title}</td>
                <td className="p-3 border-r-2 border-white">{mod.author}</td>
                <td className="p-3 border-r-2 border-white">{mod.downloads}</td>
                <td className="p-3">
                  <button className="px-3 py-1 bg-white text-black font-bold uppercase hover:bg-neutral-300">
                    Download ↓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}