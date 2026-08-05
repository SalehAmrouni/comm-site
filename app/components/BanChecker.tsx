'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '../supabaseClient'

export default function BanChecker({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dismissedWarning, setDismissedWarning] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkUserBanStatus()
  }, [])

  async function checkUserBanStatus() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setLoading(false)
      return
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (userProfile) {
      // AUTO-UNBAN CHECK FOR TEMP BANS:
      if (userProfile.status === 'temp_banned' && userProfile.ban_until) {
        const banExpiration = new Date(userProfile.ban_until).getTime()
        const now = new Date().getTime()

        if (now >= banExpiration) {
          // Ban has expired -> Auto-restore to active
          await supabase.from('profiles').update({
            status: 'active',
            ban_reason: null,
            ban_until: null
          }).eq('id', session.user.id)

          userProfile.status = 'active'
        }
      }

      setProfile(userProfile)
    }

    setLoading(false)
  }

  // Acknowledge Warning Function
  async function acknowledgeWarning() {
    if (!profile) return
    await supabase.from('profiles').update({
      status: 'active',
      warning_reason: null
    }).eq('id', profile.id)

    setDismissedWarning(true)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <>{children}</>

  // --- 1. FULL SCREEN BLOCK FOR TEMP OR PERM BANS ---
  if (profile?.status === 'perm_banned' || profile?.status === 'temp_banned') {
    const isTemp = profile.status === 'temp_banned'
    const banUntilFormatted = profile.ban_until 
      ? new Date(profile.ban_until).toLocaleString() 
      : 'Indefinite'

    return (
      <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 font-mono text-white">
        <div className="max-w-lg w-full p-8 border-4 border-red-600 bg-black shadow-[12px_12px_0px_0px_#dc2626] space-y-6 text-center">
          
          <div className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-black uppercase">
            {isTemp ? '⏳ ACCOUNT SUSPENDED (TEMP BAN)' : '🚫 ACCOUNT BANNED (PERMANENT)'}
          </div>

          <h1 className="text-2xl font-black uppercase text-red-500">
            [ ACCESS RESTRICTED ]
          </h1>

          <div className="p-4 border-2 border-red-800 bg-red-950/40 text-left space-y-3 text-xs">
            <div>
              <span className="text-neutral-400 block font-bold uppercase">[ REASON FOR BAN ]</span>
              <p className="text-white font-bold text-sm mt-0.5">
                "{profile.ban_reason || 'Violation of community guidelines.'}"
              </p>
            </div>

            {isTemp && (
              <div className="border-t border-red-900 pt-2">
                <span className="text-neutral-400 block font-bold uppercase">[ BAN EXPIRES ON ]</span>
                <p className="text-yellow-400 font-bold">{banUntilFormatted}</p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 uppercase">
            If you believe this was an error, contact an administrator.
          </p>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase border-2 border-white"
          >
            SIGN OUT OF ACCOUNT
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* --- 2. TOP WARNING BANNER FOR WARNED USERS --- */}
      {profile?.status === 'warned' && !dismissedWarning && (
        <div className="bg-yellow-400 text-black p-4 border-b-4 border-white font-mono sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs">
              <span className="font-black uppercase bg-black text-yellow-400 px-2 py-0.5 mr-2">
                ⚠️ OFFICIAL WARNING #{profile.warning_count || 1}
              </span>
              <strong className="uppercase">Reason:</strong> {profile.warning_reason || 'Unspecified rule violation.'}
            </div>
            <button
              onClick={acknowledgeWarning}
              className="px-3 py-1 bg-black text-white hover:bg-neutral-800 text-xs font-bold uppercase shrink-0 border border-black"
            >
              [ I ACKNOWLEDGE THIS WARNING ]
            </button>
          </div>
        </div>
      )}

      {/* Render rest of the website normal content */}
      {children}
    </>
  )
}