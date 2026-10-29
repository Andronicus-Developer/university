-- ==============================================================================
-- 00006_finance_and_payments.sql
-- University Management System: Fees, Student Invoices, Payments, Receipts & Reconciliation
-- ==============================================================================

-- 1. Fee Items (Master list of university charges: Tuition, Exams, Library, SRC, etc.)
CREATE TABLE IF NOT EXISTS public.fee_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g. 'TUITION_UG', 'EXAM_FEE', 'SRC_DUES', 'TECH_FEE'
    name TEXT NOT NULL,
    description TEXT,
    default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (default_amount >= 0),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Fee Schedules (Configured by academic year, term, programme, level)
CREATE TABLE IF NOT EXISTS public.fee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    level INTEGER NOT NULL CHECK (level IN (100, 200, 300, 400, 500, 600, 700, 800)),
    fee_item_id UUID NOT NULL REFERENCES public.fee_items(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_fee_schedule UNIQUE (academic_year_id, term_id, programme_id, level, fee_item_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_lookup ON public.fee_schedules(academic_year_id, term_id, programme_id, level);

-- 3. Student Invoices
CREATE TABLE IF NOT EXISTS public.student_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL UNIQUE,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'GHS',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'posted',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled'
    )),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.student_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_term ON public.student_invoices(term_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.student_invoices(status);

-- 4. Invoice Lines
CREATE TABLE IF NOT EXISTS public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.student_invoices(id) ON DELETE CASCADE,
    fee_item_id UUID NOT NULL REFERENCES public.fee_items(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

-- 5. Payment Attempts (Pre-checkout logging with Idempotency Key)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.student_invoices(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    provider TEXT NOT NULL CHECK (provider IN ('paystack', 'hubtel', 'manual', 'bank_transfer')),
    idempotency_key TEXT NOT NULL UNIQUE,
    provider_reference TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_key ON public.payment_attempts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_ref ON public.payment_attempts(provider_reference);

-- 6. Verified Payments (System of Record for Realized Funds)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id UUID REFERENCES public.payment_attempts(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    provider TEXT NOT NULL,
    provider_reference TEXT NOT NULL UNIQUE,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    payment_method TEXT,
    status TEXT NOT NULL DEFAULT 'successful' CHECK (status IN ('successful', 'reversed', 'refunded', 'disputed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON public.payments(provider_reference);

-- 7. Payment Allocations (Allocates payment amount to one or more invoices)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES public.student_invoices(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_payment_invoice_alloc UNIQUE (payment_id, invoice_id)
);

-- 8. Receipts (Issued strictly after successful payment verification)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
    receipt_number TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    receipt_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);

-- 9. Refund Requests (Requires Dual Control / Independent Approver)
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Scholarships & Sponsorships
CREATE TABLE IF NOT EXISTS public.scholarships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Vice-Chancellor Merit Scholarship', 'Ghana Cocobod Scholarship'
    sponsor_name TEXT NOT NULL,
    coverage_type TEXT NOT NULL CHECK (coverage_type IN ('full', 'tuition_only', 'percentage', 'fixed_amount')),
    amount_percentage NUMERIC(5,2),
    max_amount NUMERIC(12,2),
    effective_term_id UUID REFERENCES public.terms(id),
    expiry_term_id UUID REFERENCES public.terms(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_scholarships_student ON public.scholarships(student_id);

-- 11. Waivers & Discounts
CREATE TABLE IF NOT EXISTS public.waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.student_invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Settlement Batches (Provider daily reconciliation)
CREATE TABLE IF NOT EXISTS public.settlement_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    batch_reference TEXT NOT NULL UNIQUE,
    total_amount NUMERIC(14,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GHS',
    settlement_date DATE NOT NULL,
    reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'reconciled', 'discrepancy')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. Separation of Duties Check for Refunds
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_refund_separation_of_duties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.approved_by IS NOT NULL AND NEW.approved_by = NEW.requested_by THEN
        RAISE EXCEPTION 'Separation of duties violation: The requester of a refund cannot approve it.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_refund_separation ON public.refund_requests;
CREATE TRIGGER trg_check_refund_separation
BEFORE INSERT OR UPDATE ON public.refund_requests
FOR EACH ROW EXECUTE FUNCTION public.check_refund_separation_of_duties();

-- ==============================================================================
-- 14. Transactional Idempotent Payment Webhook Processing
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_verified_payment(
    p_provider_reference TEXT,
    p_amount NUMERIC,
    p_currency TEXT,
    p_payment_method TEXT DEFAULT 'mobile_money',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_attempt RECORD;
    v_payment_id UUID;
    v_receipt_number TEXT;
    v_target_invoice RECORD;
    v_allocatable NUMERIC;
    v_allocated_this NUMERIC;
BEGIN
    -- Check if payment with this provider reference is already recorded (Idempotency)
    SELECT id INTO v_payment_id FROM public.payments WHERE provider_reference = p_provider_reference;
    IF v_payment_id IS NOT NULL THEN
        RETURN v_payment_id;
    END IF;

    -- Look up payment attempt by provider reference or idempotency key
    SELECT * INTO v_payment_attempt
    FROM public.payment_attempts
    WHERE provider_reference = p_provider_reference
       OR (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
    LIMIT 1;

    IF v_payment_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Payment attempt not found for reference %', p_provider_reference;
    END IF;

    -- Update attempt status
    UPDATE public.payment_attempts
    SET status = 'successful'
    WHERE id = v_payment_attempt.id;

    -- Insert payment record
    INSERT INTO public.payments (
        payment_attempt_id,
        student_id,
        amount,
        currency,
        provider,
        provider_reference,
        verified_at,
        payment_method,
        status
    ) VALUES (
        v_payment_attempt.id,
        v_payment_attempt.student_id,
        p_amount,
        p_currency,
        v_payment_attempt.provider,
        p_provider_reference,
        timezone('utc'::text, now()),
        p_payment_method,
        'successful'
    )
    RETURNING id INTO v_payment_id;

    -- Generate Receipt Number (e.g. REC-20261029-XXXX)
    v_receipt_number := 'REC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

    INSERT INTO public.receipts (
        payment_id,
        receipt_number,
        student_id,
        amount,
        currency,
        receipt_data
    ) VALUES (
        v_payment_id,
        v_receipt_number,
        v_payment_attempt.student_id,
        p_amount,
        p_currency,
        jsonb_build_object(
            'provider', v_payment_attempt.provider,
            'provider_reference', p_provider_reference,
            'payment_method', p_payment_method
        )
    );

    -- Allocate payment to target invoice if specified or to oldest unpaid invoice
    v_allocatable := p_amount;

    FOR v_target_invoice IN (
        SELECT id, balance_amount, total_amount, paid_amount
        FROM public.student_invoices
        WHERE student_id = v_payment_attempt.student_id
          AND status IN ('posted', 'partially_paid', 'overdue')
          AND (v_payment_attempt.invoice_id IS NULL OR id = v_payment_attempt.invoice_id)
        ORDER BY due_date ASC
    ) LOOP
        EXIT WHEN v_allocatable <= 0;

        v_allocated_this := LEAST(v_allocatable, v_target_invoice.balance_amount);

        -- Record allocation
        INSERT INTO public.payment_allocations (
            payment_id,
            invoice_id,
            allocated_amount
        ) VALUES (
            v_payment_id,
            v_target_invoice.id,
            v_allocated_this
        );

        -- Update invoice
        UPDATE public.student_invoices
        SET paid_amount = paid_amount + v_allocated_this,
            balance_amount = balance_amount - v_allocated_this,
            status = CASE 
                WHEN (balance_amount - v_allocated_this) <= 0 THEN 'paid'
                ELSE 'partially_paid'
            END,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_target_invoice.id;

        v_allocatable := v_allocatable - v_allocated_this;
    END LOOP;

    -- If all outstanding balance is cleared, automatically resolve financial holds!
    IF NOT EXISTS (
        SELECT 1 FROM public.student_invoices
        WHERE student_id = v_payment_attempt.student_id
          AND balance_amount > 0
          AND status <> 'draft'
    ) THEN
        UPDATE public.student_holds
        SET is_active = false,
            resolved_at = timezone('utc'::text, now())
        WHERE student_id = v_payment_attempt.student_id
          AND hold_type = 'financial'
          AND is_active = true;
    END IF;

    -- Log audit event
    PERFORM public.log_audit_event(
        'PAYMENT_PROCESSED',
        'payments',
        v_payment_id::text,
        'SUCCESS',
        'Verified payment of ' || p_amount::text || ' ' || p_currency || ' via ' || v_payment_attempt.provider
    );

    RETURN v_payment_id;
END;
$$;

-- ==============================================================================
-- 15. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_batches ENABLE ROW LEVEL SECURITY;

-- Fee items & schedules: Read by all authenticated; write by finance
CREATE POLICY "fee_items_read" ON public.fee_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_items_write" ON public.fee_items FOR ALL TO authenticated USING (public.has_permission('finance.invoice.create'));

CREATE POLICY "fee_schedules_read" ON public.fee_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_schedules_write" ON public.fee_schedules FOR ALL TO authenticated USING (public.has_permission('finance.invoice.create'));

-- Invoices & Lines:
-- Students can view their own invoices and line items
CREATE POLICY "invoices_select" ON public.student_invoices FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
    OR public.has_role('finance_officer')
    OR public.has_role('auditor')
);

CREATE POLICY "invoices_write" ON public.student_invoices FOR ALL TO authenticated USING (
    public.has_permission('finance.invoice.create')
    OR public.has_role('finance_officer')
    OR public.has_role('system_admin')
);

CREATE POLICY "invoice_lines_select" ON public.invoice_lines FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.student_invoices si
        JOIN public.students s ON s.id = si.student_id
        WHERE si.id = invoice_id AND (s.profile_id = auth.uid() OR public.has_permission('finance.invoice.read'))
    )
);

CREATE POLICY "invoice_lines_write" ON public.invoice_lines FOR ALL TO authenticated USING (
    public.has_permission('finance.invoice.create')
    OR public.has_role('finance_officer')
);

-- Payment attempts: Student can create attempt for self
CREATE POLICY "payment_attempts_select" ON public.payment_attempts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
);

CREATE POLICY "payment_attempts_insert" ON public.payment_attempts FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
);

-- Payments & Allocations:
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
    OR public.has_role('finance_officer')
    OR public.has_role('auditor')
);

CREATE POLICY "allocations_select" ON public.payment_allocations FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.payments p
        JOIN public.students s ON s.id = p.student_id
        WHERE p.id = payment_id AND (s.profile_id = auth.uid() OR public.has_permission('finance.invoice.read'))
    )
);

-- Receipts:
CREATE POLICY "receipts_select" ON public.receipts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
    OR public.has_role('finance_officer')
    OR public.has_role('auditor')
);

-- Refund Requests:
CREATE POLICY "refunds_select" ON public.refund_requests FOR SELECT TO authenticated USING (
    requested_by = auth.uid()
    OR public.has_permission('finance.refund.approve')
    OR public.has_role('finance_officer')
);

CREATE POLICY "refunds_insert" ON public.refund_requests FOR INSERT TO authenticated WITH CHECK (
    public.has_permission('finance.refund.request')
    OR public.has_role('finance_officer')
);

CREATE POLICY "refunds_update" ON public.refund_requests FOR UPDATE TO authenticated USING (
    public.has_permission('finance.refund.approve')
    OR public.has_role('finance_officer')
);

-- Scholarships & Waivers:
CREATE POLICY "scholarships_select" ON public.scholarships FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
    OR public.has_role('finance_officer')
);

CREATE POLICY "scholarships_write" ON public.scholarships FOR ALL TO authenticated USING (
    public.has_permission('finance.waiver.manage')
    OR public.has_role('finance_officer')
);

CREATE POLICY "waivers_select" ON public.waivers FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.profile_id = auth.uid())
    OR public.has_permission('finance.invoice.read')
);

CREATE POLICY "waivers_write" ON public.waivers FOR ALL TO authenticated USING (
    public.has_permission('finance.waiver.manage')
    OR public.has_role('finance_officer')
);

-- Settlement batches:
CREATE POLICY "settlements_policy" ON public.settlement_batches FOR ALL TO authenticated USING (
    public.has_role('finance_officer')
    OR public.has_role('auditor')
    OR public.has_role('system_admin')
);
