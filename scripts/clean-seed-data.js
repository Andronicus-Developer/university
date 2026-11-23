const fs = require('fs');

// 1. Read data/ums-virtual-db.json up to valid JSON
const raw = fs.readFileSync('data/ums-virtual-db.json', 'utf8');
let db = null;
for (let i = raw.length - 1; i >= 0; i--) {
  if (raw[i] === '}') {
    try {
      db = JSON.parse(raw.substring(0, i + 1));
      break;
    } catch {}
  }
}

if (!db) {
  console.error('Could not parse ums-virtual-db.json');
  process.exit(1);
}

// 2. Empty all tenant-specific tables
const tenantTables = [
  'universities',
  'schools',
  'campuses',
  'faculties',
  'departments',
  'programmes',
  'academic_years',
  'terms',
  'courses',
  'course_offerings',
  'staff',
  'employment_records',
  'teaching_assignments',
  'students',
  'course_enrolments',
  'assessment_components',
  'assessment_marks',
  'published_results',
  'grade_scales',
  'grade_scale_items',
  'fee_items',
  'fee_schedules',
  'student_invoices',
  'invoice_lines',
  'payments',
  'receipts',
  'scholarships',
  'waivers',
  'refund_requests',
  'financial_approvals',
  'settlement_batches',
  'buildings',
  'rooms',
  'timetable_events',
  'class_sessions',
  'attendance_records',
  'leave_requests',
  'announcements',
  'notifications',
  'generated_documents',
  'service_requests',
  'residences',
  'hostel_rooms',
  'beds',
  'allocations',
  'library_items',
  'item_copies',
  'loans',
  'transport_routes',
  'transport_vehicles',
  'admission_cycles',
  'applications',
  'application_programmes',
  'communications',
  'scopes',
];

for (const t of tenantTables) {
  db[t] = [];
}

// Keep only Super Admin in profiles
const SUPERADMIN_ID = '1440ed7e-cb23-4248-a372-f38b20d01554';
db.profiles = [
  {
    id: SUPERADMIN_ID,
    email: 'superadmin@university.edu.gh',
    full_name: 'Master Super Administrator',
    phone: '+233 24 000 0001',
    role: 'superadmin',
    account_status: 'active',
    school_id: null,
    university_id: null,
    is_mfa_enabled: true,
    metadata: {
      role: 'superadmin',
      default_role: 'superadmin',
      school_id: null,
      university_id: null,
      university_name: 'UMS Central Platform',
    },
    created_at: '2026-11-05T08:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
];

db.user_role_assignments = [
  {
    user_id: SUPERADMIN_ID,
    role_id: '9ff88ff1-e423-4ba4-8b98-f7473c98eaea', // superadmin role id
    school_id: null,
    is_active: true,
    created_at: '2026-11-05T08:00:00.000Z',
  },
];

// Clean audit events from seed mentions
if (Array.isArray(db.audit_events)) {
  db.audit_events = db.audit_events.filter(a => {
    const s = JSON.stringify(a);
    return !(
      s.includes('Kumasi') ||
      s.includes('KTVI') ||
      s.includes('Achimota') ||
      s.includes('ASHS') ||
      s.includes('Accra Institute') ||
      s.includes('AIT') ||
      s.includes('Lofa')
    );
  });
}

// Reset system settings
if (Array.isArray(db.system_settings)) {
  db.system_settings = db.system_settings.map(s => {
    if (s.setting_key === 'deleted_universities') {
      return { ...s, setting_value: [] };
    }
    if (s.setting_key === 'deleted_users') {
      return { ...s, setting_value: [] };
    }
    if (s.setting_key === 'superadmin_universities') {
      return { ...s, setting_value: [] };
    }
    if (s.setting_key === 'superadmin_scopes') {
      return { ...s, setting_value: [] };
    }
    if (s.setting_key === 'superadmin_communications') {
      return { ...s, setting_value: [] };
    }
    if (s.setting_key === 'institution_info') {
      return {
        ...s,
        setting_value: {
          name: '',
          short_name: '',
          abbreviation: '',
          motto: '',
          email: '',
          support_email: '',
          phone: '',
          alt_phone: '',
          website: '',
          address: '',
          city: '',
          region: '',
          country: '',
          postal_code: '',
          currency: 'USD',
          currency_symbol: '$',
          established_year: 2026,
          accreditation_code: '',
          logo_url: '',
          seal_url: '',
        },
      };
    }
    return s;
  });
}

// Write cleanly formatted JSON
fs.writeFileSync('data/ums-virtual-db.json', JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully cleaned data/ums-virtual-db.json');
