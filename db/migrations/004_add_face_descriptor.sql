-- Add face_descriptor column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
