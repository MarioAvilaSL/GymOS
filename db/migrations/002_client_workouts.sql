-- GymOS — Migración 002: portal del cliente (miembro) + rutinas asignadas
-- Ejecutar:  psql -U postgres -d gymos -f db/migrations/002_client_workouts.sql

-- Código de acceso corto para que el socio inicie sesión en el portal.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS access_code TEXT;

-- Genera un código de 6 dígitos si no existe.
UPDATE members
SET access_code = LPAD((floor(random() * 1000000))::int::text, 6, '0')
WHERE access_code IS NULL;

ALTER TABLE members
  ALTER COLUMN access_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_access_code
  ON members(admin_id, access_code);

-- Rutinas asignadas al socio. Los bloques se guardan como JSON
-- para poder representar ejercicios con series/repeticiones sin
-- necesidad de una tabla extra en esta fase del prototipo.
CREATE TABLE IF NOT EXISTS workouts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  summary    TEXT,
  blocks     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_member ON workouts(member_id);
CREATE INDEX IF NOT EXISTS idx_workouts_admin ON workouts(admin_id);
