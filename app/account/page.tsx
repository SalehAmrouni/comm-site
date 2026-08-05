'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../supabaseClient'

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null)
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)

      // If user is admin, fetch all accounts to manage tester roles
      if (data?.role === 'admin') {
        const { data: users } = await supabase.from('profiles').select('*')
        setAllProfiles(users || [])
      }
    }
    loadProfile()
  }, [])

  async function toggleTesterRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'tester' ? 'user' : 'tester'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setAllProfiles(allProfiles.map(p => p.id === userId ? { ...p, role: newRole } : p))
  }

  if (!profile) return <div className="p-8 text-white font-mono">[ LOADING ACCOUNT... ]</div>

  return (
    <main className="max-w-3xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono">
      <h1 className="text-2xl font-black mb-4 uppercase">[ ACCOUNT PROFILE ]</h1>
      <p className="text-sm mb-2">EMAIL: <span className="font-bold">{profile.email}</span></p>
      <p className="text-sm mb-6">
        ROLE: <span className="px-2 py-1 border border-white bg-neutral-800 text-yellow-400 font-bold uppercase">{profile.role}</span>
      </p>

      {/* ADMIN PANEL TO GRANT TESTER ROLE */}
      {profile.role === 'admin' && (
        <section className="mt-8 pt-6 border-t-2 border-white">
          <h2 className="text-lg font-bold mb-4 text-yellow-400">[ ADMIN USER MANAGEMENT ]</h2>
          <div className="space-y-2">
            {allProfiles.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-3 border border-neutral-700 bg-neutral-900">
                <span className="text-xs">{user.email} ({user.role})</span>
                {user.role !== 'admin' && (
                  <button
                    onClick={() => toggleTesterRole(user.id, user.role)}
                    className="px-3 py-1 bg-white text-black text-xs font-bold uppercase hover:bg-neutral-300"
                  >
                    {user.role === 'tester' ? 'REVOKE TESTER' : 'GIVE TESTER'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}