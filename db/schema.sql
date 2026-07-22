-- GymOS — Esquema base para PostgreSQL local
-- Ejecutar:  psql -U postgres -d gymos -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Administradores del gimnasio (usuarios que inician sesión en la plataforma)
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  gym_name      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Socios del gimnasio
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  plan          TEXT NOT NULL DEFAULT 'mensual',       -- mensual | trimestral | anual
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',        -- active | expired | cancelled
  qr_token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  access_code   TEXT NOT NULL DEFAULT LPAD((floor(random() * 1000000))::int::text, 6, '0'),
  face_descriptor JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_access_code
  ON members(admin_id, access_code);

-- Rutinas asignadas al socio (bloques JSON con ejercicios).
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

CREATE INDEX IF NOT EXISTS idx_members_admin ON members(admin_id);
CREATE INDEX IF NOT EXISTS idx_members_end_date ON members(end_date);

-- Registro de accesos (check-ins por QR)
CREATE TABLE IF NOT EXISTS checkins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  result     TEXT NOT NULL,                            -- ok | expired | not_found
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_admin_date ON checkins(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id);
