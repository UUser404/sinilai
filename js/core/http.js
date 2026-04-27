/**
 * core/http.js
 * HttpClient — wrapper tipis di atas fetch().
 * Tidak tahu apapun tentang Apps Script, payload, atau domain.
 * Hanya urusan: kirim request, kembalikan JSON.
 */
class HttpClient {
  /**
   * @param {string} baseUrl
   */
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * GET request dengan query params
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async get(params = {}) {
    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
    const res = await fetch(url.toString(), { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * POST disimulasikan via GET + payload JSON (workaround CORS Apps Script)
   * @param {Object} params   — query params biasa (action, dll)
   * @param {Object} payload  — body yang akan di-encode ke query param 'payload'
   * @returns {Promise<Object>}
   */
  async post(params = {}, payload = {}) {
    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('payload', JSON.stringify(payload));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

// Patch: tambah method postReal untuk payload besar/sensitif (misal changePassword)
// Mengirim POST sejati dengan body JSON ke Apps Script
HttpClient.prototype.postReal = async function(payload = {}) {
  const res = await fetch(this.baseUrl, {
    method:   'POST',
    redirect: 'follow',
    headers:  { 'Content-Type': 'text/plain' },
    body:     JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
