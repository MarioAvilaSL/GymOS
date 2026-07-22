-- GymOS — Migración 003: corrige el DEFAULT faltante en members.access_code
-- La migración 002 agregó la columna access_code y la marcó NOT NULL,
-- pero nunca le puso un valor por defecto. Como resultado, cualquier
-- INSERT en members que no envíe access_code explícitamente falla con:
--   "el valor nulo en la columna «access_code» de la relación «members»
--    viola la restricción de no nulo"
--
-- Ejecutar:  psql -U postgres -d gymos -f db/migrations/003_fix_access_code_default.sql

ALTER TABLE members
  ALTER COLUMN access_code
  SET DEFAULT LPAD((floor(random() * 1000000))::int::text, 6, '0');
