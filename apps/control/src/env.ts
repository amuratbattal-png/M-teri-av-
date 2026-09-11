export interface Env {
  DB: D1Database;
  OUTREACH_QUEUE: Queue<OutreachJob>;
  WHATSAPP_WORKER: Fetcher;
  EMAIL_WORKER: Fetcher;
  SCAN_SHARED_SECRET: string;
  /** control -> gönderim kanalı worker'ları (whatsapp/email/voice-call) arası paylaşılan sır. */
  OUTREACH_SHARED_SECRET: string;
  /**
   * dashboard -> control arası paylaşılan sır. control'ün kendi
   * *.workers.dev adresi (workers_dev kapatılmadığı sürece) herkese
   * açık olduğundan, adayları listeleyen/onaylayan/reddeden TÜM
   * endpoint'ler bunu zorunlu kılar - aksi halde dashboard'daki Basic
   * Auth tamamen atlanabilir (bkz. CLAUDE.md "Bilinen sorun").
   */
  CONTROL_SHARED_SECRET: string;
  /** Teklif metinlerini kişiselleştirmek için NVIDIA API (integrate.api.nvidia.com) anahtarı - tanımlı değilse basit şablona düşülür. */
  NVIDIA_API_KEY?: string;
  /** build.nvidia.com model kimliği - tanımlı değilse varsayılana (meta/llama-3.1-70b-instruct) düşer. */
  NVIDIA_MODEL?: string;
  /** Sistem uyarılarının (tarama art arda başarısız olursa vb.) gönderileceği e-posta - gizli değil, sadece bir hedef adres. */
  ALERT_EMAIL?: string;
}

/** OUTREACH_QUEUE'ye konan, onaylanmış gönderim işi. */
export interface OutreachJob {
  candidateId: string;
  channel: "whatsapp" | "email" | "voice_call";
}
