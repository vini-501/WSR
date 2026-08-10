import { createClient } from '@supabase/supabase-js'
import { setAuthTokenGetter } from '@workspace/api-client-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mwcyapbaedfsjmetnauf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Y3lhcGJhZWRmc2ptZXRuYXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDA5NjMsImV4cCI6MjEwMDAxNjk2M30.X7OznX9olZ9RDiL7L6dW9GN8L5EjEUZeDW9S9C4pvao'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
})
