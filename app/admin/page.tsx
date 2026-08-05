'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'builds' | 'mods'>('users')

  // User Management state
  const [profiles, setProfiles] = useState<any[]>([])
  
  // Mod Moderation state
  const [mods, setMods] = useState<any[]>([])

  // Build Creation state
  const [builds, setBuilds] = useState<any[]>([])
  const [buildTitle, setBuildTitle] = useState('')
  const [buildVersion, setBuildVersion] = useState('')
  const [buildUrl, setBuildUrl] = useState('')
  const [buildDescription, setBuildDescription] = useState('')
  const [isPrivateBuild, setIsPrivateBuild] = useState(false)

  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setIsAdmin(true)
    fetchData()
    setLoading(false)
  }

  async function fetchData() {
    // Fetch user profiles
    const { data: profileData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (profileData) setProfiles(profileData)

    // Fetch mods
    const { data: modData } = await supabase.from('mods').select('*').order('created_at', { ascending: false })
    if (modData) setMods(modData)

    // Fetch builds
    const { data: buildData } = await supabase.from('builds').select('*').order('created_at', { ascending: false })
    if (buildData) setBuilds(buildData)
  }

  // --- USER MANAGEMENT ---
  async function updateUserRole(userId: string, newRole: string) {
    setMessage(`Updating user role to ${newRole}...`)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage(`SUCCESS: Role updated to ${newRole}`)
      fetchData()
    }
  }

  async function deleteUserRecord(userId: string) {
    if (!confirm('Are you sure you want to delete this profile record?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage(`Profile record deleted.`)
      fetchData()
    }
  }

  // --- BUILD PUBLISHING ---
  async function handleAddBuild(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Publishing build...')

    const { error } = await supabase.from('builds').insert([
      {
        title: buildTitle,
        version: buildVersion,
        description: buildDescription,
        download_url: buildUrl,
        is_private: isPrivateBuild
      }
    ])

    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage('BUILD PUBLISHED SUCCESSFULLY!')
      setBuildTitle('')
      setBuildVersion('')
      setBuildUrl('')
      setBuildDescription('')
      setIsPrivateBuild(false)
      fetchData()
    }
  }

  async function deleteBuild(buildId: string) {
    if (!confirm('Delete this build release?')) return
    const { error } = await supabase.from('builds').delete().eq('id', buildId)
    if (!error) fetchData()
  }

  // --- MOD MODERATION ---
  async function deleteMod(modId: string) {
    if (!confirm('Delete this mod submission permanently?')) return
    const { error } = await supabase.from('mods').delete().eq('id', modId)
    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage('Mod deleted.')
      fetchData()
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto my-12 p-6 border-4 border-white bg-black text-white font-mono text-center">
        [ VERIFYING ADMIN PERMISSIONS... ]
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="max-w-xl mx-auto my-12 p-6 border-4 border-red-500 bg-black text-white font-mono text-center space-y-4">
        <h1 className="text-xl font-bold text-red-500">[ ACCESS DENIED ]</h1>
        <p className="text-xs text-neutral-400">You must have the ADMIN role to access this control panel.</p>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff] space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-white pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase">🛠️ ADMIN & DEV DASHBOARD</h1>
          <p className="text-xs text-neutral-400">Manage user roles, publish game builds, and moderate mods.</p>
        </div>
        <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase border border-white">
          ADMIN CONFIRMED
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b-2 border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold uppercase border-2 ${activeTab === 'users' ? 'bg-white text-black border-white' : 'bg-black text-white border-neutral-700'}`}
        >
          👥 User Roles ({profiles.length})
        </button>
        <button
          onClick={() => setActiveTab('builds')}
          className={`px-4 py-2 text-xs font-bold uppercase border-2 ${activeTab === 'builds' ? 'bg-white text-black border-white' : 'bg-black text-white border-neutral-700'}`}
        >
          📦 Game Builds ({builds.length})
        </button>
        <button
          onClick={() => setActiveTab('mods')}
          className={`px-4 py-2 text-xs font-bold uppercase border-2 ${activeTab === 'mods' ? 'bg-white text-black border-white' : 'bg-black text-white border-neutral-700'}`}
        >
          🕹️ Moderate Mods ({mods.length})
        </button>
      </div>

      {message && (
        <div className="p-3 bg-yellow-400 text-black text-xs font-bold uppercase border-2 border-white">
          {message}
        </div>
      )}

      {/* TAB 1: USER ROLES MANAGEMENT */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase text-yellow-400">[ USER DIRECTORY & ROLE MANAGEMENT ]</h2>
          <div className="overflow-x-auto border-2 border-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 border-b-2 border-white text-neutral-300">
                <tr>
                  <th className="p-3">EMAIL / USER ID</th>
                  <th className="p-3">CURRENT ROLE</th>
                  <th className="p-3">CHANGE ROLE</th>
                  <th className="p-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-900">
                    <td className="p-3 font-bold truncate max-w-[200px]">
                      {p.email || p.id}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.role === 'admin' ? 'bg-red-500 text-white' : p.role === 'tester' ? 'bg-emerald-400 text-black' : 'bg-neutral-700 text-white'
                      }`}>
                        {p.role || 'user'}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={p.role || 'user'}
                        onChange={(e) => updateUserRole(p.id, e.target.value)}
                        className="bg-black border border-white text-white p-1 text-xs font-mono outline-none cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="tester">Tester (Private Builds)</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteUserRecord(p.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: GAME BUILDS MANAGEMENT */}
      {activeTab === 'builds' && (
        <section className="space-y-6">
          {/* Add Build Form */}
          <form onSubmit={handleAddBuild} className="border-2 border-yellow-400 bg-neutral-950 p-4 space-y-3">
            <h2 className="text-sm font-bold uppercase text-yellow-400">[ ADD NEW GAME RELEASE BUILD ]</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold mb-1">BUILD TITLE</label>
                <input
                  type="text"
                  placeholder="e.g. Commissioners Public Release"
                  value={buildTitle}
                  onChange={(e) => setBuildTitle(e.target.value)}
                  className="w-full p-2 bg-black border border-white text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold mb-1">VERSION</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0.4-beta"
                  value={buildVersion}
                  onChange={(e) => setBuildVersion(e.target.value)}
                  className="w-full p-2 bg-black border border-white text-xs text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold mb-1">DOWNLOAD URL (.ZIP / ITCH / DRIVE LINK)</label>
              <input
                type="url"
                placeholder="https://..."
                value={buildUrl}
                onChange={(e) => setBuildUrl(e.target.value)}
                className="w-full p-2 bg-black border border-white text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold mb-1">DESCRIPTION / CHANGELOG</label>
              <textarea
                placeholder="Release notes, fixes, new features..."
                value={buildDescription}
                onChange={(e) => setBuildDescription(e.target.value)}
                className="w-full p-2 bg-black border border-white text-xs text-white h-16"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="privateCheck"
                checked={isPrivateBuild}
                onChange={(e) => setIsPrivateBuild(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="privateCheck" className="text-xs font-bold uppercase text-emerald-400 cursor-pointer">
                🔒 RESTRICT TO TESTERS & ADMINS ONLY (PRIVATE BUILD)
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-yellow-400 text-black font-black uppercase text-xs hover:bg-yellow-300"
            >
              + PUBLISH RELEASE BUILD
            </button>
          </form>

          {/* Existing Builds List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-neutral-400">[ ACTIVE BUILDS LIST ]</h3>
            {builds.map((b) => (
              <div key={b.id} className="border-2 border-white bg-neutral-900 p-3 flex justify-between items-center text-xs">
                <div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase mr-2 ${b.is_private ? 'bg-emerald-500 text-black' : 'bg-white text-black'}`}>
                    {b.is_private ? 'TESTER / PRIVATE' : 'PUBLIC'}
                  </span>
                  <strong className="text-sm">{b.title}</strong> ({b.version})
                  <p className="text-[11px] text-neutral-400 mt-0.5">{b.description || 'No description provided.'}</p>
                </div>
                <button
                  onClick={() => deleteBuild(b.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase shrink-0"
                >
                  Delete Build
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: MOD MODERATION */}
      {activeTab === 'mods' && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase text-yellow-400">[ MODERATION ARCHIVE ]</h2>
          {mods.map((m) => (
            <div key={m.id} className="border-2 border-white bg-neutral-900 p-3 flex justify-between items-center gap-4 text-xs">
              <div className="space-y-1 truncate">
                <h3 className="font-bold text-sm uppercase">{m.title}</h3>
                <p className="text-neutral-400 text-[11px] truncate">{m.description}</p>
                {m.download_url && (
                  <a href={m.download_url} target="_blank" rel="noreferrer" className="text-yellow-400 underline text-[10px]">
                    Download Link ↗
                  </a>
                )}
              </div>
              <button
                onClick={() => deleteMod(m.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase shrink-0"
              >
                DELETE MOD
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}