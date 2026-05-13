import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fjagazbjltrsrsxcgxxp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYWdhemJqbHRyc3JzeGNneHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTY3NDIsImV4cCI6MjA5NDAzMjc0Mn0.IgimknnMkDTIcnMZLsHGao3LjkzMm2yVwezSUmrDZI0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
