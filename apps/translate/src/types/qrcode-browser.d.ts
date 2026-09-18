/**
 * "qrcode" paketinin ana giriş noktası (lib/index.js -> lib/server.js)
 * Node'a özgü png/dosya render'ı için pngjs/fs kullanıyor - Cloudflare
 * Workers'ta bundle/çalışma zamanı sorunlarına yol açabilir. Bunun yerine
 * paketin TARAYICI giriş noktasını (lib/browser.js) doğrudan import
 * ediyoruz - bu dosya sadece Uint8Array kullanıyor, Buffer/fs/pngjs YOK
 * (bkz. src/lib/qrcode.ts, node ile doğrulandı). @types/qrcode bu alt
 * yolu tanımlamadığı için minimal bir tip burada elle veriliyor.
 */
declare module "qrcode/lib/browser.js" {
  export function toString(
    text: string,
    options?: { type?: "svg"; margin?: number; width?: number },
  ): Promise<string>;
}
