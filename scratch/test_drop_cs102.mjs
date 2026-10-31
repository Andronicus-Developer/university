import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testDropCs102() {
  const cs102EnrId = 'e3791473-083d-4137-aa4c-fd4139f9a1c9';
  console.log('Testing delete on CS102 with CASCADE...');

  // Delete
  const { data: del, error: delErr } = await adminClient.from('course_enrolments').delete().eq('id', cs102EnrId).select();
  console.log('Delete CS102 result:', del, delErr);

  if (del && del.length > 0) {
    // Re-insert with the exact same ID so we don't break existing seed
    const oldRow = del[0];
    const { data: ins, error: insErr } = await adminClient.from('course_enrolments').insert(oldRow).select();
    console.log('Re-inserted CS102:', ins, insErr);
  }
}
testDropCs102();

