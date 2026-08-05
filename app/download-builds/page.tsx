'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../supabaseClient'
import Link from 'next/link'

export default function DownloadBuildsPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [publicBuilds, setPublicBuilds] = useState<any[]>([])
  const [privateBuilds, setPrivateBuilds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      // Check user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setUserRole(data?.role || 'user')
      } else {
        setUserRole('guest')
      }

      // Fetch builds from DB
      const { data: builds } = await supabase.from('builds').select('*').order('created_at', { ascending: false })
      if (builds) {
        setPublicBuilds(builds.filter((b) => !b.is_private))
        setPrivateBuilds(builds.filter((b) => b.is_private))
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  const isTesterOrAdmin = userRole === 'tester' || userRole === 'admin'

  return (
    <main className="max-w-4xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff] space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase border-b-4 border-white pb-3">[ GAME BUILDS & DOWNLOADS ]</h1>
        <p className="text-xs text-neutral-400 mt-2">Download official public releases or access private tester builds.</p>
      </div>

      {/* PUBLIC STABLE BUILDS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold uppercase text-yellow-400 flex items-center gap-2">
          🌐 PUBLIC STABLE RELEASES
        </h2>
        {publicBuilds.length > 0 ? (
          publicBuilds.map((b) => (
            <div key={b.id} className="border-2 border-white bg-neutral-900 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="px-2 py-0.5 bg-emerald-500 text-black text-[10px] font-bold uppercase">{b.version}</span>
                <h3 className="font-bold text-base mt-1">{b.title}</h3>
                <p className="text-xs text-neutral-400">{b.description || 'Public release build.'}</p>
              </div>
              <a 
                href={b.download_url} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-white text-black font-bold uppercase text-xs hover:bg-neutral-300 shrink-0 border border-white"
              >
                Download Build ↗
              </a>
            </div>
          ))
        ) : (
          <p className="text-xs text-neutral-500 italic p-3 border border-neutral-800 bg-neutral-950">
            No public builds published yet.
          </p>
        )}
      </section>

      {/* PRIVATE TESTER BUILDS */}
      <section className="space-y-4 pt-4 border-t-2 border-neutral-800">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold uppercase text-emerald-400 flex items-center gap-2">
            🧪 TESTER & EXPERIMENTAL BUILDS
          </h2>
          <span className="text-[10px] uppercase px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-400">
            YOUR ROLE: {loading ? 'CHECKING...' : userRole?.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <div className="p-4 border-2 border-dashed border-neutral-700 bg-neutral-950 text-xs text-neutral-400 text-center">
            VERIFYING PERMISSIONS...
          </div>
        ) : isTesterOrAdmin ? (
          <div className="space-y-3">
            {privateBuilds.length > 0 ? (
              privateBuilds.map((b) => (
                <div key={b.id} className="border-2 border-emerald-500 bg-neutral-950 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="px-2 py-0.5 bg-yellow-400 text-black text-[10px] font-bold uppercase">{b.version}</span>
                    <h3 className="font-bold text-base mt-1">{b.title}</h3>
                    <p className="text-xs text-neutral-400">{b.description || 'Private build for testers.'}</p>
                  </div>
                  <a 
                    href={b.download_url}
                    target="_blank"
                    rel="noreferrer" 
                    className="px-4 py-2 bg-emerald-400 text-black font-bold uppercase text-xs hover:bg-emerald-300 shrink-0"
                  >
                    Download Build (.ZIP)
                  </a>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic p-3 border border-neutral-800">No private tester builds published yet.</p>
            )}
          </div>
        ) : (
          <div className="p-6 border-2 border-red-500 bg-neutral-950 text-center space-y-3">
            <h3 className="text-red-400 text-sm font-bold uppercase">[ TESTER ACCESS REQUIRED ]</h3>
            <p className="text-xs text-neutral-400 max-w-lg mx-auto">
              Experimental builds are restricted to accounts with the <strong className="text-white">TESTER</strong> or <strong className="text-white">ADMIN</strong> role.
            </p>
            {userRole === 'guest' ? (
              <Link 
                href="/login" 
                className="inline-block px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-neutral-300"
              >
                Log In To Check Access
              </Link>
            ) : (
              <p className="text-[11px] text-neutral-500">
                Contact an administrator to request the Tester role.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}