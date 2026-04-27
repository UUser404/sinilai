/**
 * admin/modules/history.js
 * HistoryModule — log audit perubahan nilai.
 */
class HistoryModule {
  constructor() {
    this._all      = [];
    this._rentang  = 30;  // hari yang ditampilkan
  }

  async load() {
    UI.$('historyBody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">⏳ Memuat histori...</td></tr>';
    try {
      const res = await api.getHistory();
      if (res.status === 'ok') {
        this._all = res.history || [];
        this.render();
      } else {
        UI.$('historyBody').innerHTML =
          '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:40px">Belum ada histori</td></tr>';
      }
    } catch {
      UI.$('historyBody').innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:var(--error);padding:24px">Gagal memuat histori</td></tr>';
    }
  }

  render() {
    const filtered = this._filtered();
    this._updateInfo(filtered.length);
    UI.$('historyBody').innerHTML = filtered.length
      ? filtered.map(h => `
          <tr>
            <td style="font-size:12px;color:var(--text3);white-space:nowrap">${h.timestamp}</td>
            <td class="name">${h.guru}</td>
            <td><span class="badge ${this._badgeType(h.aksi)}">${h.aksi}</span></td>
            <td>${h.siswa || '—'}</td>
            <td>${h.mapel || '—'}</td>
            <td><span class="badge blue">${h.kelas || '—'}</span></td>
            <td style="font-size:12px;color:var(--text2)">${h.detail || ''}</td>
          </tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:40px">Tidak ada histori dalam rentang ini</td></tr>';
  }

  setRentang(hari, btn) {
    this._rentang = hari;
    document.querySelectorAll('.btn-rentang').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.render();
  }

  async confirmHapus(hari) {
    const label = hari === 365 ? '1 tahun' : `${hari} hari`;
    if (!confirm(`Hapus semua histori lebih dari ${label} lalu?\nData tidak bisa dikembalikan.`)) return;
    UI.showLoading();
    try {
      const res = await api.deleteHistory(hari);
      if (res.status === 'ok') {
        UI.showToast(`✓ ${res.deleted} log berhasil dihapus`, 'success');
        await this.load();
      } else {
        UI.showToast('Gagal: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Private ───────────────────────────────────────────────

  _filtered() {
    if (this._rentang === 0) return this._all;
    const batas = new Date();
    batas.setDate(batas.getDate() - this._rentang);
    return this._all.filter(h => {
      const d = Formatter.parseTimestamp(h.timestamp);
      return d && d >= batas;
    });
  }

  _updateInfo(count) {
    const el = UI.$('historyInfo');
    if (!el) return;
    const label = this._rentang === 0 ? 'semua waktu' : `${this._rentang} hari terakhir`;
    el.textContent = `Menampilkan ${count} dari ${this._all.length} log — rentang: ${label}`;
  }

  _badgeType(aksi) {
    if (aksi.includes('LOGIN')) return 'blue';
    if (aksi.includes('EDIT'))  return 'amber';
    return 'green';
  }
}
