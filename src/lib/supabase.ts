import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL || 'https://yodtnppcsmyeymbnmvsu.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-3AWyMVXqorNfmZoBDmKnA_ZWGXBe0O'
export const supabase = createClient(url, key)
export function database() {
  return supabase
}

export async function trackView(postId: string) {
  try {
    let visitor = sessionStorage.getItem('abp-visit')
    if (!visitor) { visitor = crypto.randomUUID(); sessionStorage.setItem('abp-visit', visitor) }
    const key = `abp-read-${postId}-${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(key)) return
    const { error } = await database().rpc('record_post_view', { post_id: postId, visitor_id: visitor })
    if (!error) sessionStorage.setItem(key, '1')
  } catch { /* Reading remains available when analytics or browser storage is blocked. */ }
}
