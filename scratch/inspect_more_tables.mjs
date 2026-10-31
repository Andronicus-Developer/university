import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
  const tables = [
    'assessment_marks',
    'student_invoices',
    'invoice_lines',
    'payments',
    'receipts',
    'scholarships',
    'service_requests',
    'generated_documents',
    'library_items',
    'item_copies',
    'loans',
    'residences',
    'hostel_rooms',
    'beds',
    'accommodation_applications',
    'allocations',
    'notifications',
    'support_cases',
    'announcements'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: ERROR ->`, error.message);
    } else {
      console.log(`Table ${t}: OK (columns: ${data && data.length > 0 ? Object.keys(data[0]).join(', ') : 'empty'})`);
    }
  }
}
inspect();

