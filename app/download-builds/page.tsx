'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../supabaseClient'

export default function DownloadBuildsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAuthorized(false)
        return
      }

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data?.role === 'tester' || data?.role === 'admin') {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }
    }
    checkAccess()
  }, [])

  if (authorized === null) return <div className="p-8 text-white font-mono">[ VERIFYING ACCESS... ]</div>

  if (!authorized) {
    return (
      <main className="max-w-md mx-auto my-12 p-6 border-4 border-red-500 bg-black text-red-500 text-center font-mono uppercase">
        <h1 className="text-xl font-bold mb-2">[ ACCESS DENIED ]</h1>
        <p className="text-xs text-white">This page requires the TESTER role. Contact an administrator to get access.</p>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono">
      <h1 className="text-2xl font-black mb-6 uppercase">[ DOWNLOAD TEST BUILDS ]</h1>
      <div className="space-y-4">
        <div className="p-4 border-2 border-white bg-neutral-900 flex justify-between items-center">
          <div>
            <h3 className="font-bold">v0.4.2-ALPHA BUILD</h3>
            <p className="text-xs text-neutral-400">Uploaded: 2 hours ago</p>
          </div>
          <a href="#" className="px-4 py-2 bg-white text-black font-bold uppercase hover:bg-neutral-300">
            DOWNLOAD (.ZIP)
          </a>
        </div>
      </div>
    </main>
  )
}