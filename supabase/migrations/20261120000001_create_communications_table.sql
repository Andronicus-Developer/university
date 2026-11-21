-- =============================================================================
-- Migration: 20261120000001_create_communications_table.sql
-- Purpose: Create the `public.communications` table in Supabase for Super Admin
--          outbound email dispatches AND inbound receiver replies.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
    is_read BOOLEAN NOT NULL DEFAULT true,
    parent_id UUID REFERENCES public.communications(id) ON DELETE SET NULL,
    resend_id TEXT,
    sender_email TEXT NOT NULL DEFAULT 'superadmin@university.edu.gh',
    sender_name TEXT NOT NULL DEFAULT 'Super Administrator',
    recipient_to TEXT NOT NULL,
    recipient_cc TEXT,
    recipient_bcc TEXT,
    target_school TEXT DEFAULT 'All Registered Schools',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('General', 'Compliance', 'Maintenance', 'Billing', 'Security', 'Announcement')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('sent', 'delivered', 'received', 'draft', 'scheduled', 'failed')),
    attachments JSONB DEFAULT '[]'::jsonb,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add columns if table was already created without inbound fields
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE public.communications ADD COLUMN IF NOT EXISTS resend_id TEXT;

-- Indexes for fast searching, inbox filtering, and sorting
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON public.communications (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_direction ON public.communications (direction);
CREATE INDEX IF NOT EXISTS idx_communications_is_read ON public.communications (is_read);
CREATE INDEX IF NOT EXISTS idx_communications_parent_id ON public.communications (parent_id);

-- Enable Row Level Security
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'communications'
          AND policyname = 'Allow superadmin full access to communications'
    ) THEN
        CREATE POLICY "Allow superadmin full access to communications"
            ON public.communications
            FOR ALL
            USING (auth.role() = 'service_role' OR public.has_role('superadmin'))
            WITH CHECK (auth.role() = 'service_role' OR public.has_role('superadmin'));
    END IF;
END $$;
