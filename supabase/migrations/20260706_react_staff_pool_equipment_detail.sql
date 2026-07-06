-- Preserve applicant-written equipment status as freeform text.
-- Non-destructive: adds a nullable column to the REACT-owned staff pool table.

ALTER TABLE public.react_staff_applications
  ADD COLUMN IF NOT EXISTS equipment_detail text;

COMMENT ON COLUMN public.react_staff_applications.equipment_detail IS
  'Freeform applicant-written equipment status, preserved in addition to searchable equipment tags.';
