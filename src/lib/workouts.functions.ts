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

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.string().trim().max(30).optional().or(z.literal("")),
  reps: z.string().trim().max(30).optional().or(z.literal("")),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});
const blockSchema = z.object({
  name: z.string().trim().min(1).max(80),
  exercises: z.array(exerciseSchema).min(1).max(20),
});
const workoutSchema = z.object({
  memberId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(300).optional().or(z.literal("")),
  blocks: z.array(blockSchema).min(1).max(10),
});

export interface AdminWorkoutRow {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
}

export const listMemberWorkouts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    return query<AdminWorkoutRow>(
      `SELECT id, title, summary, created_at::text
       FROM workouts
       WHERE admin_id = $1 AND member_id = $2
       ORDER BY created_at DESC`,
      [adminId, data.memberId],
    );
  });

export const createWorkout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => workoutSchema.parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    // Verifica que el socio pertenezca al admin.
    const owns = await query<{ id: string }>(
      "SELECT id FROM members WHERE id = $1 AND admin_id = $2",
      [data.memberId, adminId],
    );
    if (owns.length === 0) throw new Error("Socio no encontrado.");
    const rows = await query<{ id: string }>(
      `INSERT INTO workouts (member_id, admin_id, title, summary, blocks)
       VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id`,
      [data.memberId, adminId, data.title, data.summary || null, JSON.stringify(data.blocks)],
    );
    return { id: rows[0].id };
  });

export const deleteWorkout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const adminId = await requireAdminId();
    const { query } = await import("./db.server");
    await query("DELETE FROM workouts WHERE id = $1 AND admin_id = $2", [data.id, adminId]);
    return { ok: true };
  });
