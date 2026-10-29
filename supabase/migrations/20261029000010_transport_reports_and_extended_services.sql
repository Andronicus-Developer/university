-- ==============================================================================
-- 000010_transport_reports_and_extended_services.sql
-- University Management System: Transport Fleet, Institutional Reports, and Routines
-- ==============================================================================

-- 1. Transport Routes Table
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name TEXT NOT NULL,
    route_code TEXT NOT NULL UNIQUE,
    departure_location TEXT NOT NULL,
    arrival_location TEXT NOT NULL,
    departure_time TIME NOT NULL DEFAULT '07:30:00',
    stops JSONB DEFAULT '[]'::jsonb,
    fare_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transport_routes_code ON public.transport_routes(route_code);
CREATE INDEX IF NOT EXISTS idx_transport_routes_active ON public.transport_routes(is_active);

-- 2. Transport Vehicles / Buses Table
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL DEFAULT 'Toyota Coaster',
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    route_id UUID REFERENCES public.transport_routes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_maintenance', 'out_of_service')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transport_vehicles_route ON public.transport_vehicles(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_bus ON public.transport_vehicles(bus_number);

-- 3. Institutional Analytics & Generated Reports Table
CREATE TABLE IF NOT EXISTS public.institutional_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'finance', 'admissions', 'academics', 'registry', 'examinations'
    file_format TEXT NOT NULL DEFAULT 'PDF' CHECK (file_format IN ('PDF', 'CSV', 'XLSX', 'DOCX')),
    file_path TEXT,
    storage_bucket TEXT NOT NULL DEFAULT 'institutional-reports',
    period_covered TEXT,
    status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('draft', 'generating', 'verified', 'archived')),
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_institutional_reports_category ON public.institutional_reports(category);
CREATE INDEX IF NOT EXISTS idx_institutional_reports_status ON public.institutional_reports(status);

-- 4. Routine Documents Table (Downloadable Class Routines)
CREATE TABLE IF NOT EXISTS public.routine_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    class_level TEXT,
    section TEXT,
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. Enable Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_documents ENABLE ROW LEVEL SECURITY;

-- Transport Routes: Readable by all authenticated users; Managed by system_admin & logistics
CREATE POLICY "transport_routes_select" ON public.transport_routes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transport_routes_manage" ON public.transport_routes
FOR ALL TO authenticated USING (
    public.has_role('system_admin') OR public.has_role('registrar')
);

-- Transport Vehicles: Readable by all authenticated users; Managed by system_admin & logistics
CREATE POLICY "transport_vehicles_select" ON public.transport_vehicles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transport_vehicles_manage" ON public.transport_vehicles
FOR ALL TO authenticated USING (
    public.has_role('system_admin') OR public.has_role('registrar')
);

-- Institutional Reports: Selectable by staff, administrators, auditors
CREATE POLICY "institutional_reports_select" ON public.institutional_reports
FOR SELECT TO authenticated USING (
    public.has_role('system_admin') OR public.has_role('finance_officer') OR public.has_role('registrar') OR public.has_role('auditor') OR public.has_role('vice_chancellor')
);

CREATE POLICY "institutional_reports_manage" ON public.institutional_reports
FOR ALL TO authenticated USING (
    public.has_role('system_admin') OR public.has_role('finance_officer') OR public.has_role('registrar')
);

-- Routine Documents: Selectable by all authenticated users
CREATE POLICY "routine_documents_select" ON public.routine_documents
FOR SELECT TO authenticated USING (true);

CREATE POLICY "routine_documents_manage" ON public.routine_documents
FOR ALL TO authenticated USING (
    public.has_role('system_admin') OR public.has_role('academic_affairs_officer') OR public.has_role('registrar')
);

-- ==============================================================================
-- 6. Storage Bucket for Institutional Reports
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'institutional-reports',
    'institutional-reports',
    false,
    52428800, -- 50 MB
    ARRAY['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']::text[]
) ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "institutional_reports_storage_select" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'institutional-reports'
    AND (public.has_role('system_admin') OR public.has_role('finance_officer') OR public.has_role('registrar') OR public.has_role('auditor'))
);

CREATE POLICY "institutional_reports_storage_insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'institutional-reports'
    AND (public.has_role('system_admin') OR public.has_role('finance_officer') OR public.has_role('registrar'))
);

-- ==============================================================================
-- 7. Seed Initial Data
-- ==============================================================================

-- Seed Transport Routes
INSERT INTO public.transport_routes (route_name, route_code, departure_location, arrival_location, departure_time, stops, fare_amount, is_active)
VALUES
    ('Campus Main → Downtown Station', 'TR-001', 'Main Campus Terminal', 'Downtown Central Station', '07:30:00', '["Hostel Village", "Sports Complex", "City Hall"]'::jsonb, 5.00, true),
    ('Hostel Village → Science Complex', 'TR-002', 'Hostel Village Gate', 'Science & Engineering Complex', '08:15:00', '["Library Square", "Business School"]'::jsonb, 0.00, true),
    ('Airport Residential → Campus Terminal', 'TR-003', 'Airport Junction', 'Main Campus Terminal', '06:45:00', '["Outer Circle", "Medical Block"]'::jsonb, 8.00, true)
ON CONFLICT (route_code) DO NOTHING;

-- Seed Transport Vehicles
INSERT INTO public.transport_vehicles (bus_number, model, capacity, driver_name, driver_phone, route_id, status)
SELECT 
    'UMS-BUS-01', 'Mercedes-Benz Sprinter 516', 30, 'Mr. Emmanuel Mensah', '+233 24 112 3456', r.id, 'active'
FROM public.transport_routes r WHERE r.route_code = 'TR-001'
ON CONFLICT (bus_number) DO NOTHING;

INSERT INTO public.transport_vehicles (bus_number, model, capacity, driver_name, driver_phone, route_id, status)
SELECT 
    'UMS-BUS-04', 'Scania Touring Coach', 60, 'Mr. Kofi Asante', '+233 20 887 6543', r.id, 'active'
FROM public.transport_routes r WHERE r.route_code = 'TR-002'
ON CONFLICT (bus_number) DO NOTHING;

INSERT INTO public.transport_vehicles (bus_number, model, capacity, driver_name, driver_phone, route_id, status)
SELECT 
    'UMS-BUS-07', 'Toyota Coaster Deluxe', 35, 'Mr. Isaac Kwarteng', '+233 55 432 1098', r.id, 'active'
FROM public.transport_routes r WHERE r.route_code = 'TR-003'
ON CONFLICT (bus_number) DO NOTHING;

-- Seed Institutional Reports
INSERT INTO public.institutional_reports (title, category, file_format, period_covered, status)
VALUES
    ('Semester 1 Tuition Fee Collection Reconciliation', 'finance', 'PDF', '2026/2027 Semester 1', 'verified'),
    ('Enrolled Students Matriculation & Demographic Report', 'admissions', 'XLSX', '2026 Cohort', 'verified'),
    ('Academic Performance & Course Pass Rate Analysis', 'examinations', 'PDF', '2025/2026 Academic Session', 'verified'),
    ('Faculty Teaching Load & Contact Hours Compliance', 'academics', 'CSV', 'Semester 1 2026/2027', 'verified')
ON CONFLICT DO NOTHING;

-- Seed Residences / Hostels if empty
INSERT INTO public.residences (campus_id, name, gender_allocation, total_capacity, address)
SELECT 
    c.id, 'Hall of Excellence (Block A & B)', 'mixed', 240, 'North Campus Residential Park'
FROM public.campuses c LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.residences (campus_id, name, gender_allocation, total_capacity, address)
SELECT 
    c.id, 'Nelson Mandela Graduate Hall', 'mixed', 180, 'East Ridge Boulevard'
FROM public.campuses c LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.residences (campus_id, name, gender_allocation, total_capacity, address)
SELECT 
    c.id, 'Jubilee Undergraduate Residence', 'female', 320, 'Lake View Campus Quad'
FROM public.campuses c LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed Library Items if empty
INSERT INTO public.library_items (isbn, title, author, publisher, publication_year, category, call_number)
VALUES
    ('978-0131103627', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Prentice Hall', 1988, 'Computer Science', 'QA76.73.C15 K47'),
    ('978-0262033848', 'Introduction to Algorithms (4th Edition)', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', 'MIT Press', 2022, 'Computer Science', 'QA76.6 .C662'),
    ('978-0134685991', 'Effective Java (3rd Edition)', 'Joshua Bloch', 'Addison-Wesley', 2018, 'Computer Science', 'QA76.73.J38 B57'),
    ('978-0321751041', 'Database System Concepts (7th Edition)', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', 'McGraw-Hill', 2019, 'Information Technology', 'QA76.9.D3 S563'),
    ('978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Prentice Hall', 2008, 'Software Engineering', 'QA76.76.D47 M37')
ON CONFLICT DO NOTHING;

