export interface WordPressSite {
  url: string; // ör. https://ornek-site.com
  username: string;
  appPassword: string; // WordPress "Application Passwords" ile üretilir
}

/**
 * WordPress REST API'sine Application Password (Basic Auth) ile bağlanan
 * ince bir istemci. Bu, "WordPress'e tam müdahale" isteğinin teknik
 * temelidir - gerçek kapsam (hangi endpoint'ler, hangi işlemler)
 * netleştikçe genişletilmeli.
 *
 * TODO: kapsam netleşince buraya gerçek metodlar eklenecek, ör:
 *   - updatePost(postId, data)
 *   - createPost(data)
 *   - updateSeoMeta(postId, meta)  (bir SEO eklentisi varsa onun REST
 *     alanları üzerinden)
 *   - listPlugins() / updatePlugin(slug)
 */
export class WordPressClient {
  constructor(private site: WordPressSite) {}

  private authHeader(): string {
    const token = btoa(`${this.site.username}:${this.site.appPassword}`);
    return `Basic ${token}`;
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.site.url.replace(/\/$/, "")}/wp-json${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: this.authHeader(),
        "content-type": "application/json",
      },
    });
  }
}
