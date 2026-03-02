import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'
import { redirect } from 'next/navigation'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data as Profile | null
}

export async function requireCustomer() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  return profile
}

export async function requireCleaner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: cleaner } = await supabase.from('cleaners').select('*, profile:profiles(*)').eq('profile_id', user.id).single()
  if (!cleaner) redirect('/provider/onboarding')
  return cleaner
}

export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') redirect('/')
  return profile
}
