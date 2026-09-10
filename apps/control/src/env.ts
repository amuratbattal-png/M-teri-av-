export interface Env {
  DB: D1Database;
  OUTREACH_QUEUE: Queue<OutreachJob>;
  WHATSAPP_WORKER: Fetcher;
  EMAIL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  /** control -> gönderim kanalı worker'ları (whatsapp/email/voice-call) arası paylaşılan sır. */
  OUTREACH_SHARED_SECRET: string;
  /** Teklif metinlerini kişiselleştirmek için NVIDIA API (integrate.api.nvidia.com) anahtarı - tanımlı değilse basit şablona düşülür. */
  NVIDIA_API_KEY?: string;
  /** build.nvidia.com model kimliği - tanımlı değilse varsayılana (meta/llama-3.1-70b-instruct) düşer. */
  NVIDIA_MODEL?: string;
}

/** OUTREACH_QUEUE'ye konan, onaylanmış gönderim işi. */
export interface OutreachJob {
  candidateId: string;
  channel: "whatsapp" | "email" | "voice_call";
}
