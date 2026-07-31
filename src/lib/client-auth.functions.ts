import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  accessCode: z.string().trim().min(4).max(12),
});

export interface CurrentMember {
  id: string;
  full_name: string;
  email: string | null;
  plan: string;
  start_date: string;
  end_date: string;
  status: string;
  gym_name: string;
  qr_token: string;
  access_code: string;
}

async function readMemberSession() {
  const { clientSessionConfig } = await import("./client-session.server");
  return useSession<{ memberId?: string }>(clientSessionConfig);
}

export const memberLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const { query } = await import("./db.server");
    const rows = await query<{ id: string }>(
      `SELECT id FROM members
       WHERE LOWER(email) = LOWER($1) AND access_code = $2
       LIMIT 1`,
      [data.email, data.accessCode],
    );
    if (rows.length === 0) throw new Error("Correo o código de acceso inválidos.");
    const session = await readMemberSession();
    await session.update({ memberId: rows[0].id });
    return { ok: true };
  });

export const memberLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await readMemberSession();
  await session.clear();
  return { ok: true };
});

export const getCurrentMember = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentMember | null> => {
    const session = await readMemberSession();
    const memberId = session.data.memberId;
    if (!memberId) return null;
    const { query } = await import("./db.server");
    const rows = await query<CurrentMember>(
      `SELECT m.id, m.full_name, m.email, m.plan, m.start_date::text, m.end_date::text,
              m.status, m.qr_token, m.access_code, a.gym_name
       FROM members m JOIN admins a ON a.id = m.admin_id
       WHERE m.id = $1`,
      [memberId],
    );
    return rows[0] ?? null;
  },
);

export const createMyWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        summary: z.string().trim().max(300).optional().or(z.literal("")),
        blocks: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(80),
              exercises: z
                .array(
                  z.object({
                    name: z.string().trim().min(1).max(120),
                    sets: z.string().trim().max(30).optional().or(z.literal("")),
                    reps: z.string().trim().max(30).optional().or(z.literal("")),
                  }),
                )
                .min(1)
                .max(20),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const session = await readMemberSession();
    const memberId = session.data.memberId;
    if (!memberId) throw new Error("No autenticado.");
    const { query } = await import("./db.server");
    const [member] = await query<{ admin_id: string }>(
      "SELECT admin_id FROM members WHERE id = $1",
      [memberId],
    );
    if (!member) throw new Error("Socio no encontrado.");
    const rows = await query<{ id: string }>(
      `INSERT INTO workouts (member_id, admin_id, title, summary, blocks)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING id`,
      [memberId, member.admin_id, data.title, data.summary || null, JSON.stringify(data.blocks)],
    );
    return { id: rows[0].id };
  });

export const deleteMyWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const session = await readMemberSession();
    const memberId = session.data.memberId;
    if (!memberId) throw new Error("No autenticado.");
    const { query } = await import("./db.server");
    await query("DELETE FROM workouts WHERE id = $1 AND member_id = $2", [data.id, memberId]);
    return { ok: true };
  });

export interface WorkoutBlock {
  name: string;
  exercises: { name: string; sets?: string; reps?: string; notes?: string }[];
}

export interface ClientWorkout {
  id: string;
  title: string;
  summary: string | null;
  blocks: WorkoutBlock[];
  created_at: string;
}

export const listMyWorkouts = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientWorkout[]> => {
    const session = await readMemberSession();
    const memberId = session.data.memberId;
    if (!memberId) throw new Error("No autenticado.");
    const { query } = await import("./db.server");
    return query<ClientWorkout>(
      `SELECT id, title, summary, blocks, created_at::text
       FROM workouts WHERE member_id = $1 ORDER BY created_at DESC`,
      [memberId],
    );
  },
);
