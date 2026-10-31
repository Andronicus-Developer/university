import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testDelete() {
  const { data: enrs } = await adminClient.from('course_enrolments')
    .select('id, student_id, course_offering:course_offering_id(course:course_id(code, name))');
  console.log('Current enrolments:', enrs);

  if (enrs && enrs.length > 2) {
    const toDrop = enrs[enrs.length - 1];
    console.log('Attempting to delete enrolment:', toDrop.id, toDrop.course_offering?.course?.code);
    const { data, error } = await adminClient.from('course_enrolments').delete().eq('id', toDrop.id).select();
    console.log('Delete result:', { data, error });
  }
}
testDelete();

