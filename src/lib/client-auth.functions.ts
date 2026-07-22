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
