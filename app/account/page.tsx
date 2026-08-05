'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../supabaseClient'
import Link from 'next/link'

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('id') // Optional query param: /account?id=USER_ID

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [viewedProfile, setViewedProfile] = useState<any>(null)

  // Profile Form States
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Admin section state
  const [allProfiles, setAllProfiles] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function loadAccountData() {
      setLoading(true)

      // 1. Get logged-in auth user
      const { data: { session } } = await supabase.auth.getSession()
      const loggedInUser = session?.user || null
      setCurrentUser(loggedInUser)

      let myProfileData = null
      if (loggedInUser) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', loggedInUser.id)
          .single()
        
        myProfileData = myProfile
        setCurrentUserProfile(myProfile)

        // If admin, fetch all profiles to manage tester roles
        if (myProfile?.role === 'admin') {
          const { data: users } = await supabase.from('profiles').select('*')
          setAllProfiles(users || [])
        }
      }

      // 2. Determine which profile to display
      const activeUserId = targetUserId || loggedInUser?.id

      if (!activeUserId) {
        // Not logged in and no user ID requested
        router.push('/login')
        return
      }

      // 3. Fetch the targeted user's profile row from 'profiles' table
      const { data: profileToView } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .single()

      if (profileToView) {
        setViewedProfile(profileToView)
        setDisplayName(profileToView.display_name || loggedInUser?.user_metadata?.display_name || '')
        setAvatarUrl(profileToView.avatar_url || loggedInUser?.user_metadata?.avatar_url || '')
      } else if (loggedInUser && activeUserId === loggedInUser.id) {
        // Fallback for logged-in user if profile row is missing
        const fallback = {
          id: loggedInUser.id,
          email: loggedInUser.email,
          role: myProfileData?.role || 'user',
          display_name: loggedInUser.user_metadata?.display_name || '',
          avatar_url: loggedInUser.user_metadata?.avatar_url || '/nopfp.png',
        }
        setViewedProfile(fallback)
        setDisplayName(fallback.display_name)
        setAvatarUrl(fallback.avatar_url)
      }

      setLoading(false)
    }

    loadAccountData()
  }, [targetUserId, supabase, router])

  // Flag to check if viewing own profile
  const isOwnProfile = Boolean(
    currentUser && viewedProfile && currentUser.id === viewedProfile.id
  )

  // Save profile edits (Self only)
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!isOwnProfile || !currentUser) return

    setSaving(true)
    setMessage('SAVING CHANGES...')

    const finalAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : '/nopfp.png'

    // A. Update Supabase Auth User Metadata & Password
    const authUpdates: any = {
      data: {
        display_name: displayName,
        avatar_url: finalAvatar,
      },
    }

    if (newPassword.trim().length > 0) {
      authUpdates.password = newPassword
    }

    const { error: authError } = await supabase.auth.updateUser(authUpdates)

    if (authError) {
      setSaving(false)
      setMessage(`ERROR: ${authError.message}`)
      return
    }

    // B. Sync update to 'profiles' DB table for public reads
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        avatar_url: finalAvatar,
      })
      .eq('id', currentUser.id)

    setSaving(false)

    if (dbError) {
      setMessage(`AUTH UPDATED, BUT DB SYNC ERROR: ${dbError.message}`)
    } else {
      setMessage('PROFILE UPDATED SUCCESSFULLY!')
      setNewPassword('')
      // Update local viewed profile state
      setViewedProfile((prev: any) => ({
        ...prev,
        display_name: displayName,
        avatar_url: finalAvatar,
      }))
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function toggleTesterRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'tester' ? 'user' : 'tester'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setAllProfiles(allProfiles.map(p => p.id === userId ? { ...p, role: newRole } : p))
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto my-12 p-8 border-4 border-white bg-black text-white font-mono text-center shadow-[8px_8px_0px_0px_#ffffff]">
        <p className="animate-pulse text-xs font-bold uppercase">[ LOADING ACCOUNT DATA... ]</p>
      </main>
    )
  }

  if (!viewedProfile) {
    return (
      <main className="max-w-2xl mx-auto my-12 p-8 border-4 border-red-500 bg-black text-white font-mono text-center shadow-[8px_8px_0px_0px_#ffffff]">
        <p className="text-red-500 font-bold text-sm uppercase mb-4">[ USER PROFILE NOT FOUND ]</p>
        <Link href="/" className="text-xs uppercase underline hover:text-neutral-300">
          &lt; Return to Home
        </Link>
      </main>
    )
  }

  const currentAvatar = (viewedProfile.avatar_url && viewedProfile.avatar_url.trim() !== '') 
    ? viewedProfile.avatar_url.trim() 
    : '/nopfp.png'

  return (
    <main className="max-w-2xl mx-auto my-8 p-6 border-4 border-white bg-black text-white font-mono shadow-[8px_8px_0px_0px_#ffffff] space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center border-b-4 border-white pb-4">
        <h1 className="text-xl font-black uppercase">
          {isOwnProfile ? '[ MY ACCOUNT PROFILE ]' : `[ USER PROFILE: ${viewedProfile.display_name || 'USER'} ]`}
        </h1>
        {isOwnProfile && (
          <button 
            onClick={handleSignOut}
            type="button"
            className="px-3 py-1 bg-red-600 text-white font-bold text-xs uppercase border border-white hover:bg-red-500"
          >
            Sign Out
          </button>
        )}
      </div>

      {/* USER CARD OVERVIEW */}
      <div className="flex items-center gap-4 p-4 border-2 border-white bg-neutral-950">
        <img 
          src={currentAvatar} 
          alt="Avatar Preview" 
          className="w-16 h-16 border-2 border-white bg-black object-cover shrink-0"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
        />
        <div className="space-y-1">
          <h2 className="text-base font-bold uppercase text-yellow-400">
            {viewedProfile.display_name || 'NO DISPLAY NAME'}
          </h2>
          <p className="text-xs text-neutral-400">EMAIL: {viewedProfile.email || 'N/A'}</p>
          <div className="flex gap-2 items-center text-[10px] uppercase font-bold pt-1">
            <span className="px-2 py-0.5 border border-white bg-neutral-800 text-emerald-400">
              ROLE: {viewedProfile.role || 'user'}
            </span>
            {viewedProfile.status && (
              <span className={`px-2 py-0.5 border border-white ${viewedProfile.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                STATUS: {viewedProfile.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONDITIONAL CONTENT: EDIT MODE (OWN PROFILE) vs READ-ONLY MODE (OTHER PROFILE) */}
      {isOwnProfile ? (
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <h2 className="text-xs font-bold text-yellow-400 uppercase">[ EDIT MY PROFILE DATA ]</h2>
          
          <div>
            <label className="block text-xs uppercase font-bold mb-1">[ Display Name ]</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold mb-1">[ Profile Picture URL ]</label>
            <input
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
            />
            <p className="text-[10px] text-neutral-400 mt-1">* Leave empty to use default profile image (`/nopfp.png`).</p>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold mb-1">[ Change Password (Optional) ]</label>
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 bg-black border-2 border-white text-white font-mono text-xs outline-none focus:bg-neutral-900"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-white text-black font-black uppercase text-xs tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </form>
      ) : (
        <div className="p-4 border-2 border-dashed border-neutral-700 bg-neutral-950 text-center text-xs text-neutral-400 uppercase space-y-2">
          <p>🔒 VIEWING PUBLIC PROFILE DATA.</p>
          <p className="text-[10px] text-neutral-500">Editing options are disabled when inspecting other accounts.</p>
        </div>
      )}

      {message && (
        <div className="p-3 border-2 border-white bg-neutral-900 text-xs font-bold text-center uppercase">
          {message}
        </div>
      )}

      {/* ADMIN USER MANAGEMENT PANEL (ONLY SHOWN TO LOGGED-IN ADMINS) */}
      {currentUserProfile?.role === 'admin' && (
        <section className="pt-6 border-t-2 border-white space-y-4">
          <h2 className="text-sm font-bold text-yellow-400 uppercase">[ ADMIN USER MANAGEMENT ]</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {allProfiles.map((u) => (
              <div key={u.id} className="flex justify-between items-center p-3 border border-neutral-700 bg-neutral-900 text-xs">
                <div>
                  <span className="font-bold">{u.display_name || u.email || 'User'}</span>
                  <span className="text-neutral-400 text-[10px] block">{u.email} ({u.role})</span>
                </div>
                <div className="flex gap-2">
                  <Link 
                    href={`/account?id=${u.id}`}
                    className="px-2 py-1 border border-white bg-black text-[10px] font-bold uppercase hover:bg-neutral-800"
                  >
                    View
                  </Link>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleTesterRole(u.id, u.role)}
                      className="px-2 py-1 bg-white text-black text-[10px] font-bold uppercase hover:bg-neutral-300"
                    >
                      {u.role === 'tester' ? 'REVOKE TESTER' : 'GIVE TESTER'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white font-mono text-center text-xs uppercase">[ LOADING... ]</div>}>
      <AccountContent />
    </Suspense>
  )
}