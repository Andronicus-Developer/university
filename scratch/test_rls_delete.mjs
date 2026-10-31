import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

// Client with anon key
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// Admin with service role key
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRls() {
  const { data: enrs } = await adminClient.from('course_enrolments').select('id, student_id');
  console.log('Enrolments in DB:', enrs);

  if (enrs && enrs.length > 0) {
    const testEnrId = enrs[0].id;
    // Try to delete with anon client (no auth)
    const { data: delAnon, error: errAnon } = await anonClient.from('course_enrolments').delete().eq('id', testEnrId).select();
    console.log('Anon delete result (data, error):', delAnon, errAnon);
  }
}
testRls();

