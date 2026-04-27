/**
 * guru/modules/analisis.js
 * AnalisisModule — Dashboard Ringkasan Kelas & Ranking Siswa.
 *
 * Menggunakan data dari NilaiModule (sudah dimuat) atau fetch ulang
 * dari API jika data belum ada. Semua kalkulasi via NilaiCalculator.
 */
class AnalisisModule {
  /** @param {NilaiModule} nilaiMod */
  constructor(nilaiMod) {
    this._nilai = nilaiMod;
    this._kkm   = 75; // default KKM, bisa diubah via UI
  }

  // ── Public ────────────────────────────────────────────────

  /** Render halaman Dashboard Ringkasan */
  renderDashboard() {
    const data = this._nilai.data;
    const ctx  = this._nilai.ctx;

    if (!data.length) {
      this._showEmpty('dashboard-content', 'Belum ada data. Muat nilai di menu Input Nilai terlebih dahulu.');
      return;
    }

    const stats  = this._hitungStats(data);
    const distri = this._distribusiNilai(data);

    UI.$('dashboard-content').innerHTML = `
      <!-- Info konteks -->
      <div class="analisis-ctx-bar">
        <span class="ctx-chip">📚 ${ctx?.mapel || '—'}</span>
        <span class="ctx-chip">🏫 ${ctx?.kelas || '—'}</span>
        <span class="ctx-chip">📅 ${ctx?.semester || ''} ${ctx?.tahun || ''}</span>
        <span class="ctx-chip kkm-chip">KKM
          <input type="number" id="kkmInput" value="${this._kkm}" min="0" max="100"
            onchange="App.analisis.updateKKM(this.value)"
            style="width:44px;border:none;background:transparent;font-weight:700;
                   color:inherit;font-size:12px;text-align:center;outline:none"/>
        </span>
      </div>

      <!-- Stat cards -->
      <div class="stat-cards">
        ${this._statCard('👥', 'Total Siswa', stats.total, '')}
        ${this._statCard('📊', 'Rata-rata Kelas', stats.rataRaport.toFixed(1), this._rataClass(stats.rataRaport))}
        ${this._statCard('✅', 'Di atas KKM', stats.atasKKM, 'green')}
        ${this._statCard('⚠️', 'Di bawah KKM', stats.bawahKKM, stats.bawahKKM > 0 ? 'red' : '')}
        ${this._statCard('🏆', 'Nilai Tertinggi', stats.tertinggi.toFixed(1), 'blue')}
        ${this._statCard('📉', 'Nilai Terendah', stats.terendah.toFixed(1), '')}
      </div>

      <!-- Distribusi nilai -->
      <div class="analisis-card">
        <div class="analisis-card-header">
          <span class="analisis-card-title">Distribusi Nilai Raport</span>
          <span class="analisis-card-sub">${stats.total} siswa</span>
        </div>
        <div class="distribusi-wrap">
          ${this._renderDistribusi(distri, stats.total)}
        </div>
      </div>

      <!-- Rata-rata per komponen -->
      <div class="analisis-card">
        <div class="analisis-card-header">
          <span class="analisis-card-title">Rata-rata per Komponen</span>
        </div>
        <div class="komponen-wrap">
          ${this._renderKomponen(stats)}
        </div>
      </div>

      <!-- Siswa perlu perhatian -->
      ${stats.bawahKKM > 0 ? `
      <div class="analisis-card">
        <div class="analisis-card-header">
          <span class="analisis-card-title">⚠ Siswa di Bawah KKM (${this._kkm})</span>
          <span class="analisis-card-sub">${stats.bawahKKM} siswa</span>
        </div>
        <div class="perhatian-list">
          ${this._renderPerhatian(data)}
        </div>
      </div>` : `
      <div class="analisis-card" style="border-color:#bbf7d0;background:#f0fdf4">
        <div style="text-align:center;padding:12px;color:#166534;font-weight:600;font-size:14px">
          ✅ Semua siswa sudah memenuhi KKM ${this._kkm}
        </div>
      </div>`}
    `;
  }

  /** Render halaman Ranking Siswa */
  renderRanking() {
    const data = this._nilai.data;
    const ctx  = this._nilai.ctx;

    if (!data.length) {
      this._showEmpty('ranking-content', 'Belum ada data. Muat nilai di menu Input Nilai terlebih dahulu.');
      return;
    }

    const ranked = this._rankingSiswa(data);

    UI.$('ranking-content').innerHTML = `
      <!-- Info konteks -->
      <div class="analisis-ctx-bar">
        <span class="ctx-chip">📚 ${ctx?.mapel || '—'}</span>
        <span class="ctx-chip">🏫 ${ctx?.kelas || '—'}</span>
        <span class="ctx-chip">📅 ${ctx?.semester || ''} ${ctx?.tahun || ''}</span>
        <button class="btn-export-rank" onclick="App.analisis.exportRankingCSV()">
          ⬇ Export CSV
        </button>
      </div>

      <!-- Tabel ranking -->
      <div class="analisis-card" style="padding:0;overflow:hidden">
        <div style="overflow-x:auto">
          <table class="rank-table">
            <thead>
              <tr>
                <th class="rank-col">Rank</th>
                <th class="left-col">Nama Siswa</th>
                <th>UH</th>
                <th>Tugas</th>
                <th>Praktik</th>
                <th>Proses</th>
                <th>PTS</th>
                <th>ASAS</th>
                <th class="raport-col">Raport</th>
                <th>Predikat</th>
              </tr>
            </thead>
            <tbody>
              ${ranked.map((s, i) => this._rankRow(s, i)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /** Update KKM dan re-render dashboard */
  updateKKM(val) {
    const v = parseInt(val);
    if (isNaN(v) || v < 0 || v > 100) return;
    this._kkm = v;
    this.renderDashboard();
  }

  /** Export ranking ke CSV */
  exportRankingCSV() {
    const data = this._nilai.data;
    const ctx  = this._nilai.ctx;
    if (!data.length) { UI.showToast('Tidak ada data untuk diekspor', 'error'); return; }

    const ranked = this._rankingSiswa(data);
    const header = ['Rank','NIS','Nama','Rata UH','Rata Tugas','Rata Praktik','Nilai Proses','PTS','ASAS/ASAT','Nilai Raport','Predikat'];
    const rows   = [header.join(',')];

    ranked.forEach((s, i) => {
      rows.push([
        i + 1, s.nis, `"${s.nama}"`,
        s.rataUH.toFixed(1), s.rataTugas.toFixed(1), s.rataPraktik.toFixed(1),
        s.proses.toFixed(1), s.pts || '', s.asas || '',
        s.raport.toFixed(1), s.predikat,
      ].join(','));
    });

    const kelas    = (ctx?.kelas || 'kelas').replace(/\s/g, '_');
    const mapel    = (ctx?.mapel || 'mapel').replace(/\s/g, '_');
    const semester = (ctx?.semester || '').replace(/\s/g, '_');
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `ranking_${kelas}_${mapel}_${semester}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast(`✓ Ranking ${ranked.length} siswa berhasil diekspor`, 'success');
  }

  // ── Private: Kalkulasi ────────────────────────────────────

  _hitungStats(data) {
    const calc = this._nilai._calc;
    const nilaiRaports = data
      .map(s => calc.nilaiRaport(s.nilai))
      .filter(v => v > 0);

    if (!nilaiRaports.length) {
      return {
        total: data.length, rataRaport: 0, atasKKM: 0, bawahKKM: 0,
        tertinggi: 0, terendah: 0,
        rataUH: 0, rataTugas: 0, rataPraktik: 0, rataProses: 0, rataPTS: 0, rataAsas: 0,
      };
    }

    const atasKKM  = nilaiRaports.filter(v => v >= this._kkm).length;
    const bawahKKM = nilaiRaports.filter(v => v > 0 && v < this._kkm).length;

    // Rata-rata per komponen (hanya siswa yang ada nilainya)
    const avg = (kolom) => {
      const vals = data.map(s => +s.nilai[kolom]).filter(v => !isNaN(v) && v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    return {
      total:       data.length,
      rataRaport:  nilaiRaports.reduce((a, b) => a + b, 0) / nilaiRaports.length,
      atasKKM,
      bawahKKM,
      tertinggi:   Math.max(...nilaiRaports),
      terendah:    Math.min(...nilaiRaports),
      rataUH:      data.map(s => calc.rataUH(s.nilai)).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0),
      rataTugas:   data.map(s => calc.rataTugas(s.nilai)).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0),
      rataPraktik: data.map(s => calc.rataPraktik(s.nilai)).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0),
      rataProses:  data.map(s => calc.nilaiProses(s.nilai)).filter(v => v > 0).reduce((a, b, _, arr) => a + b / arr.length, 0),
      rataPTS:     avg('pts'),
      rataAsas:    avg('asas'),
    };
  }

  _distribusiNilai(data) {
    const calc = this._nilai._calc;
    const dist = { A: 0, B: 0, C: 0, D: 0, kosong: 0 };
    data.forEach(s => {
      const r = calc.nilaiRaport(s.nilai);
      if (r === 0) dist.kosong++;
      else if (r >= 90) dist.A++;
      else if (r >= 80) dist.B++;
      else if (r >= 70) dist.C++;
      else dist.D++;
    });
    return dist;
  }

  _rankingSiswa(data) {
    const calc = this._nilai._calc;
    return data
      .map(s => ({
        nis:        s.nis,
        nama:       s.nama,
        rataUH:     calc.rataUH(s.nilai),
        rataTugas:  calc.rataTugas(s.nilai),
        rataPraktik:calc.rataPraktik(s.nilai),
        proses:     calc.nilaiProses(s.nilai),
        pts:        s.nilai.pts,
        asas:       s.nilai.asas,
        raport:     calc.nilaiRaport(s.nilai),
        predikat:   this._predikat(calc.nilaiRaport(s.nilai)),
      }))
      .sort((a, b) => b.raport - a.raport);
  }

  _predikat(nilai) {
    if (nilai === 0)  return '—';
    if (nilai >= 90)  return 'A';
    if (nilai >= 80)  return 'B';
    if (nilai >= 70)  return 'C';
    if (nilai >= 60)  return 'D';
    return 'E';
  }

  _rataClass(rata) {
    if (rata >= 85) return 'green';
    if (rata >= 70) return 'blue';
    if (rata > 0)   return 'red';
    return '';
  }

  // ── Private: Render helpers ───────────────────────────────

  _statCard(icon, label, value, color) {
    return `
      <div class="stat-card-guru ${color}">
        <div class="stat-icon-guru">${icon}</div>
        <div class="stat-value-guru">${value}</div>
        <div class="stat-label-guru">${label}</div>
      </div>`;
  }

  _renderDistribusi(dist, total) {
    const grades = [
      { key: 'A', label: 'A  (≥90)', color: '#059669', bg: '#d1fae5' },
      { key: 'B', label: 'B  (80–89)', color: '#1a56db', bg: '#dbeafe' },
      { key: 'C', label: 'C  (70–79)', color: '#d97706', bg: '#fef3c7' },
      { key: 'D', label: 'D  (<70)',  color: '#dc2626', bg: '#fee2e2' },
    ];
    return grades.map(g => {
      const count = dist[g.key];
      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="dist-row">
          <span class="dist-label" style="color:${g.color}">${g.label}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar" style="width:${pct}%;background:${g.color};opacity:0.85"></div>
          </div>
          <span class="dist-count">${count} <small>(${pct}%)</small></span>
        </div>`;
    }).join('') + (dist.kosong > 0 ? `
      <div class="dist-row">
        <span class="dist-label" style="color:#94a3b8">Belum ada nilai</span>
        <div class="dist-bar-wrap">
          <div class="dist-bar" style="width:${Math.round((dist.kosong/total)*100)}%;background:#e2e5ea"></div>
        </div>
        <span class="dist-count">${dist.kosong}</span>
      </div>` : '');
  }

  _renderKomponen(stats) {
    const komps = [
      { label: 'Rata UH',      val: stats.rataUH,      color: '#1e40af', bg: '#dbeafe' },
      { label: 'Rata Tugas',   val: stats.rataTugas,   color: '#166534', bg: '#dcfce7' },
      { label: 'Rata Praktik', val: stats.rataPraktik, color: '#854d0e', bg: '#fef9c3' },
      { label: 'Nilai Proses', val: stats.rataProses,  color: '#1a56db', bg: '#eff6ff' },
      { label: 'PTS',          val: stats.rataPTS,     color: '#6d28d9', bg: '#ede9fe' },
      { label: 'ASAS/ASAT',   val: stats.rataAsas,    color: '#92400e', bg: '#fef3c7' },
    ];
    return komps.map(k => `
      <div class="komp-item">
        <div class="komp-bar-bg">
          <div class="komp-bar" style="height:${k.val > 0 ? Math.round(k.val) : 0}%;background:${k.color}"></div>
        </div>
        <div class="komp-val" style="color:${k.color};background:${k.bg}">
          ${k.val > 0 ? k.val.toFixed(1) : '—'}
        </div>
        <div class="komp-label">${k.label}</div>
      </div>`).join('');
  }

  _renderPerhatian(data) {
    const calc = this._nilai._calc;
    return data
      .filter(s => {
        const r = calc.nilaiRaport(s.nilai);
        return r > 0 && r < this._kkm;
      })
      .sort((a, b) => calc.nilaiRaport(a.nilai) - calc.nilaiRaport(b.nilai))
      .map(s => {
        const r = calc.nilaiRaport(s.nilai);
        const selisih = (this._kkm - r).toFixed(1);
        return `
          <div class="perhatian-row">
            <div class="perhatian-nama">${s.nama} <small>${s.nis}</small></div>
            <div class="perhatian-nilai">
              <span class="perhatian-raport">${r.toFixed(1)}</span>
              <span class="perhatian-gap">−${selisih} dari KKM</span>
            </div>
          </div>`;
      }).join('');
  }

  _rankRow(s, i) {
    const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    const raportBg = s.raport >= 90 ? '#d1fae5' : s.raport >= 80 ? '#dbeafe' : s.raport >= 70 ? '#fef9c3' : s.raport > 0 ? '#fee2e2' : '';
    const raportColor = s.raport >= 90 ? '#166534' : s.raport >= 80 ? '#1e40af' : s.raport >= 70 ? '#854d0e' : s.raport > 0 ? '#991b1b' : '#94a3b8';
    const predikatBg = { A:'#d1fae5', B:'#dbeafe', C:'#fef9c3', D:'#fee2e2', E:'#fee2e2', '—':'#f1f5f9' }[s.predikat] || '#f1f5f9';
    const predikatColor = { A:'#166534', B:'#1e40af', C:'#854d0e', D:'#991b1b', E:'#991b1b', '—':'#94a3b8' }[s.predikat] || '#94a3b8';
    return `
      <tr class="${i < 3 ? 'rank-top' : ''}">
        <td class="rank-col"><span class="rank-medal">${medal}</span></td>
        <td class="left-col">
          <div class="rank-nama">${s.nama}</div>
          <div class="rank-nis">${s.nis}</div>
        </td>
        <td>${s.rataUH > 0 ? s.rataUH.toFixed(1) : '—'}</td>
        <td>${s.rataTugas > 0 ? s.rataTugas.toFixed(1) : '—'}</td>
        <td>${s.rataPraktik > 0 ? s.rataPraktik.toFixed(1) : '—'}</td>
        <td>${s.proses > 0 ? s.proses.toFixed(1) : '—'}</td>
        <td>${s.pts || '—'}</td>
        <td>${s.asas || '—'}</td>
        <td class="raport-col">
          <span class="rank-raport" style="background:${raportBg};color:${raportColor}">
            ${s.raport > 0 ? s.raport.toFixed(1) : '—'}
          </span>
        </td>
        <td><span class="rank-predikat" style="background:${predikatBg};color:${predikatColor}">${s.predikat}</span></td>
      </tr>`;
  }

  _showEmpty(containerId, msg) {
    UI.$(containerId).innerHTML = `
      <div class="analisis-empty">
        <div class="analisis-empty-icon">📊</div>
        <p>${msg}</p>
        <button class="btn-go-input" onclick="App.showPage('nilai', document.querySelector('.nav-item[data-page=nilai]'))">
          Buka Input Nilai →
        </button>
      </div>`;
  }
}
