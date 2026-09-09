export interface Env {
  DB: D1Database;
  OUTREACH_QUEUE: Queue<OutreachJob>;
  WHATSAPP_WORKER: Fetcher;
  EMAIL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  /** control -> gönderim kanalı worker'ları (whatsapp/email/voice-call) arası paylaşılan sır. */
  OUTREACH_SHARED_SECRET: string;
}

/** OUTREACH_QUEUE'ye konan, onaylanmış gönderim işi. */
export interface OutreachJob {
  candidateId: string;
  channel: "whatsapp" | "email" | "voice_call";
}
