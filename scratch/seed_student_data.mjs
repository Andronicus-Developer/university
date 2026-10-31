import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seed() {
  console.log('--- Starting Student Data Seeding ---');

  // 1. Get Student and Term details
  const { data: students } = await supabase.from('students').select('*').limit(1);
  if (!students || students.length === 0) {
    console.error('No students found!');
    return;
  }
  const student = students[0];
  const studentId = student.id;
  const profileId = student.profile_id;

  const { data: terms } = await supabase.from('terms').select('*').limit(1);
  const termId = terms && terms.length > 0 ? terms[0].id : null;
  const academicYearId = terms && terms.length > 0 ? terms[0].academic_year_id : null;

  console.log('Target student:', { studentId, profileId, termId });

  // Update student GPA and credits
  await supabase.from('students').update({
    current_level: 100,
    gpa: 3.82,
    cgpa: 3.84,
    total_credits_earned: 36
  }).eq('id', studentId);
  console.log('Updated student stats (GPA: 3.82, CGPA: 3.84, Credits: 36)');

  // 2. Assessment Marks
  const { data: enrolments } = await supabase.from('course_enrolments').select('*').eq('student_id', studentId);
  const { data: comps } = await supabase.from('assessment_components').select('*');

  if (enrolments && comps) {
    for (const enr of enrolments) {
      const enrComps = comps.filter(c => c.course_offering_id === enr.course_offering_id);
      for (const comp of enrComps) {
        if (comp.component_type === 'quiz' || comp.component_type === 'midterm') {
          const score = comp.component_type === 'quiz' ? 28.5 : 46.0;
          await supabase.from('assessment_marks').upsert({
            assessment_component_id: comp.id,
            enrolment_id: enr.id,
            marks_obtained: score,
            is_absent: false,
            remarks: 'Strong analytical reasoning demonstrated.'
          }, { onConflict: 'assessment_component_id,enrolment_id' });
        }
      }

      // Add published results
      await supabase.from('published_results').upsert({
        enrolment_id: enr.id,
        total_marks: 88.5,
        letter_grade: 'A',
        grade_points: 4.0,
        is_published: true
      }, { onConflict: 'enrolment_id' });
    }
    console.log('Seeded assessment marks and published results');
  }

  // 3. Fee items
  const feeItemsData = [
    { code: 'TUITION_UG', name: 'Undergraduate Tuition Fee - Science & Computing', default_amount: 1200.00 },
    { code: 'COMP_LAB', name: 'Computing Lab & Cloud Infrastructure Levy', default_amount: 150.00 },
    { code: 'SRC_DUES', name: 'Student Representative Council Dues', default_amount: 50.00 },
    { code: 'HEALTH_INS', name: 'Campus Clinic & Health Insurance', default_amount: 50.00 }
  ];

  for (const fi of feeItemsData) {
    await supabase.from('fee_items').upsert(fi, { onConflict: 'code' });
  }

  const { data: allFeeItems } = await supabase.from('fee_items').select('*');
  console.log('Fee items ready:', allFeeItems?.length);

  // 4. Student Invoice & Lines
  const { data: existingInv } = await supabase.from('student_invoices').select('id').eq('invoice_number', 'INV-2026-0001');
  let invoiceId = existingInv && existingInv.length > 0 ? existingInv[0].id : null;

  if (!invoiceId) {
    const { data: newInv, error: invErr } = await supabase.from('student_invoices').insert({
      student_id: studentId,
      term_id: termId,
      invoice_number: 'INV-2026-0001',
      total_amount: 1450.00,
      paid_amount: 1000.00,
      balance_amount: 450.00,
      currency: 'GHS',
      status: 'partially_paid',
      issue_date: '2026-09-01',
      due_date: '2026-11-30'
    }).select().single();

    if (newInv) {
      invoiceId = newInv.id;
      for (const fi of (allFeeItems || []).slice(0, 4)) {
        await supabase.from('invoice_lines').insert({
          invoice_id: invoiceId,
          fee_item_id: fi.id,
          description: fi.name,
          amount: fi.default_amount
        });
      }
    } else {
      console.error('Invoice creation err:', invErr);
    }
  }
  console.log('Invoice ready, ID:', invoiceId);

  // 5. Payment & Receipt
  const { data: existingPay } = await supabase.from('payments').select('id').eq('provider_reference', 'PST_2026_987654321');
  let paymentId = existingPay && existingPay.length > 0 ? existingPay[0].id : null;

  if (!paymentId) {
    const { data: newPay } = await supabase.from('payments').insert({
      student_id: studentId,
      amount: 1000.00,
      currency: 'GHS',
      provider: 'paystack',
      provider_reference: 'PST_2026_987654321',
      payment_method: 'Mobile Money (MTN MoMo)',
      status: 'successful'
    }).select().single();

    if (newPay) {
      paymentId = newPay.id;
      if (invoiceId) {
        await supabase.from('payment_allocations').upsert({
          payment_id: paymentId,
          invoice_id: invoiceId,
          allocated_amount: 1000.00
        }, { onConflict: 'payment_id,invoice_id' });
      }

      await supabase.from('receipts').upsert({
        payment_id: paymentId,
        receipt_number: 'REC20260001',
        student_id: studentId,
        amount: 1000.00,
        currency: 'GHS',
        receipt_data: {
          channel: 'MTN Mobile Money',
          student_name: 'Ama Johnson',
          programme: 'BSc Computer Science',
          narrative: 'First Semester 2026/2027 Academic Fees'
        }
      }, { onConflict: 'receipt_number' });
    }
  }
  console.log('Payment & Receipt ready, ID:', paymentId);

  // 6. Scholarships
  await supabase.from('scholarships').insert({
    student_id: studentId,
    name: 'Vice-Chancellor Academic Merit Scholarship',
    sponsor_name: 'University Scholarship Board & Alumni Endowment Fund',
    coverage_type: 'fixed_amount',
    max_amount: 500.00,
    effective_term_id: termId,
    is_active: true
  });
  console.log('Scholarship record seeded');

  // 7. Service Requests & Official Documents
  const { data: existingReq } = await supabase.from('service_requests').select('id').eq('student_id', studentId);
  if (!existingReq || existingReq.length === 0) {
    const { data: req } = await supabase.from('service_requests').insert({
      student_id: studentId,
      request_type: 'enrollment_letter',
      status: 'completed',
      fee_amount: 25.00,
      is_paid: true,
      details: {
        purpose: 'Visa / Embassy Application Verification',
        urgency: 'Standard'
      }
    }).select().single();

    if (req) {
      await supabase.from('generated_documents').insert({
        service_request_id: req.id,
        student_id: studentId,
        document_reference: 'DOC-2026-VER-0089',
        verification_code: 'VER-883921-GH',
        file_path: '/documents/official/Ama_Johnson_Enrollment_Letter.pdf',
        status: 'active'
      });
    }
  }
  console.log('Service request & Generated Document ready');

  // 8. Library Items & Loan
  const { data: libItems } = await supabase.from('library_items').select('*');
  let libItemId = libItems && libItems.length > 0 ? libItems[0].id : null;

  if (!libItemId) {
    const { data: newLib } = await supabase.from('library_items').insert({
      isbn: '978-0262046305',
      title: 'Introduction to Algorithms, Fourth Edition',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      publisher: 'MIT Press',
      publication_year: 2022,
      category: 'Computer Science & Software Engineering',
      call_number: 'QA76.6 .C662 2022'
    }).select().single();
    if (newLib) libItemId = newLib.id;
  }

  if (libItemId) {
    const { data: copies } = await supabase.from('item_copies').select('id').eq('library_item_id', libItemId);
    let copyId = copies && copies.length > 0 ? copies[0].id : null;

    if (!copyId) {
      const { data: newCopy } = await supabase.from('item_copies').insert({
        library_item_id: libItemId,
        barcode: 'BC-CS-2026-0042',
        copy_number: 1,
        status: 'on_loan',
        location: 'Balme Main Library - Level 2 Reserves'
      }).select().single();
      if (newCopy) copyId = newCopy.id;
    }

    if (copyId && profileId) {
      const { data: existingLoans } = await supabase.from('loans').select('id').eq('copy_id', copyId);
      if (!existingLoans || existingLoans.length === 0) {
        await supabase.from('loans').insert({
          copy_id: copyId,
          user_id: profileId,
          borrowed_at: '2026-10-15T10:00:00Z',
          due_date: '2026-11-15',
          status: 'borrowed'
        });
      }
    }
  }
  console.log('Library item & Loan ready');

  // 9. Hostel / Accommodation
  const { data: residences } = await supabase.from('residences').select('*');
  let resId = residences && residences.length > 0 ? residences[0].id : null;

  if (resId) {
    let { data: rooms } = await supabase.from('hostel_rooms').select('id').eq('residence_id', resId);
    let roomId = rooms && rooms.length > 0 ? rooms[0].id : null;

    if (!roomId) {
      const { data: newRoom } = await supabase.from('hostel_rooms').insert({
        residence_id: resId,
        room_number: 'B-204',
        floor_number: 2,
        room_type: 'Double Occupancy (En-suite)',
        max_occupancy: 2
      }).select().single();
      if (newRoom) roomId = newRoom.id;
    }

    if (roomId) {
      let { data: beds } = await supabase.from('beds').select('id').eq('hostel_room_id', roomId);
      let bedId = beds && beds.length > 0 ? beds[0].id : null;

      if (!bedId) {
        const { data: newBed } = await supabase.from('beds').insert({
          hostel_room_id: roomId,
          bed_number: 'Bed 1',
          is_available: false
        }).select().single();
        if (newBed) bedId = newBed.id;
      }

      if (bedId && termId) {
        const { data: existingAlloc } = await supabase.from('allocations').select('id').eq('student_id', studentId);
        if (!existingAlloc || existingAlloc.length === 0) {
          await supabase.from('allocations').insert({
            bed_id: bedId,
            student_id: studentId,
            term_id: termId,
            status: 'active',
            check_in_at: '2026-09-01T08:00:00Z'
          });
        }
      }
    }
  }
  console.log('Hostel residence, room & allocation ready');

  // 10. Student Notifications
  if (profileId) {
    const sampleNotifs = [
      {
        user_id: profileId,
        title: 'Tuition Payment Received',
        message: 'Payment of GHS 1,000.00 confirmed via Paystack. Official Receipt REC20260001 is ready for download.',
        type: 'finance',
        is_read: false
      },
      {
        user_id: profileId,
        title: 'Mid-Semester Exam Mark Published',
        message: 'Continuous Assessment and Midterm marks for CS102 and MATH101 have been entered and verified.',
        type: 'academic',
        is_read: false
      },
      {
        user_id: profileId,
        title: 'Library Book Loan Notice',
        message: 'Your borrowed book "Introduction to Algorithms, Fourth Edition" is due on 15 Nov 2026.',
        type: 'library',
        is_read: true
      }
    ];

    for (const n of sampleNotifs) {
      await supabase.from('notifications').insert(n);
    }
  }
  console.log('Student notifications seeded');
  console.log('--- ALL STUDENT DATA SEEDING COMPLETE ---');
}

seed();

