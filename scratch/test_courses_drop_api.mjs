import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testEndpointLogic() {
  const { data: student } = await adminClient.from('students').select('id').limit(1).single();
  const studentId = student.id;

  const { data: term } = await adminClient.from('terms').select('id').limit(1).single();
  const termId = term.id;

  const { data: offs } = await adminClient.from('course_offerings').select('id, course:course_id(code, name)');
  const cs103 = offs.find(o => o.course.code === 'CS103');
  console.log('CS103 offering:', cs103);

  // 1. Enroll CS103 with termId
  const { data: enr, error: enrErr } = await adminClient.from('course_enrolments').insert({
    student_id: studentId,
    course_offering_id: cs103.id,
    term_id: termId,
    enrolment_status: 'enrolled'
  }).select().single();
  console.log('Enrolled CS103:', enr?.id, enrErr);

  if (enr) {
    // 2. Drop
    let deleteQuery = adminClient.from("course_enrolments").delete().eq("id", enr.id);
    const { data: deleted, error: delError } = await deleteQuery.select();
    console.log('Deleted result:', deleted, delError);
  }
}
testEndpointLogic();
