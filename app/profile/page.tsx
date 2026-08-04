'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabaseClient'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        setDisplayName(session.user.user_metadata?.display_name || '')
        setAvatarUrl(session.user.user_metadata?.avatar_url || '')
      }
    }
    loadUser()
  }, [router, supabase])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('SAVING CHANGES...')

    const finalAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : '/nopfp.png'

    const updates: any = {
      data: {
        display_name: displayName,
        avatar_url: finalAvatar,
      },
    }

    if (newPassword.trim().length > 0) {
      updates.password = newPassword
    }

    const { error } = await supabase.auth.updateUser(updates)

    setLoading(false)

    if (error) {
      setMessage(`ERROR: ${error.message}`)
    } else {
      setMessage('PROFILE UPDATED SUCCESSFULLY!')
      setNewPassword('')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return <div className="p-8 text-center font-bold text-xs uppercase">LOADING PROFILE...</div>
  }

  const currentAvatar = avatarUrl.trim() !== '' ? avatarUrl.trim() : '/nopfp.png'

  return (
    <main className="max-w-xl mx-auto my-8 border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#ffffff]">
      <div className="flex justify-between items-center border-b-2 border-white pb-4 mb-6">
        <h1 className="text-xl font-black uppercase">[ USER PROFILE SETTINGS ]</h1>
        <button 
          onClick={handleSignOut}
          type="button"
          className="px-3 py-1 bg-red-600 text-white font-bold text-xs uppercase border border-white hover:bg-red-500"
        >
          Sign Out
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 border-2 border-white bg-neutral-950">
        <img 
          src={currentAvatar} 
          alt="Avatar Preview" 
          className="w-16 h-16 border-2 border-white bg-black object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).src = '/nopfp.png' }}
        />
        <div>
          <p className="text-sm font-bold uppercase">{displayName || 'NO NAME SET'}</p>
          <p className="text-xs text-neutral-400">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Display Name ]</label>
          <input
            type="text"
            value={displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            required
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Profile Picture URL ]</label>
          <input
            type="url"
            placeholder="https://..."
            value={avatarUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvatarUrl(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
          />
          <p className="text-[10px] text-neutral-400 mt-1">* Leave empty to use default profile image (`/nopfp.png`).</p>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold mb-1">[ Change Password (Optional) ]</label>
          <input
            type="password"
            placeholder="Leave blank to keep current password"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            className="w-full p-2 bg-black border-2 border-white text-white font-mono outline-none focus:bg-neutral-900"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black font-black uppercase tracking-wider border-2 border-white hover:bg-neutral-300 disabled:opacity-50"
        >
          {loading ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 border-2 border-white bg-neutral-900 text-xs font-bold text-center uppercase">
          {message}
        </div>
      )}
    </main>
  )
}