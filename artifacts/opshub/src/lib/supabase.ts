import { createClient } from '@supabase/supabase-js'
import { setAuthTokenGetter } from '@workspace/api-client-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
})
