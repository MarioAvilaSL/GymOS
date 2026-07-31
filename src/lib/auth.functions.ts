import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
  fullName: z.string().trim().min(1).max(120),
  gymName: z.string().trim().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const register = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const [{ query }, { sessionConfig }, bcrypt] = await Promise.all([
      import("./db.server"),
      import("./session.server"),
      import("bcryptjs"),
    ]);

    const existing = await query<{ id: string }>("SELECT id FROM admins WHERE email = $1", [
      data.email.toLowerCase(),
    ]);
    if (existing.length > 0) {
      throw new Error("Ya existe una cuenta con ese correo.");
    }
    const hash = await bcrypt.default.hash(data.password, 10);
    const rows = await query<{ id: string }>(
      `INSERT INTO admins (email, password_hash, full_name, gym_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.email.toLowerCase(), hash, data.fullName, data.gymName],
    );

    const session = await useSession<{ adminId?: string }>(sessionConfig);
    await session.update({ adminId: rows[0].id });
    return { ok: true };
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const [{ query }, { sessionConfig }, bcrypt] = await Promise.all([
      import("./db.server"),
      import("./session.server"),
      import("bcryptjs"),
    ]);

    const rows = await query<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM admins WHERE email = $1",
      [data.email.toLowerCase()],
    );
    if (rows.length === 0) throw new Error("Correo o contraseña inválidos.");
    const ok = await bcrypt.default.compare(data.password, rows[0].password_hash);
    if (!ok) throw new Error("Correo o contraseña inválidos.");

    const session = await useSession<{ adminId?: string }>(sessionConfig);
    await session.update({ adminId: rows[0].id });
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionConfig } = await import("./session.server");
  const session = await useSession<{ adminId?: string }>(sessionConfig);
  await session.clear();
  return { ok: true };
});

export const getCurrentAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const [{ query }, { sessionConfig }] = await Promise.all([
    import("./db.server"),
    import("./session.server"),
  ]);
  const session = await useSession<{ adminId?: string }>(sessionConfig);
  const adminId = session.data.adminId;
  if (!adminId) return null;
  const rows = await query<{
    id: string;
    email: string;
    full_name: string;
    gym_name: string;
  }>("SELECT id, email, full_name, gym_name FROM admins WHERE id = $1", [adminId]);
  return rows[0] ?? null;
});
