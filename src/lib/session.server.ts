export const sessionConfig = {
  password:
    process.env.SESSION_SECRET ?? "dev-only-insecure-session-secret-change-in-env-file-please-32ch",
  name: "gymos_session",
  maxAge: 60 * 60 * 24 * 7, // 7 días
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  },
};

export interface SessionData {
  adminId?: string;
}
