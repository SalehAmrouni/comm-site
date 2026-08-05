'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '../supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'builds' | 'mods'>('users')

  // User Directory State
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [actionReason, setActionReason] = useState('')
  const [banDays, setBanDays] = useState('7')

  // Mod Moderation & Builds State
  const [mods, setMods] = useState<any[]>([])
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
    // 1. Fetch User Profiles safely
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')

    if (profileError) {
      setMessage(`USER FETCH ERROR: ${profileError.message}`)
    } else if (profileData) {
      setProfiles(profileData)
    }

    // 2. Fetch Mods
    const { data: modData } = await supabase.from('mods').select('*')
    if (modData) setMods(modData)

    // 3. Fetch Builds
    const { data: buildData } = await supabase.from('builds').select('*')
    if (buildData) setBuilds(buildData)
  }

  // --- USER MODERATION & ROLE ACTIONS ---
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

  async function warnUser(userId: string) {
    if (!actionReason) return alert('Please enter a reason for the warning.')
    const target = profiles.find(p => p.id === userId)
    const newCount = (target?.warning_count || 0) + 1

    const { error } = await supabase.from('profiles').update({
      status: 'warned',
      warning_count: newCount,
      warning_reason: actionReason
    }).eq('id', userId)

    if (error) setMessage(`ERROR: ${error.message}`)
    else {
      setMessage(`Warning issued to user. Total Warnings: ${newCount}`)
      setSelectedUser(null)
      setActionReason('')
      fetchData()
    }
  }

  async function tempBanUser(userId: string) {
    if (!actionReason) return alert('Please enter a reason for the temporary ban.')
    const until = new Date()
    until.setDate(until.getDate() + parseInt(banDays))

    const { error } = await supabase.from('profiles').update({
      status: 'temp_banned',
      ban_reason: actionReason,
      ban_until: until.toISOString()
    }).eq('id', userId)

    if (error) setMessage(`ERROR: ${error.message}`)
    else {
      setMessage(`User temporarily banned for ${banDays} days.`)
      setSelectedUser(null)
      setActionReason('')
      fetchData()
    }
  }

  async function permBanUser(userId: string) {
    if (!actionReason) return alert('Please enter a reason for the permanent ban.')
    if (!confirm('Are you sure you want to PERMANENTLY ban this user?')) return

    const { error } = await supabase.from('profiles').update({
      status: 'perm_banned',
      ban_reason: actionReason,
      ban_until: null
    }).eq('id', userId)

    if (error) setMessage(`ERROR: ${error.message}`)
    else {
      setMessage(`User PERMANENTLY banned.`)
      setSelectedUser(null)
      setActionReason('')
      fetchData()
    }
  }

  async function liftBan(userId: string) {
    const { error } = await supabase.from('profiles').update({
      status: 'active',
      ban_reason: null,
      ban_until: null
    }).eq('id', userId)

    if (error) setMessage(`ERROR: ${error.message}`)
    else {
      setMessage(`User ban/warning status cleared.`)
      fetchData()
    }
  }

  // Filter users by search input (Includes Display Name, Email, Username, ID, Role)
  const filteredProfiles = profiles.filter((p) => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) return true

    return (
      (p.display_name && p.display_name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.username && p.username.toLowerCase().includes(query)) ||
      (p.id && p.id.toLowerCase().includes(query)) ||
      (p.role && p.role.toLowerCase().includes(query))
    )
  })

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
          <p className="text-xs text-neutral-400">Manage user search, roles, warnings/bans, builds, and mods.</p>
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
          👥 User List & Bans ({profiles.length})
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

      {/* TAB 1: SEARCHABLE USER DIRECTORY & BAN CONTROLS */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-sm font-bold uppercase text-yellow-400">[ SEARCH USERS & MANAGE ROLES / BANS ]</h2>
            <input
              type="text"
              placeholder="🔍 Search Display Name, Email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 bg-neutral-900 border-2 border-white text-xs text-white w-full sm:w-72 outline-none focus:border-yellow-400"
            />
          </div>

          {/* User List Table */}
          <div className="overflow-x-auto border-2 border-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 border-b-2 border-white text-neutral-300">
                <tr>
                  <th className="p-3">USER / DISPLAY NAME</th>
                  <th className="p-3">ROLE</th>
                  <th className="p-3">STATUS / WARNINGS</th>
                  <th className="p-3 text-right">MODERATION ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-900">
                      <td className="p-3 font-bold truncate max-w-[220px]">
                        <div className="text-sm text-yellow-400">{p.display_name || p.username || 'No Name'}</div>
                        <div className="text-[11px] font-normal text-neutral-300">{p.email || 'No email stored'}</div>
                        <div className="text-[9px] font-normal text-neutral-500 truncate">{p.id}</div>
                      </td>
                      <td className="p-3">
                        <select
                          value={p.role || 'user'}
                          onChange={(e) => updateUserRole(p.id, e.target.value)}
                          className="bg-black border border-white text-white p-1 text-[11px] font-mono outline-none cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="tester">Tester</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        {p.status === 'perm_banned' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white uppercase">PERM BANNED</span>
                        ) : p.status === 'temp_banned' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500 text-black uppercase">
                            TEMP BAN ({p.ban_until ? new Date(p.ban_until).toLocaleDateString() : 'Active'})
                          </span>
                        ) : p.status === 'warned' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-black uppercase">
                            WARNED ({p.warning_count || 1})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-black uppercase">ACTIVE</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {p.status && p.status !== 'active' ? (
                          <button
                            onClick={() => liftBan(p.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase"
                          >
                            UNBAN / CLEAR
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedUser(p)}
                            className="px-2 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-bold uppercase"
                          >
                            WARN / BAN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-400 uppercase italic">
                      [ NO USERS FOUND MATCHING YOUR SEARCH ]
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ban/Warn Action Box */}
          {selectedUser && (
            <div className="p-4 border-2 border-red-500 bg-neutral-950 space-y-3">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <h3 className="text-xs font-bold uppercase text-red-500">
                  MODERATE USER: {selectedUser.display_name || selectedUser.email || selectedUser.id}
                </h3>
                <button onClick={() => setSelectedUser(null)} className="text-xs text-neutral-400 hover:text-white">[ CANCEL ]</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Reason for Action:</label>
                <input
                  type="text"
                  placeholder="e.g. Violation of forum rules, spamming, toxic behavior..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-2 bg-black border border-white text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => warnUser(selectedUser.id)}
                  className="px-3 py-2 bg-yellow-400 text-black text-xs font-bold uppercase hover:bg-yellow-300"
                >
                  ⚠️ Issue Warning
                </button>

                <div className="flex items-center gap-1 bg-black border border-white px-2">
                  <select
                    value={banDays}
                    onChange={(e) => setBanDays(e.target.value)}
                    className="bg-black text-xs text-white font-mono outline-none"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                  <button
                    onClick={() => tempBanUser(selectedUser.id)}
                    className="px-2 py-1 bg-orange-500 text-black text-xs font-bold uppercase hover:bg-orange-400"
                  >
                    ⏳ Temp Ban
                  </button>
                </div>

                <button
                  onClick={() => permBanUser(selectedUser.id)}
                  className="px-3 py-2 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-500"
                >
                  🚫 Perm Ban
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: GAME BUILDS MANAGEMENT */}
      {activeTab === 'builds' && (
        <section className="space-y-6">
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