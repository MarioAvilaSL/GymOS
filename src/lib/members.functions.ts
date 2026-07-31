import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

async function requireAdminId(): Promise<string> {
  const { sessionConfig } = await import("./session.server");
  const session = await useSession<{ adminId?: string }>(sessionConfig);
  const adminId = session.data.adminId;
  if (!adminId) throw new Error("No autenticado.");
  return adminId;
}

// Genera un código de acceso de 6 dígitos (con ceros a la izquierda).
// Respaldo explícito por si el DEFAULT de la columna en la base de datos
// llegara a faltar (ver migración 002, que originalmente no lo incluía).
function generateAccessCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
}

// Código de error de Postgres para violación de restricción única.
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === UNIQUE_VIOLATION
  );
}

export interface MemberRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  plan: string;
  price: string;
  start_date: string;
  end_date: string;
  status: string;
  qr_token: string;
  access_code: string;
  face_descriptor?: string | null;
  created_at: string;
}

export const listMembers = createServerFn({ method: "GET" }).handler(async () => {
  const adminId = await requireAdminId();
  const { query } = await import("./db.server");
  return query<MemberRow>(
    `SELECT id, full_name, email, phone, plan, price::text, start_date::text,
            end_date::text, status, qr_token, access_code, face_descriptor::text, created_at::text
     FROM members WHERE admin_id = $1 ORDER BY created_at DESC`,
    [adminId],
  );
});

const memberSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  plan: z.enum(["mensual", "trimestral", "anual"]),
  price: z.number().min(0).max(100000),
  startDate: z.string(),
  endDate: z.string(),
});

export const createMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => memberSchema.parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");

    // Reintenta unas pocas veces por si el código de 6 dígitos generado
    // choca con el de otro socio del mismo admin (índice único
    // idx_members_access_code). Con 1,000,000 de combinaciones la
    // probabilidad de colisión es mínima, pero se maneja igual.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const rows = await query<{ id: string; qr_token: string; access_code: string }>(
          `INSERT INTO members (admin_id, full_name, email, phone, plan, price, start_date, end_date, access_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, qr_token, access_code`,
          [
            adminId,
            data.fullName,
            data.email || null,
            data.phone || null,
            data.plan,
            data.price,
            data.startDate,
            data.endDate,
            generateAccessCode(),
          ],
        );
        return { id: rows[0].id, qrToken: rows[0].qr_token, accessCode: rows[0].access_code };
      } catch (err) {
        if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
    throw new Error("No se pudo generar un código de acceso único. Intenta de nuevo.");
  });

export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    await query("DELETE FROM members WHERE id = $1 AND admin_id = $2", [data.id, adminId]);
    return { ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
        phone: z.string().trim().max(30).optional().or(z.literal("")),
        plan: z.enum(["mensual", "trimestral", "anual"]),
        price: z.number().min(0).max(100000),
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(["active", "expired", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    const rows = await query<{ id: string }>(
      `UPDATE members
       SET full_name = $1, email = $2, phone = $3, plan = $4, price = $5,
           start_date = $6, end_date = $7, status = $8
       WHERE id = $9 AND admin_id = $10
       RETURNING id`,
      [
        data.fullName,
        data.email || null,
        data.phone || null,
        data.plan,
        data.price,
        data.startDate,
        data.endDate,
        data.status,
        data.id,
        adminId,
      ],
    );
    if (rows.length === 0) throw new Error("Socio no encontrado.");
    return { id: rows[0].id };
  });

// Renovación rápida: extiende la membresía a partir de hoy o de la fecha de
// vencimiento actual (la que sea más tardía), según la duración del plan
// vigente, y reactiva al socio si estaba vencido o cancelado.
export const renewMembership = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        plan: z.enum(["mensual", "trimestral", "anual"]).optional(),
        price: z.number().min(0).max(100000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    const existing = await query<{
      end_date: string;
      plan: string;
      price: string;
      full_name: string;
      qr_token: string;
      access_code: string;
      start_date: string;
    }>(
      `SELECT end_date::text, plan, price::text, full_name, qr_token, access_code, start_date::text
       FROM members WHERE id = $1 AND admin_id = $2`,
      [data.id, adminId],
    );
    if (existing.length === 0) throw new Error("Socio no encontrado.");

    const plan = data.plan ?? (existing[0].plan as "mensual" | "trimestral" | "anual");
    const price = data.price ?? Number(existing[0].price);
    const months = plan === "mensual" ? 1 : plan === "trimestral" ? 3 : 12;

    const today = new Date(new Date().toDateString());
    const currentEnd = new Date(existing[0].end_date);
    const base = currentEnd > today ? currentEnd : today;
    const newStartDate = base.toISOString().slice(0, 10);
    base.setMonth(base.getMonth() + months);
    const newEndDate = base.toISOString().slice(0, 10);

    const rows = await query<{ id: string; end_date: string }>(
      `UPDATE members
       SET plan = $1, price = $2, end_date = $3, status = 'active'
       WHERE id = $4 AND admin_id = $5
       RETURNING id, end_date::text`,
      [plan, price, newEndDate, data.id, adminId],
    );
    return {
      id: rows[0].id,
      newEndDate: rows[0].end_date,
      fullName: existing[0].full_name,
      qrToken: existing[0].qr_token,
      accessCode: existing[0].access_code,
      plan,
      price,
      startDate: newStartDate,
      endDate: newEndDate,
    };
  });

export const checkInByToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    const rows = await query<MemberRow>(
      `SELECT id, full_name, email, phone, plan, price::text, start_date::text,
              end_date::text, status, qr_token, access_code, created_at::text
       FROM members WHERE qr_token = $1 AND admin_id = $2`,
      [data.token, adminId],
    );
    if (rows.length === 0) {
      return { result: "not_found" as const, member: null };
    }
    const member = rows[0];
    const expired = new Date(member.end_date) < new Date(new Date().toDateString());
    const result = expired ? ("expired" as const) : ("ok" as const);
    await query("INSERT INTO checkins (member_id, admin_id, result) VALUES ($1,$2,$3)", [
      member.id,
      adminId,
      result,
    ]);
    return { result, member };
  });

export const registerFace = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        memberId: z.string(),
        descriptor: z.array(z.number()),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    await query("UPDATE members SET face_descriptor = $1 WHERE id = $2 AND admin_id = $3", [
      JSON.stringify(data.descriptor),
      data.memberId,
      adminId,
    ]);
    return { success: true };
  });

export const checkInByFace = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ descriptor: z.array(z.number()) }).parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");

    // Obtener todos los socios que tienen rostro registrado
    const rows = await query<MemberRow & { face_descriptor: string }>(
      `SELECT id, full_name, email, phone, plan, price::text, start_date::text,
              end_date::text, status, qr_token, access_code, created_at::text,
              face_descriptor::text
       FROM members WHERE face_descriptor IS NOT NULL AND admin_id = $1`,
      [adminId],
    );

    if (rows.length === 0) {
      return { result: "no_members_registered" as const, member: null };
    }

    let bestMatch: (typeof rows)[0] | null = null;
    let minDistance = Infinity;
    const faceDescriptor = data.descriptor;

    for (const row of rows) {
      try {
        const storedDescriptor = JSON.parse(row.face_descriptor) as number[];
        if (storedDescriptor.length !== faceDescriptor.length) continue;

        let sumSq = 0;
        for (let i = 0; i < faceDescriptor.length; i++) {
          const diff = faceDescriptor[i] - storedDescriptor[i];
          sumSq += diff * diff;
        }
        const distance = Math.sqrt(sumSq);

        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = row;
        }
      } catch {
        // Ignorar firmas faciales corruptas
      }
    }

    // Umbral de similitud para face-api.js (generalmente 0.55 - 0.6)
    const THRESHOLD = 0.55;

    if (!bestMatch || minDistance > THRESHOLD) {
      return { result: "not_found" as const, member: null };
    }

    const member = bestMatch;
    const expired = new Date(member.end_date) < new Date(new Date().toDateString());
    const result = expired ? ("expired" as const) : ("ok" as const);

    await query("INSERT INTO checkins (member_id, admin_id, result) VALUES ($1,$2,$3)", [
      member.id,
      adminId,
      result,
    ]);

    return { result, member };
  });
