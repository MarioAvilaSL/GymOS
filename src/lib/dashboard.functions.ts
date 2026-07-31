import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface PlanDistribution {
  plan: string;
  count: number;
}

export interface CheckinTrend {
  date: string;
  count: number;
}

export interface DashboardStats {
  activeMembers: number;
  totalMembers: number;
  expiringSoon: number;
  expiringThisMonth: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  checkinsToday: number;
  checkinsYesterday: number;
  recentCheckins: {
    id: string;
    full_name: string;
    result: string;
    created_at: string;
    plan: string;
  }[];
  revenueByMonth: MonthlyRevenue[];
  planDistribution: PlanDistribution[];
  checkinTrend: CheckinTrend[];
}

export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardStats> => {
    const { sessionConfig } = await import("../lib/session.server");
    const session = await useSession<{ adminId?: string }>(sessionConfig);
    const adminId = session.data.adminId;
    if (!adminId) throw new Error("No autenticado.");
    const { query } = await import("../lib/db.server");

    const [
      active,
      total,
      expiring,
      expiringMonth,
      revenue,
      prevRevenue,
      today,
      yesterday,
      recent,
      revenueByMonth,
      planDist,
      trend,
    ] = await Promise.all([
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE`,
        [adminId],
      ),
      query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM members WHERE admin_id = $1`, [
        adminId,
      ]),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
        [adminId],
      ),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM members
         WHERE admin_id = $1 AND end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')`,
        [adminId],
      ),
      query<{ s: string | null }>(
        `SELECT COALESCE(SUM(price), 0)::text AS s FROM members
         WHERE admin_id = $1 AND status = 'active'
           AND end_date >= CURRENT_DATE`,
        [adminId],
      ),
      query<{ s: string | null }>(
        `SELECT COALESCE(SUM(price), 0)::text AS s FROM checkins c
         JOIN members m ON m.id = c.member_id
         WHERE c.admin_id = $1
           AND c.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
           AND c.created_at < date_trunc('month', CURRENT_DATE)`,
        [adminId],
      ),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM checkins
         WHERE admin_id = $1 AND created_at::date = CURRENT_DATE`,
        [adminId],
      ),
      query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM checkins
         WHERE admin_id = $1 AND created_at::date = CURRENT_DATE - 1`,
        [adminId],
      ),
      query<{ id: string; full_name: string; result: string; created_at: string; plan: string }>(
        `SELECT c.id, m.full_name, c.result, c.created_at::text, m.plan
         FROM checkins c JOIN members m ON m.id = c.member_id
         WHERE c.admin_id = $1
         ORDER BY c.created_at DESC LIMIT 10`,
        [adminId],
      ),
      query<{ month: string; revenue: string }>(
        `SELECT to_char(gen_month, 'Mon') AS month,
                COALESCE(SUM(m.price), 0)::text AS revenue
         FROM generate_series(
           date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
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
      ),
      query<{ plan: string; count: string }>(
        `SELECT plan, COUNT(*)::text AS count
         FROM members
         WHERE admin_id = $1 AND status = 'active'
         GROUP BY plan
         ORDER BY count DESC`,
        [adminId],
      ),
      query<{ date: string; count: string }>(
        `SELECT to_char(d, 'EEE') AS date, COALESCE(cnt, 0)::text AS count
         FROM generate_series(
           CURRENT_DATE - 6,
           CURRENT_DATE,
           '1 day'
         ) d
         LEFT JOIN (
           SELECT created_at::date AS day, COUNT(*) AS cnt
           FROM checkins
           WHERE admin_id = $1
             AND created_at >= CURRENT_DATE - 6
           GROUP BY created_at::date
         ) chk ON chk.day = d
         ORDER BY d`,
        [adminId],
      ),
    ]);

    return {
      activeMembers: Number(active[0]?.n ?? 0),
      totalMembers: Number(total[0]?.n ?? 0),
      expiringSoon: Number(expiring[0]?.n ?? 0),
      expiringThisMonth: Number(expiringMonth[0]?.n ?? 0),
      monthlyRevenue: Number(revenue[0]?.s ?? 0),
      previousMonthRevenue: Number(prevRevenue[0]?.s ?? 0),
      checkinsToday: Number(today[0]?.n ?? 0),
      checkinsYesterday: Number(yesterday[0]?.n ?? 0),
      recentCheckins: recent,
      revenueByMonth: revenueByMonth.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
      })),
      planDistribution: planDist.map((p) => ({
        plan: p.plan,
        count: Number(p.count),
      })),
      checkinTrend: trend.map((t) => ({
        date: t.date,
        count: Number(t.count),
      })),
    };
  },
);
