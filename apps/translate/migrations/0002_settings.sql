-- "Herşeyi yap ben sadece apileri panelden eklicem" isteği - NVIDIA API
-- anahtarı/model artık `wrangler secret put` yerine /admin/settings
-- panelinden de girilebiliyor (bkz. src/lib/settings.ts).
--
-- updated_at NOT NULL DEFAULT ile geliyor - kök repodaki apps/control'de
-- yaşanan "settings.updated_at şema uyumsuzluğu" olayının (bkz. kök
-- CLAUDE.md) AYNI hatasına baştan düşülmesin diye.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
