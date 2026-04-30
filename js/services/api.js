/**
 * services/api.js
 * ApiService — semua HTTP call ke Google Apps Script.
 */
class ApiService {
  constructor(http) {
    this._http = http;
  }

  login(username, password) {
    return this._http.post({ action: 'login' }, { username, password });
  }

  getSiswa(kelas) {
    return this._http.get({ action: 'getSiswa', kelas });
  }

  getNilai({ kelas, mapel, semester, tahun }) {
    return this._http.get({ action: 'getNilai', kelas, mapel, semester, tahun });
  }

  async saveNilai({ kelas, mapel, semester, tahun, namaGuru, data }) {
    const payload = {
      kelas, mapel, semester, tahun, namaGuru,
      data: Sanitizer.kompresNilai(data),
    };
    const urlTest = new URL(Config.SCRIPT_URL);
    urlTest.searchParams.set('action', 'saveNilai');
    urlTest.searchParams.set('payload', JSON.stringify(payload));

    if (urlTest.toString().length > Config.URL_MAX_LEN) {
      return this._saveNilaiBatch({ kelas, mapel, semester, tahun, namaGuru, data });
    }
    return this._http.post({ action: 'saveNilai' }, payload);
  }

  // ── Ganti Password Guru ──────────────────────────────────
  changePassword({ username, oldPassword, newPassword }) {
    return this._http.post({ action: 'changePassword' }, {
      username,
      oldPassword,
      newPassword,
    });
  }

  // ── Admin ─────────────────────────────────────────────────
  getStats()               { return this._http.get({ action: 'getStats' }); }
  getHistory()             { return this._http.get({ action: 'getHistory' }); }
  getGuru()                { return this._http.get({ action: 'getGuru' }); }
  getSiswaAll()            { return this._http.get({ action: 'getSiswaAll' }); }
  getNilaiAdmin(params)    { return this._http.get({ action: 'getNilaiAll', ...params }); }

  addGuru(data)            { return this._http.post({ action: 'addGuru' }, data); }
  editGuru(data)           { return this._http.post({ action: 'editGuru' }, data); }
  deleteGuru(username)     { return this._http.post({ action: 'deleteGuru' }, { username }); }

  addSiswa(data)           { return this._http.post({ action: 'addSiswa' }, data); }
  editSiswa(data)          { return this._http.post({ action: 'editSiswa' }, data); }
  deleteSiswa(nis)         { return this._http.post({ action: 'deleteSiswa' }, { nis }); }

  deleteHistory(hari)      { return this._http.post({ action: 'deleteHistory' }, { hari }); }

  // ── Export Absensi & Nilai ────────────────────────────────
  exportAbsensiNilai(params) {
    return this._http.get({ action: 'exportAbsensiDanNilai', ...params });
  }

  // ── Kurikulum ─────────────────────────────────────────
  getMapel()               { return this._http.get({ action: 'getMapel' }); }
  addMapel(data)           { return this._http.post({ action: 'addMapel' }, data); }
  editMapel(data)          { return this._http.post({ action: 'editMapel' }, data); }
  deleteMapel(data)        { return this._http.post({ action: 'deleteMapel' }, data); }
  savePenugasan(data)      { return this._http.post({ action: 'savePenugasan' }, data); }

  async _saveNilaiBatch({ data, ...meta }) {
    const total = Math.ceil(data.length / Config.BATCH_SIZE);
    let   saved = 0;

    for (let i = 0; i < data.length; i += Config.BATCH_SIZE) {
      const batch = data.slice(i, i + Config.BATCH_SIZE);
      saved      += batch.length;
      const pct   = Math.round((saved / data.length) * 100);
      this._showSaveProgress(pct, saved, data.length);
      const payload = { ...meta, data: Sanitizer.kompresNilai(batch) };
      const result  = await this._http.post({ action: 'saveNilai' }, payload);
      if (result.status !== 'ok') throw new Error(result.message || 'Gagal menyimpan');
    }

    UI.hideLoading();
    return { status: 'ok', message: `Berhasil menyimpan ${data.length} siswa` };
  }

  _showSaveProgress(pct, done, total) {
    const textEl = UI.$('loadingText');
    if (textEl) textEl.innerHTML = `
      Menyimpan nilai…
      <div style="margin-top:10px;width:180px;height:6px;background:#e2e5ea;border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:#1a56db;border-radius:4px;transition:width 0.3s ease;"></div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:#94a3b8;font-weight:400">${done} / ${total} siswa</div>
    `;
    UI.$('loadingOverlay')?.classList.add('show');
  }
}

const api = new ApiService(new HttpClient(Config.SCRIPT_URL));
