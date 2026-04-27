-- Phase 2: structured intake payload for the contact wizard.
-- Adds inquiries.intake_payload (jsonb) to capture wizard fields that are currently
-- flattened into the `message` text column. The existing `message` column is kept
-- intact so admin UI/email notifications continue to work unchanged.
-- Non-destructive: ADD COLUMN with NOT NULL + default '{}'::jsonb, all existing rows
-- get the default. The ERP does not read from `inquiries`, so ERP is unaffected.
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS intake_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inquiries.intake_payload IS
  'Structured wizard payload (content_types, video_count, meeting_preference, preferred_date, preferred_time_slot, custom_service, additional_request, reference_urls). Mirrors what is also flattened into the human-readable message column for backward compatibility.';
