const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

const SHARED_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #0b0e17; color: #e7e9f5; min-height: 100vh;
  }
  a { color: #5eead4; text-decoration: none; }
  a:hover { text-decoration: underline; }
  header.topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.9rem 1.25rem; border-bottom: 1px solid #1f2436; background: #10131f;
  }
  header.topbar .brand { font-weight: 700; font-size: 1.05rem; }
  header.topbar nav a { margin-left: 1rem; color: #9ba3c9; font-size: 0.92rem; }
  header.topbar nav a.active { color: #5eead4; }
  main { max-width: 880px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
  h1 { font-size: 1.3rem; margin: 0 0 1rem; }
  h2 { font-size: 1.05rem; margin: 2rem 0 0.75rem; color: #c7cbe8; }
  .card {
    background: #12162400; border: 1px solid #232842; border-radius: 12px;
    padding: 1.1rem 1.25rem; margin-bottom: 1rem; background: #10131fb0;
  }
  .row { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
  label { display: block; font-size: 0.82rem; color: #9ba3c9; margin-bottom: 0.25rem; }
  input[type="text"], select {
    background: #0b0e17; border: 1px solid #2a3050; color: #e7e9f5;
    border-radius: 8px; padding: 0.5rem 0.65rem; font-size: 0.92rem; width: 100%;
  }
  .field { margin-bottom: 0.75rem; min-width: 180px; flex: 1; }
  button, .btn {
    background: #1c2340; border: 1px solid #34406e; color: #e7e9f5;
    border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.9rem; cursor: pointer;
    display: inline-block;
  }
  button.primary, .btn.primary { background: #0f766e; border-color: #14b8a6; }
  button.danger, .btn.danger { background: #3f1d2e; border-color: #7f1d3f; color: #fecdd3; }
  button:hover, .btn:hover { filter: brightness(1.15); }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #1f2436; }
  th { color: #9ba3c9; font-weight: 600; font-size: 0.8rem; }
  .badge {
    display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 600;
  }
  .badge.active { background: #0f3d33; color: #5eead4; }
  .badge.ended { background: #2a2f45; color: #9ba3c9; }
  .muted { color: #7d84a8; font-size: 0.85rem; }
  .mono { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 0.85rem; }
  .copy-box {
    display: flex; gap: 0.5rem; align-items: stretch; margin-top: 0.4rem;
  }
  .copy-box input {
    flex: 1;
  }
  .qr-wrap { background: #fff; border-radius: 12px; padding: 1rem; display: inline-block; }
  .banner { padding: 0.7rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.88rem; }
  .banner--bad { background: #3f1d2e; color: #fecdd3; border: 1px solid #7f1d3f; }
  .banner--good { background: #0f3d33; color: #5eead4; border: 1px solid #14b8a6; }
`;

export function adminPage(activeNav: string, title: string, bodyHtml: string): string {
  const navItem = (href: string, key: string, label: string) =>
    `<a href="${esc(href)}" class="${activeNav === key ? "active" : ""}">${esc(label)}</a>`;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - Canlı Çeviri Yönetimi</title>
<style>${SHARED_STYLE}</style>
</head>
<body>
<header class="topbar">
  <div class="brand">Canlı Çeviri &middot; Yönetim</div>
  <nav>
    ${navItem("/admin/sessions", "sessions", "Oturumlar")}
    ${navItem("/admin/speakers", "speakers", "Konuşmacılar")}
  </nav>
</header>
<main>
${bodyHtml}
</main>
</body>
</html>`;
}

/** Konuşmacı/katılımcı ekranları için basit, tam ekran bir kabuk - admin panelinden bilerek AYRI (giriş gerektirmiyor, sade). */
export function publicPage(title: string, bodyHtml: string, extraStyle = ""): string {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${SHARED_STYLE}
main { max-width: 720px; }
${extraStyle}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function renderFatalErrorPage(message: string): string {
  return publicPage(
    "Hata",
    `<main><h1>Bir şeyler ters gitti</h1><pre class="card mono" style="white-space:pre-wrap">${esc(message)}</pre><p><a href="/">Ana sayfaya dön</a></p></main>`,
  );
}
