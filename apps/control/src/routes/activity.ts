import type { Env } from "../env";
import { getActivity } from "../lib/activity";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Dashboard popup'ındaki "Geçmişi Göster" butonu bunu çağırır (lazy-load). */
export async function handleGetActivity(env: Env, candidateId: string): Promise<Response> {
  const activity = await getActivity(env, candidateId);
  return json({ activity });
}
