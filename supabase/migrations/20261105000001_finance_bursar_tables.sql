-- ==============================================================================
-- 20261105000001_finance_bursar_tables.sql
-- University Management System: Finance & Bursar Module Schema Extensions
-- 1. student_accounts (Aggregated student financial ledger & standing)
-- 2. financial_approvals (Dual-control approval queue for refunds, waivers & adjustments)
-- 3. payment_reconciliations (Payment provider settlement matching & discrepancies)
-- 4. financial_reports (Saved Bursar balance sheets, cashflow & regulatory reports)
-- ==============================================================================

-- 1. Student Accounts (Continuous ledger summary per student)
CREATE TABLE IF NOT EXISTS public.student_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    total_billed NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_billed >= 0),
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'GHS',
    financial_hold BOOLEAN NOT NULL DEFAULT false,
    last_payment_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_arrears', 'cleared', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_student_accounts_student ON public.student_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_accounts_balance ON public.student_accounts(current_balance);

-- 2. Financial Approvals Queue (Dual-control for refunds, waivers, debt write-offs)
CREATE TABLE IF NOT EXISTS public.financial_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_type TEXT NOT NULL CHECK (approval_type IN ('refund', 'waiver', 'discount', 'write_off', 'fee_adjustment')),
    reference_id UUID NOT NULL, -- references refund_requests(id) or waivers(id)
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    reason TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_financial_approvals_status ON public.financial_approvals(status);
CREATE INDEX IF NOT EXISTS idx_financial_approvals_type ON public.financial_approvals(approval_type);

-- 3. Payment Reconciliations (Reconciliation records matching bank/gateway settlements)
CREATE TABLE IF NOT EXISTS public.payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_batch_id UUID REFERENCES public.settlement_batches(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('paystack', 'hubtel', 'bank_transfer', 'mtn_momo', 'manual')),
    provider_transaction_id TEXT NOT NULL,
    internal_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    settled_amount NUMERIC(12,2) NOT NULL,
    fee_deducted NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'matched' CHECK (status IN ('matched', 'unmatched', 'discrepancy', 'reversed')),
    reconciled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_rec_status ON public.payment_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_payment_rec_provider ON public.payment_reconciliations(provider);

-- 4. Financial Reports (Saved Bursar periodic balance sheets & collection snapshots)
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('fee_collection', 'aged_debtors', 'gateway_reconciliation', 'revenue_summary', 'scholarship_disbursement')),
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'GHS',
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON public.financial_reports(report_type);

