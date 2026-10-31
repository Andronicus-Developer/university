import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function addPolicy() {
  const sql = `
    DROP POLICY IF EXISTS "enrolments_delete" ON public.course_enrolments;
    CREATE POLICY "enrolments_delete" ON public.course_enrolments FOR DELETE TO authenticated USING (true);
  `;

  // We can execute via RPC or pg if available, or test if rpc('exec_sql') exists
  const { data, error } = await adminClient.rpc('exec_sql', { query: sql });
  console.log('Exec SQL result:', { data, error });
}
addPolicy();

