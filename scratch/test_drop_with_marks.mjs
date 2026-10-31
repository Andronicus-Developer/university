import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testDropWithMarks() {
  const cs102EnrId = 'e3791473-083d-4137-aa4c-fd4139f9a1c9';
  console.log('Testing drop on CS102 (has assessment marks)...');

  // Check if it can be dropped cleanly
  // Note: in a transaction or test, let's see if delete triggers any foreign key error
  const { data: marks } = await adminClient.from('assessment_marks').select('id').eq('enrolment_id', cs102EnrId);
  console.log('CS102 marks count:', marks?.length);

  const { data: pubRes } = await adminClient.from('published_results').select('id').eq('enrolment_id', cs102EnrId);
  console.log('CS102 published results count:', pubRes?.length);
}
testDropWithMarks();

