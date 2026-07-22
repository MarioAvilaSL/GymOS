import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export interface DashboardStats {
  activeMembers: number;
  expiringSoon: number;
  monthlyRevenue: number;
  checkinsToday: number;
  recentCheckins: {
    id: string;
    full_name: string;
    result: string;
    created_at: string;
  }[];
}

export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardStats> => {
    const { sessionConfig } = await import("../lib/session.server");
    const session = await useSession<{ adminId?: string }>(sessionConfig);
    const adminId = session.data.adminId;
    if (!adminId) throw new Error("No autenticado.");
    const { query } = await import("../lib/db.server");

    const [active, expiring, revenue, today, recent] = await Promise.all([
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
        [adminId],
      ),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
        [adminId],
      ),
      query<{ s: string | null }>(
        `SELECT COALESCE(SUM(price),0)::text AS s FROM members
         WHERE admin_id = $1 AND status = 'active'
           AND date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE)`,
        [adminId],
      ),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM checkins
         WHERE admin_id = $1 AND created_at::date = CURRENT_DATE`,
        [adminId],
      ),
      query<{ id: string; full_name: string; result: string; created_at: string }>(
        `SELECT c.id, m.full_name, c.result, c.created_at::text
         FROM checkins c JOIN members m ON m.id = c.member_id
         WHERE c.admin_id = $1
         ORDER BY c.created_at DESC LIMIT 8`,
        [adminId],
      ),
    ]);

    return {
      activeMembers: Number(active[0]?.n ?? 0),
      expiringSoon: Number(expiring[0]?.n ?? 0),
      monthlyRevenue: Number(revenue[0]?.s ?? 0),
      checkinsToday: Number(today[0]?.n ?? 0),
      recentCheckins: recent,
    };
  },
);
