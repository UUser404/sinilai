/**
 * guru/modules/home.js
 * HomeModule — Dashboard Beranda mobile.
 * Menampilkan: greeting, kelas terakhir, stat ringkas,
 * daftar semua kelas guru, dan riwayat aktivitas.
 */
class HomeModule {
  constructor(nilaiMod, analisisMod) {
    this._nilai   = nilaiMod;
    this._analisis = analisisMod;
    this._guru    = null;
  }

  setGuru(guru) { this._guru = guru; }

  /** Render halaman beranda */
  render() {
    const guru = this._guru;
    if (!guru) return;

    const ctx   = this._nilai.ctx;
    const now   = new Date();
    const hari  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];
    const tgl   = now.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const inisial = Formatter.inisial(guru.nama);

    // Stat ringkas dari data yang sudah dimuat (jika ada)
    const statsHtml = this._renderStats(ctx);

    // Daftar semua kelas guru
    const kelasHtml = this._renderKelasList(guru);

    UI.$('home-content').innerHTML = `
      <!-- HERO -->
      <div class="hm-hero">
        <div class="hm-hero-inner">
          <div class="hm-hero-left">
            <div class="hm-greeting">Selamat datang,</div>
            <div class="hm-name">${guru.nama}</div>
            <div class="hm-date">${hari}, ${tgl}</div>
          </div>
          <div class="hm-avatar">${inisial}</div>
        </div>

        ${ctx ? `
        <div class="hm-last-card">
          <div class="hm-last-label">Terakhir dibuka</div>
          <div class="hm-last-row">
            <div>
              <div class="hm-last-nama">${ctx.mapel} · ${ctx.kelas}</div>
              <div class="hm-last-sub">${ctx.semester} ${ctx.tahun} · ${this._nilai.data.length} siswa</div>
            </div>
            <button class="hm-btn-lanjut" onclick="App.showBottomPage('nilai')">Lanjutkan →</button>
          </div>
        </div>` : `
        <div class="hm-last-card hm-last-empty">
          <div class="hm-last-label">Belum ada kelas dibuka</div>
          <div class="hm-last-sub-empty">Pilih kelas di menu Input Nilai untuk mulai</div>
        </div>`}

        <div class="hm-hero-wave"></div>
      </div>

      <div class="hm-body">

        ${statsHtml}

        <!-- MENU GRID COMPACT -->
        <div class="hm-sec">Menu</div>
        <div class="hm-menu-row">
          <div class="hm-chip" onclick="App.showBottomPage('nilai')">
            <div class="hm-chip-icon" style="background:#e8effe">📝</div>
            <div class="hm-chip-name">Input Nilai</div>
          </div>
          <div class="hm-chip" onclick="App.showBottomPage('dashboard')">
            <div class="hm-chip-icon" style="background:#f0fdf4">📊</div>
            <div class="hm-chip-name">Ringkasan</div>
          </div>
          <div class="hm-chip" onclick="App.showBottomPage('ranking')">
            <div class="hm-chip-icon" style="background:#fffbeb">🏆</div>
            <div class="hm-chip-name">Ranking</div>
          </div>
          <div class="hm-chip" onclick="App.showBottomPage('export')">
            <div class="hm-chip-icon" style="background:#ecfdf5">📤</div>
            <div class="hm-chip-name">Export</div>
          </div>
        </div>

        <!-- SEMUA KELAS -->
        <div class="hm-sec">Semua kelas saya</div>
        <div class="hm-kelas-list">${kelasHtml}</div>

      </div>
    `;
  }

  // ── Private ───────────────────────────────────────────────

  _renderStats(ctx) {
    if (!ctx || !this._nilai.data.length) return '';

    const calc    = this._nilai._calc;
    const data    = this._nilai.data;
    const kkm     = this._analisis._kkm || 75;
    const raports = data.map(s => calc.nilaiRaport(s.nilai)).filter(v => v > 0);
    if (!raports.length) return '';

    const rata     = raports.reduce((a, b) => a + b, 0) / raports.length;
    const bawahKKM = raports.filter(v => v < kkm).length;

    return `
      <div class="hm-sec">Ringkasan · ${ctx.kelas} ${ctx.mapel}</div>
      <div class="hm-stat-row">
        <div class="hm-stat-card">
          <div class="hm-stat-ctx">Rata-rata raport</div>
          <div class="hm-stat-val">${rata.toFixed(1)}</div>
          <div class="hm-stat-lbl">dari ${raports.length} siswa</div>
          <div class="hm-badge ${rata >= kkm ? 'ok' : 'warn'}">
            ${rata >= kkm ? '▲ Di atas KKM' : '▼ Di bawah KKM'}
          </div>
        </div>
        <div class="hm-stat-card">
          <div class="hm-stat-ctx">Butuh perhatian</div>
          <div class="hm-stat-val">${bawahKKM}</div>
          <div class="hm-stat-lbl">di bawah KKM ${kkm}</div>
          <div class="hm-badge ${bawahKKM > 0 ? 'warn' : 'ok'}">
            ${bawahKKM > 0 ? '⚠ Cek sekarang' : '✓ Semua lulus'}
          </div>
        </div>
      </div>`;
  }

  _renderKelasList(guru) {
    if (!guru.kelas?.length || !guru.mapel?.length) {
      return '<div class="hm-kelas-empty">Tidak ada data kelas</div>';
    }

    // Buat kombinasi kelas × mapel
    const items = [];
    guru.kelas.forEach(k => {
      guru.mapel.forEach(m => {
        items.push({ kelas: k, mapel: m });
      });
    });

    const ctx = this._nilai.ctx;

    return items.map(item => {
      const isAktif = ctx && ctx.kelas === item.kelas && ctx.mapel === item.mapel;
      const statusLabel = isAktif
        ? (this._nilai.data.some(s => this._nilai._calc.adaNilai(s.nilai)) ? 'Aktif' : 'Dibuka')
        : 'Belum';
      const statusStyle = isAktif
        ? 'background:#ecfdf5;color:#059669'
        : 'background:#f1f5f9;color:#64748b';
      const dotColor = isAktif ? '#1a56db' : '#cbd5e1';

      return `
        <div class="hm-kelas-row" onclick="App.bukaKelas('${item.kelas}','${item.mapel}')">
          <div class="hm-kelas-left">
            <div class="hm-kelas-dot" style="background:${dotColor}"></div>
            <div>
              <div class="hm-kelas-nama">${item.mapel} · ${item.kelas}</div>
              <div class="hm-kelas-sub">Tap untuk buka input nilai</div>
            </div>
          </div>
          <div class="hm-kelas-right">
            <span class="hm-kelas-badge" style="${statusStyle}">${statusLabel}</span>
            <span class="hm-kelas-arrow">›</span>
          </div>
        </div>`;
    }).join('');
  }
}
