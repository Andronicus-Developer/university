import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: stu, error: stuErr } = await supabase.from('students').select('*, profile:profile_id(*), programme:programme_id(*)');
  console.log('Students count:', stu?.length, 'error:', stuErr);
  if (stu && stu.length > 0) {
    console.log('Sample student:', {
      id: stu[0].id,
      student_number: stu[0].student_number,
      profile: stu[0].profile?.full_name,
      programme: stu[0].programme?.name
    });
  }

  const { data: enrols } = await supabase.from('course_enrolments').select('*, course:course_id(*)');
  console.log('Enrolments:', enrols);

  const { data: marks } = await supabase.from('assessment_marks').select('*');
  console.log('Marks count:', marks?.length);

  const { data: inv } = await supabase.from('student_invoices').select('*');
  console.log('Invoices count:', inv?.length);

  const { data: pays } = await supabase.from('payments').select('*');
  console.log('Payments count:', pays?.length);

  const { data: recs } = await supabase.from('receipts').select('*');
  console.log('Receipts count:', recs?.length);

  const { data: sch } = await supabase.from('scholarships').select('*');
  console.log('Scholarships count:', sch?.length);

  const { data: loans } = await supabase.from('loans').select('*');
  console.log('Loans count:', loans?.length);

  const { data: alloc } = await supabase.from('allocations').select('*');
  console.log('Allocations count:', alloc?.length);

  const { data: reqs } = await supabase.from('service_requests').select('*');
  console.log('Service requests count:', reqs?.length);

  const { data: docs } = await supabase.from('generated_documents').select('*');
  console.log('Documents count:', docs?.length);

  const { data: supports } = await supabase.from('support_cases').select('*');
  console.log('Support cases count:', supports?.length);

  const { data: notifs } = await supabase.from('notifications').select('*');
  console.log('Notifications count:', notifs?.length);
}
check();

