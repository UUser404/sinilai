/**
 * js/kurikulum/modules/mobile.js
 * MobileModule — navigasi bottom nav, daftar guru mobile, beranda stats.
 */
class MobileModule {
  constructor(state) {
    this._s = state;
  }

  goPage(page) {
    // Update bottom nav active state
    document.querySelectorAll('.k-bn-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });

    // Show target page
    const pageMap = {
      home      : 'k-page-home',
      penugasan : 'k-page-penugasan',
      mapel     : 'k-page-mapel',
      profil    : 'k-page-profil',
    };
    document.querySelectorAll('.k-page').forEach(p => p.classList.remove('active'));
    const target = UI.$(pageMap[page]);
    if (target) target.classList.add('active');

    // Render mapel list when navigating there
    if (page === 'mapel') App.mapel.renderM();

    this._s.currentMobilePage = page;
  }

  backToList() {
    if (this._s.penDirty && !confirm('Ada perubahan belum disimpan. Tinggalkan?')) return;
    this._s.currentGuru = null;
    this._s.currentPen  = [];
    this._s.penDirty    = false;
    this._s.openAcc     = null;
    App.penugasan.markClean();
    this.goPage('penugasan');
  }

  selectGuru(username) {
    if (this._s.penDirty && !confirm('Ada perubahan belum disimpan. Tinggalkan?')) return;
    this._s.currentGuru = this._s.guruList.find(g => g.username === username);
    if (!this._s.currentGuru) return;
    this._s.currentPen = clonePen(this._s.currentGuru);
    this._s.penDirty   = false;
    this._s.openAcc    = null;
    App.penugasan.markClean();

    // Switch to detail page
    document.querySelectorAll('.k-page').forEach(p => p.classList.remove('active'));
    UI.$('k-page-detail').classList.add('active');

    App.penugasan.renderM();
  }

  renderGuruList(list = this._s.guruList) {
    const el      = UI.$('kGuruListM');
    const countEl = UI.$('kGuruCountM');
    if (!el) return;
    if (countEl) countEl.textContent = list.length + ' guru';

    el.innerHTML = list.length
      ? list.map((g, i) => {
          const totalKelas = new Set((g.penugasan || []).flatMap(p => p.kelas || [])).size;
          const hasAny     = (g.penugasan || []).length > 0;
          return `
          <button class="k-guru-card" onclick="App.mobile.selectGuru('${g.username}')">
            <div class="k-guru-av" style="background:${avatarColor(i)}">${initials(g.nama)}</div>
            <div style="flex:1;text-align:left">
              <div class="k-guru-av-name">${g.nama}</div>
              <div class="k-guru-av-sub">${hasAny ? `${(g.penugasan || []).length} mapel · ${totalKelas} kelas` : 'Belum ditugaskan'}</div>
            </div>
            <div class="k-guru-status">
              <div class="k-guru-dot ${hasAny ? 'ok' : 'empty'}"></div>
              <div class="k-guru-chevron">›</div>
            </div>
          </button>`;
        }).join('')
      : '<div class="k-empty"><div class="k-empty-icon">👨‍🏫</div><div class="k-empty-sub">Tidak ada guru ditemukan</div></div>';
  }

  filterGuru(q) {
    const filtered = this._s.guruList.filter(g =>
      g.nama.toLowerCase().includes(q.toLowerCase()) || (g.nip || '').includes(q));
    this.renderGuruList(filtered);
  }

  updateHomeStats() {
    const { guruList, mapelList, kelasList } = this._s;
    const assigned = guruList.filter(g => (g.penugasan || []).length > 0).length;
    UI.$('kStatGuru').textContent     = guruList.length;
    UI.$('kStatMapel').textContent    = mapelList.length;
    UI.$('kStatKelas').textContent    = kelasList.length;
    UI.$('kStatAssigned').textContent = assigned;
  }
}
