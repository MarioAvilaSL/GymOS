export const clientSessionConfig = {
  password:
    process.env.CLIENT_SESSION_SECRET ??
    process.env.SESSION_SECRET ??
    "dev-only-insecure-client-session-secret-change-please-32chars",
  name: "gymos_member_session",
  maxAge: 60 * 60 * 24 * 30, // 30 días
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  },
};

export interface ClientSessionData {
  memberId?: string;
}
