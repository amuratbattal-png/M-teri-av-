import type { Env } from "../env";

/** apps/dashboard'daki AYNI basit Basic Auth deseni - sadece /admin/* korunuyor. */
export function requireAdminAuth(request: Request, env: Env): Response | null {
  const header = request.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const [user, pass] = atob(encoded).split(":");
      if (user === env.ADMIN_USERNAME && pass === env.ADMIN_PASSWORD) {
        return null;
      }
    }
  }
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="canli-ceviri-admin"' },
  });
}
