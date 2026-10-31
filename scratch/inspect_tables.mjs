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
  const { data: ce, error: ceErr } = await supabase.from('course_enrolments').select('*');
  console.log('course_enrolments:', ce, 'err:', ceErr);

  const { data: courses, error: cErr } = await supabase.from('courses').select('*');
  console.log('courses:', courses, 'err:', cErr);

  const { data: semesters, error: sErr } = await supabase.from('semesters').select('*');
  console.log('semesters:', semesters, 'err:', sErr);

  const { data: comps, error: compErr } = await supabase.from('assessment_components').select('*');
  console.log('assessment_components:', comps, 'err:', compErr);

  const { data: tt, error: ttErr } = await supabase.from('timetable_events').select('*');
  console.log('timetable_events:', tt, 'err:', ttErr);

  const { data: cs, error: csErr } = await supabase.from('class_sessions').select('*');
  console.log('class_sessions:', cs, 'err:', csErr);

  const { data: att, error: attErr } = await supabase.from('attendance_records').select('*');
  console.log('attendance_records:', att, 'err:', attErr);
}
inspect();

