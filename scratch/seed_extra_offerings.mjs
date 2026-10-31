import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedOfferings() {
  const { data: dept } = await supabase.from('departments').select('id').limit(1).single();
  const deptId = dept.id;

  const { data: term } = await supabase.from('terms').select('*').limit(1).single();
  const termId = term.id;

  const coursesToAdd = [
    {
      code: 'CS104',
      name: 'Discrete Mathematics and Logic',
      description: 'Set theory, predicate logic, recurrence relations, and graph algorithms.',
      credits: 3,
      contact_hours: 3,
      course_type: 'core',
      department_id: deptId,
      is_active: true
    },
    {
      code: 'CS106',
      name: 'Computer Organization & Architecture',
      description: 'Von Neumann machine architecture, assembly language, memory hierarchy and ALU design.',
      credits: 3,
      contact_hours: 4,
      course_type: 'core',
      department_id: deptId,
      is_active: true
    }
  ];

  for (const c of coursesToAdd) {
    const { data: existing } = await supabase.from('courses').select('id').eq('code', c.code).maybeSingle();
    if (!existing) {
      await supabase.from('courses').insert(c);
    }
  }

  const { data: allCourses } = await supabase.from('courses').select('*');

  for (const c of allCourses || []) {
    const { data: existingOff } = await supabase.from('course_offerings').select('id').eq('course_id', c.id).eq('term_id', termId).maybeSingle();
    if (!existingOff) {
      const { data: newOff, error: offErr } = await supabase.from('course_offerings').insert({
        course_id: c.id,
        term_id: termId,
        section: 'A',
        status: 'published',
        capacity: 60,
        enrolled_count: 0,
        delivery_mode: 'in-person'
      }).select().single();
      console.log(`Created offering for ${c.code}:`, newOff?.id, offErr);
    }
  }

  const { data: finalOffs } = await supabase.from('course_offerings').select('id, course:course_id(code, name)');
  console.log('Final Offerings:', finalOffs);
}
seedOfferings();
