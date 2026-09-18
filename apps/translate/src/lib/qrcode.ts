import { toString as qrToStringSvg } from "qrcode/lib/browser.js";

/**
 * Katılım linkini SUNUCU TARAFINDA (Worker içinde) bir SVG QR koduna
 * çevirir - istemci tarafında bir kütüphane/CDN'e bağımlılık YOK, HTML
 * doğrudan bu SVG'yi içeriyor. `qrcode` paketinin ana giriş noktası
 * (server.js) Node'a özgü pngjs/fs kullanıyor - bunun yerine paketin
 * tarayıcı giriş noktası (lib/browser.js) import edildi, bu dosyanın SVG
 * render yolu sadece Uint8Array kullanıyor (bkz.
 * src/types/qrcode-browser.d.ts, node ile doğrulandı) - Cloudflare
 * Workers'ta ek bir uyumluluk bayrağı (nodejs_compat) gerekmiyor.
 */
export async function renderQrSvg(data: string): Promise<string> {
  return qrToStringSvg(data, { type: "svg", margin: 1, width: 220 });
}
