import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ctrkdpeqiwxkvvwymipi.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cmtkcGVxaXd4a3Z2d3ltaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNjQsImV4cCI6MjA3NDE0NDM2NH0.TC8ZqqF9EIR7oHg26qDOSSvZKj5IDCma8Ti8d6tqFMQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase