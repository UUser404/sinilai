/**
 * admin/modules/dashboard.js
 * DashboardModule — stats, koneksi, aktivitas terakhir, jam.
 * Dipisah dari controller agar mudah di-test dan diganti implementasinya.
 */
class DashboardModule {
  constructor() {
    this._timer     = null;
    this._clockTimer = null;
  }

  async load() {
    this._setKoneksi('checking');
    try {
      const start = Date.now();
      const res   = await api.getStats();
      const ms    = Date.now() - start;

      if (res.status === 'ok') {
        this._setKoneksi('ok', `Respons: ${ms}ms · Spreadsheet aktif`);
        UI.$('stat-guru').textContent  = res.stats.guru  ?? '—';
        UI.$('stat-siswa').textContent = res.stats.siswa ?? '—';
        UI.$('stat-nilai').textContent = res.stats.nilai ?? '—';
        UI.$('stat-kelas').textContent = res.stats.kelas ?? '—';
      } else {
        throw new Error(res.message || 'Response error');
      }
    } catch (e) {
      this._setKoneksi('error', e.message || 'Periksa URL dan deployment');
    }

    await this._loadAktivitas();
    this._updateRefreshLabel();
    this._scheduleAutoRefresh();
  }

  startClock() {
    const tick = () => {
      const el = UI.$('clockDisplay');
      if (el) el.textContent = Formatter.tanggalWaktu();
    };
    tick();
    this._clockTimer = setInterval(tick, 1000);
  }

  stopClock() {
    clearInterval(this._clockTimer);
  }

  cancelAutoRefresh() {
    clearTimeout(this._timer);
  }

  // ── Private ───────────────────────────────────────────────

  _setKoneksi(state, detail = '—') {
    const dot   = UI.$('koneksiDot');
    const label = UI.$('koneksiLabel');
    const det   = UI.$('koneksiDetail');
    const map   = {
      checking: { bg: '#f59e0b', color: 'var(--accent)',   text: 'Memeriksa koneksi...' },
      ok:       { bg: 'var(--success)', color: 'var(--success)', text: '✓ Apps Script terhubung' },
      error:    { bg: 'var(--error)',   color: 'var(--error)',   text: '✗ Tidak dapat terhubung' },
    };
    const cfg = map[state];
    dot.style.background = cfg.bg;
    label.style.color    = cfg.color;
    label.textContent    = cfg.text;
    det.textContent      = detail;
  }

  async _loadAktivitas() {
    try {
      const res = await api.getHistory();
      if (res.status === 'ok' && res.history?.length) {
        UI.$('recentActivity').innerHTML = res.history.slice(0, 8).map(h => `
          <tr>
            <td style="font-size:12px;color:var(--text3);white-space:nowrap">${h.timestamp}</td>
            <td class="name">${h.guru}</td>
            <td><span class="badge ${h.aksi.includes('LOGIN') ? 'blue' : h.aksi.includes('EDIT') ? 'amber' : 'green'}">${h.aksi}</span></td>
            <td style="font-size:12px">${h.siswa || '—'}</td>
            <td><span class="badge blue">${h.kelas || '—'}</span></td>
            <td style="font-size:12px;color:var(--text2)">${h.detail || ''}</td>
          </tr>`).join('');
      } else {
        UI.$('recentActivity').innerHTML =
          '<tr><td colspan="6" style="color:var(--text3);text-align:center;padding:24px">Belum ada aktivitas</td></tr>';
      }
    } catch {
      UI.$('recentActivity').innerHTML =
        '<tr><td colspan="6" style="color:var(--error);text-align:center;padding:24px">Gagal memuat aktivitas</td></tr>';
    }
  }

  _updateRefreshLabel() {
    const el = UI.$('lastRefresh');
    if (el) el.textContent = 'Diperbarui: ' + Formatter.waktuLokal();
  }

  _scheduleAutoRefresh() {
    this.cancelAutoRefresh();
    this._timer = setTimeout(() => {
      if (UI.$('page-dashboard')?.classList.contains('active')) this.load();
    }, Config.DASHBOARD_REFRESH_MS);
  }
}
