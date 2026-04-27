-- 2026-04-26 / Phase 3 (Safe Improvement Plan)
-- Adds inquiries.partner_id as a NULLABLE soft-link to public.partners so the
-- admin can attach an inquiry to a known partner record (or to a partner created
-- on the fly during inquiry triage). NULL = not yet matched. ON DELETE SET NULL
-- preserves the inquiry if the partner is later removed.
--
-- Non-destructive:
--   * NEW column, NULLABLE, no default value (all existing rows stay valid).
--   * NO change to the partners table.
--   * ERP (`totalmanagements/`) does not reference inquiries at all
--     (verified via grep on totalmanagements/src) so the new FK has zero
--     impact on ERP queries, types, or APIs.

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS partner_id bigint
  REFERENCES public.partners(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inquiries.partner_id IS
  'Optional soft-link to public.partners. Set by reactstudio admin when an inquiry is matched to (or used to create) a partner record. NULL means "not yet matched". ON DELETE SET NULL preserves the inquiry if the partner is later removed.';

-- Partial index: only matched inquiries are indexed (cheap, supports admin
-- "show inquiries for this partner" lookups).
CREATE INDEX IF NOT EXISTS inquiries_partner_id_idx
  ON public.inquiries (partner_id)
  WHERE partner_id IS NOT NULL;
