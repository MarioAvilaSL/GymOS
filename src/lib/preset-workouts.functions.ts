import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const blockSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(
    z.object({
      name: z.string().min(1),
      sets: z.string().optional(),
      reps: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
});

const presetSchema = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().optional(),
  blocks: z.array(blockSchema),
});

export interface PresetWorkout {
  id: string;
  title: string;
  summary: string | null;
  blocks: PresetBlock[];
  created_at: string;
}
export interface PresetBlock {
  name: string;
  exercises: { name: string; sets?: string; reps?: string; notes?: string }[];
}

async function requireAdmin() {
  const { sessionConfig } = await import("../lib/session.server");
  const session = await useSession<{ adminId?: string }>(sessionConfig);
  const adminId = session.data.adminId;
  if (!adminId) throw new Error("No autenticado.");
  return adminId;
}

async function requireMember() {
  const { clientSessionConfig } = await import("../lib/client-session.server");
  const session = await useSession<{ memberId?: string }>(clientSessionConfig);
  const memberId = session.data.memberId;
  if (!memberId) throw new Error("No autenticado.");
  return memberId;
}

export const listPresetWorkouts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PresetWorkout[]> => {
    const adminId = await requireAdmin();
    const { query } = await import("./db.server");
    return query<PresetWorkout>(
      `SELECT id, title, summary, blocks, created_at::text
       FROM preset_workouts WHERE admin_id = $1 ORDER BY created_at DESC`,
      [adminId],
    );
  },
);

export const createPresetWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) => presetSchema.parse(d))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { query } = await import("./db.server");
    await query(
      `INSERT INTO preset_workouts (admin_id, title, summary, blocks) VALUES ($1, $2, $3, $4)`,
      [adminId, data.title, data.summary ?? null, JSON.stringify(data.blocks)],
    );
    return { ok: true };
  });

export const updatePresetWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255),
        summary: z.string().optional(),
        blocks: z.array(blockSchema),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { query } = await import("./db.server");
    await query(
      `UPDATE preset_workouts SET title = $1, summary = $2, blocks = $3 WHERE id = $4 AND admin_id = $5`,
      [data.title, data.summary ?? null, JSON.stringify(data.blocks), data.id, adminId],
    );
    return { ok: true };
  });

export const deletePresetWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const adminId = await requireAdmin();
    const { query } = await import("./db.server");
    await query(`DELETE FROM preset_workouts WHERE id = $1 AND admin_id = $2`, [data.id, adminId]);
    return { ok: true };
  });

export const listAvailablePresets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PresetWorkout[]> => {
    const memberId = await requireMember();
    const { query } = await import("./db.server");
    const [member] = await query<{ admin_id: string }>(
      `SELECT admin_id FROM members WHERE id = $1`,
      [memberId],
    );
    if (!member) throw new Error("Socio no encontrado.");
    return query<PresetWorkout>(
      `SELECT id, title, summary, blocks, created_at::text
       FROM preset_workouts WHERE admin_id = $1 ORDER BY created_at DESC`,
      [member.admin_id],
    );
  },
);

export const selectPresetWorkout = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ presetId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const memberId = await requireMember();
    const { query } = await import("./db.server");
    const [preset] = await query<PresetWorkout>(
      `SELECT id, title, summary, blocks FROM preset_workouts WHERE id = $1`,
      [data.presetId],
    );
    if (!preset) throw new Error("Rutina no encontrada.");
    const [member] = await query<{ admin_id: string }>(
      `SELECT admin_id FROM members WHERE id = $1`,
      [memberId],
    );
    if (!member) throw new Error("Socio no encontrado.");
    const exist = await query<{ id: string }>(
      `SELECT id FROM workouts WHERE member_id = $1 AND title = $2 LIMIT 1`,
      [memberId, preset.title],
    );
    if (exist.length > 0) throw new Error("Ya tienes una rutina con ese nombre.");
    await query(
      `INSERT INTO workouts (member_id, admin_id, title, summary, blocks) VALUES ($1, $2, $3, $4, $5)`,
      [memberId, member.admin_id, preset.title, preset.summary, JSON.stringify(preset.blocks)],
    );
    return { ok: true };
  });
