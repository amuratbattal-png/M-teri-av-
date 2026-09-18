import { adminPage, esc } from "./layout";
import type { EffectiveNvidiaSettings } from "../lib/settings";

function sourceLabel(source: string): string {
  if (source === "panel") return "Panelde kayıtlı";
  if (source === "secret") return "Cloudflare secret'ından";
  if (source === "env") return "wrangler.toml değişkeninden";
  return "Tanımsız";
}

export function renderSettingsPage(
  settings: EffectiveNvidiaSettings,
  saved?: boolean,
  error?: string,
): string {
  const banner = error
    ? `<div class="banner banner--bad">${esc(error)}</div>`
    : saved
      ? '<div class="banner banner--good">Ayarlar kaydedildi.</div>'
      : "";

  const apiKeyStatus =
    settings.apiKeySource === "none"
      ? '<span class="muted">Hiçbir yerde tanımlı değil - çeviri çalışmaz.</span>'
      : `<span class="muted">${esc(sourceLabel(settings.apiKeySource))} kullanılıyor.</span>`;

  const clearKeyButton =
    settings.apiKeySource === "panel"
      ? `<form method="post" action="/admin/settings" style="margin-top:0.5rem">
          <input type="hidden" name="clearApiKey" value="1">
          <button type="submit" class="danger">Panel anahtarını sil</button>
        </form>`
      : "";

  const clearModelButton =
    settings.modelSource === "panel"
      ? `<form method="post" action="/admin/settings" style="margin-top:0.5rem">
          <input type="hidden" name="clearModel" value="1">
          <button type="submit" class="danger">Panel model ayarını sil</button>
        </form>`
      : "";

  const body = `
${banner}
<h1>Ayarlar</h1>
<p class="muted">Çeviri için NVIDIA API (integrate.api.nvidia.com) anahtarı ve modeli - buradan girilen değer, Cloudflare secret/değişkenlerinin ÜSTÜNE geçer.</p>

<div class="card">
  <form method="post" action="/admin/settings">
    <div class="field">
      <label for="nvidiaApiKey">NVIDIA API anahtarı</label>
      <input type="password" id="nvidiaApiKey" name="nvidiaApiKey" placeholder="nvapi-...">
      <p class="muted" style="margin-top:0.35rem">${apiKeyStatus} Güvenlik nedeniyle bu kutu her zaman boş görünür - doldurup kaydedince önceki değerin üzerine yazılır, boş bırakıp kaydedersen mevcut değer DEĞİŞMEZ.</p>
      ${clearKeyButton}
    </div>
    <div class="field" style="margin-top:1.25rem">
      <label for="nvidiaModel">NVIDIA model kimliği</label>
      <input type="text" id="nvidiaModel" name="nvidiaModel" value="${esc(settings.model)}">
      <p class="muted" style="margin-top:0.35rem">Kaynak: ${esc(sourceLabel(settings.modelSource))}.</p>
      ${clearModelButton}
    </div>
    <button type="submit" class="primary" style="margin-top:1.25rem">Ayarları Kaydet</button>
  </form>
</div>`;

  return adminPage("settings", "Ayarlar", body);
}
