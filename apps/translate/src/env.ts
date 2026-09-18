export interface Env {
  DB: D1Database;
  SESSION_ROOM: DurableObjectNamespace;

  /** /admin panelini koruyan Basic Auth kullanıcı adı. */
  ADMIN_USERNAME: string;
  /** Basic Auth şifresi - repoda PLAINTEXT tutulmaz, `wrangler secret put ADMIN_PASSWORD`. */
  ADMIN_PASSWORD: string;

  /** Çeviri için NVIDIA API (integrate.api.nvidia.com) anahtarı - tanımlı değilse çeviri yapılamaz. */
  NVIDIA_API_KEY?: string;
  /** build.nvidia.com model kimliği - tanımlı değilse varsayılana düşer (bkz. lib/translate.ts). */
  NVIDIA_MODEL?: string;
}
