import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testDropAndEnroll() {
  const { data: student } = await supabase.from('students').select('id').limit(1).single();
  const studentId = student.id;

  const { data: term } = await supabase.from('terms').select('id').limit(1).single();
  const termId = term.id;

  // Find an offering for CS103
  const { data: offs } = await supabase.from('course_offerings')
    .select('id, course:course_id(code, name)')
    .eq('term_id', termId);

  const off = offs?.find(o => o.course?.code === 'CS103');

  console.log('Testing offering:', off);
  if (!off) return;

  // 1. Enroll
  const { data: enr, error: enrErr } = await supabase.from('course_enrolments').insert({
    student_id: studentId,
    course_offering_id: off.id,
    term_id: termId,
    enrolment_status: 'enrolled'
  }).select().single();
  console.log('1. Enrolled:', enr?.id || enrErr);

  // 2. Drop
  if (enr) {
    const { error: delErr } = await supabase.from('course_enrolments').delete().eq('id', enr.id);
    console.log('2. Dropped course:', delErr || 'SUCCESS');

    // 3. Immediately Re-enroll
    const { data: reEnr, error: reEnrErr } = await supabase.from('course_enrolments').insert({
      student_id: studentId,
      course_offering_id: off.id,
      term_id: termId,
      enrolment_status: 'enrolled'
    }).select().single();
    console.log('3. Immediate Re-enrolled:', reEnr?.id || reEnrErr);

    // Clean up
    if (reEnr) {
      await supabase.from('course_enrolments').delete().eq('id', reEnr.id);
      console.log('4. Cleaned up test enrollment');
    }
  }
}
testDropAndEnroll();
