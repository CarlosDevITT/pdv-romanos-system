// js/supabase.js - VERSÃO CORRIGIDA (CommonJS)
const { createClient } = supabase;

// Configuração do Supabase
const SUPABASE_URL = 'https://zgrevlntkgmonqxyhjww.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncmV2bG50a2dtb25xeHloand3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjMxNjksImV4cCI6MjA3NjY5OTE2OX0.9svTC7fzUWgZXOraUcNOifl5XggZfvwwzEWHanN2aP0';

// Cria e exporta o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Torna disponível globalmente
window.supabaseClient = supabaseClient;