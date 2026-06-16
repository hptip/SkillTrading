const { createClient } = require('@supabase/supabase-js');

// Treat placeholder values as unset so the app falls back to local uploads
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_KEY || '';
const looksLikePlaceholder = (v) => !v || /(your-project-id|supabase-service-role-key|YOUR_|example)/i.test(v);

if (looksLikePlaceholder(url) || looksLikePlaceholder(key)) {
  console.warn('Supabase credentials not set or contain placeholders; uploads will use local storage.');
  module.exports = null;
} else {
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  module.exports = supabase;
}
