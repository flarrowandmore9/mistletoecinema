import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvjahcvzfdeybvceybta.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2amFoY3Z6ZmRleWJ2Y2V5YnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NTgyODcsImV4cCI6MjEwOTUzNDI4N30.JJHpFu4Ez1fMMCIWSmzgNT4_Ke-yKphGw6eu1yXQ_Sc';
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY);