-- Migration: Add dropdown_options column to custom_fields table
-- Allows custom fields to have predefined dropdown options

-- Add dropdown_options column (JSONB array of strings)
ALTER TABLE public.custom_fields
ADD COLUMN IF NOT EXISTS dropdown_options TEXT[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.custom_fields.dropdown_options IS 'Array of options for dropdown field type';
