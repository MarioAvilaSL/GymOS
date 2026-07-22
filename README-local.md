# GymOS — Prototipo base

Plataforma SaaS para gestión de gimnasios (prototipo académico). Corre 100% en tu
máquina contra **PostgreSQL local**.

## Requisitos

- Node.js 20+ / [Bun](https://bun.sh)
- PostgreSQL 14+ corriendo en tu PC

## Puesta en marcha

1. **Crear la base de datos**

   ```bash
   createdb gymos
   psql -d gymos -f db/schema.sql
   ```

   Si ya tenías la base creada, aplica la migración de portal + rutinas:

   ```bash
   psql -d gymos -f db/migrations/002_client_workouts.sql
   ```

2. **Variables de entorno**

   Copia `.env.example` a `.env` y ajusta `DATABASE_URL` y `SESSION_SECRET`:

   ```bash
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # pega el resultado en SESSION_SECRET
   ```

3. **Instalar dependencias y arrancar**

   ```bash
   bun install
   bun run dev
   ```

   Abre http://localhost:8080

## Módulos incluidos

- Landing con branding GymOS
- Registro / inicio de sesión de administradores (bcrypt + sesión cifrada en cookie)
- CRUD de socios con planes (mensual / trimestral / anual) y fechas
- QR único por socio + **check-in híbrido**: escáner por webcam (html5-qrcode) y
  validación manual por token en la misma pantalla
- Dashboard con socios activos, próximos vencimientos, ingresos del mes y accesos hoy
- **Portal del socio** en `/portal/login`: el socio entra con su correo y el
  `código de acceso` (6 dígitos generado al crearlo). Ve el estado de su
  membresía (activa / vencida, días restantes, progreso del ciclo) y las
  rutinas asignadas (bloques de ejercicios en tarjetas).
- Asignación de rutinas desde el panel admin: botón 🏋 en la fila del socio.

## Nota sobre el preview de Lovable

El preview corre en Cloudflare Workers y **no puede conectarse a `localhost` de tu PC**.
Este prototipo está pensado para ejecutarse en tu máquina con `bun run dev`.
