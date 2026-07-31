import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export const exportMembersCsv = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    const { sessionConfig } = await import("../lib/session.server");
    const session = await useSession<{ adminId?: string }>(sessionConfig);
    const adminId = session.data.adminId;
    if (!adminId) throw new Error("No autenticado.");
    const { query } = await import("../lib/db.server");

    const rows = await query<{
      full_name: string;
      email: string;
      phone: string;
      plan: string;
      price: string;
      start_date: string;
      end_date: string;
      status: string;
      access_code: string;
    }>(
      `SELECT full_name, email, phone, plan, price::text,
              start_date::text, end_date::text, status, access_code
       FROM members WHERE admin_id = $1 ORDER BY full_name`,
      [adminId],
    );

    const header = "Nombre,Email,Teléfono,Plan,Precio,Inicio,Vencimiento,Estado,Código";
    const lines = rows.map(
      (r) =>
        `"${r.full_name}","${r.email ?? ""}","${r.phone ?? ""}",${r.plan},${r.price},${r.start_date},${r.end_date},${r.status},${r.access_code}`,
    );
    return [header, ...lines].join("\n");
  },
);

export const exportCheckinsCsv = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    const { sessionConfig } = await import("../lib/session.server");
    const session = await useSession<{ adminId?: string }>(sessionConfig);
    const adminId = session.data.adminId;
    if (!adminId) throw new Error("No autenticado.");
    const { query } = await import("../lib/db.server");

    const rows = await query<{
      full_name: string;
      result: string;
      created_at: string;
    }>(
      `SELECT m.full_name, c.result, c.created_at::text
       FROM checkins c JOIN members m ON m.id = c.member_id
       WHERE c.admin_id = $1
       ORDER BY c.created_at DESC`,
      [adminId],
    );

    const header = "Socio,Resultado,Fecha";
    const lines = rows.map((r) => `"${r.full_name}",${r.result},${r.created_at}`);
    return [header, ...lines].join("\n");
  },
);

export const exportRevenueCsv = createServerFn({ method: "GET" }).handler(
  async (): Promise<string> => {
    const { sessionConfig } = await import("../lib/session.server");
    const session = await useSession<{ adminId?: string }>(sessionConfig);
    const adminId = session.data.adminId;
    if (!adminId) throw new Error("No autenticado.");
    const { query } = await import("../lib/db.server");

    const rows = await query<{ month: string; revenue: string }>(
      `SELECT to_char(gen_month, 'YYYY-MM') AS month,
              COALESCE(SUM(m.price), 0)::text AS revenue
       FROM generate_series(
         date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
         date_trunc('month', CURRENT_DATE),
         '1 month'
       ) gen_month
       LEFT JOIN members m
         ON m.admin_id = $1
         AND m.status = 'active'
         AND date_trunc('month', m.start_date) <= gen_month
         AND (m.end_date >= gen_month OR m.end_date IS NULL)
       GROUP BY gen_month
       ORDER BY gen_month`,
      [adminId],
    );

    const header = "Mes,Ingreso";
    const lines = rows.map((r) => `${r.month},${r.revenue}`);
    return [header, ...lines].join("\n");
  },
);

export interface GymInfo {
  gymName: string;
  adminName: string;
  adminEmail: string;
  totalMembers: number;
  totalCheckins: number;
  activeMembers: number;
}
export const getGymInfo = createServerFn({ method: "GET" }).handler(async (): Promise<GymInfo> => {
  const { sessionConfig } = await import("../lib/session.server");
  const session = await useSession<{ adminId?: string }>(sessionConfig);
  const adminId = session.data.adminId;
  if (!adminId) throw new Error("No autenticado.");
  const { query } = await import("../lib/db.server");

  const [admin, memCount, chkCount, active] = await Promise.all([
    query<{ gym_name: string; full_name: string; email: string }>(
      `SELECT gym_name, full_name, email FROM admins WHERE id = $1`,
      [adminId],
    ),
    query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM members WHERE admin_id = $1`, [adminId]),
    query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM checkins WHERE admin_id = $1`, [adminId]),
    query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
      [adminId],
    ),
  ]);

  const a = admin[0];
  return {
    gymName: a.gym_name,
    adminName: a.full_name,
    adminEmail: a.email,
    totalMembers: Number(memCount[0]?.n ?? 0),
    totalCheckins: Number(chkCount[0]?.n ?? 0),
    activeMembers: Number(active[0]?.n ?? 0),
  };
});
