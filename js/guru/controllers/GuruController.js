/**
 * guru/controllers/GuruController.js
 * GuruController — orkestrasi semua modul halaman guru.
 *
 * Navigasi:
 *   - Desktop (>768px): sidebar dengan dropdown grup
 *   - Mobile (≤768px) : bottom navigation bar + halaman Beranda & Profil
 */
class GuruController {
  constructor() {
    this.nilaiMod  = new NilaiModule();
    this.excelMod  = new ExcelModule(this.nilaiMod);
    this.analisis  = new AnalisisModule(this.nilaiMod);
    this.exportMod = new ExportModule();
    this.homeMod   = new HomeModule(this.nilaiMod, this.analisis);
    this.profilMod = new ProfilModule();
    this._auth     = new AuthService('guru', {
      onSuccess: (guru) => this._enterApp(guru),
      onError:   (msg)  => this._showLoginError(msg),
    });
    this._guru       = null;
    this._activePage = 'nilai';
    this._bindEvents();
    this._bindBus();
  }

  // ── Navigasi Sidebar (desktop) ────────────────────────────

  showPage(pageId, btnEl) {
    // Update active sidebar nav
    document.querySelectorAll('.g-nav-item').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    else document.querySelector(`.g-nav-item[data-page="${pageId}"]`)?.classList.add('active');

    // Sembunyikan semua halaman, tampilkan yang dipilih
    document.querySelectorAll('.g-page').forEach(p => p.classList.remove('active'));
    UI.$(`g-page-${pageId}`)?.classList.add('active');
    this._activePage = pageId;

    if (window.innerWidth <= 768) this.closeSidebar();

    if (pageId === 'dashboard') this.analisis.renderDashboard();
    if (pageId === 'ranking')   this.analisis.renderRanking();
    if (pageId === 'export')    this.exportMod.renderPage();
    if (pageId === 'profil')    this.profilMod.render();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Navigasi dari bottom nav mobile */
  showBottomPage(pageId) {
    // Update active bottom nav
    document.querySelectorAll('.bn-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.bn-btn[data-page="${pageId}"]`)?.classList.add('active');

    // Sembunyikan semua halaman mobile
    document.querySelectorAll('.g-page').forEach(p => p.classList.remove('active'));
    UI.$(`g-page-${pageId}`)?.classList.add('active');
    this._activePage = pageId;

    if (pageId === 'home')      this.homeMod.render();
    if (pageId === 'dashboard') this.analisis.renderDashboard();
    if (pageId === 'ranking')   this.analisis.renderRanking();
    if (pageId === 'export')    this.exportMod.renderPage();
    if (pageId === 'profil')    this.profilMod.render();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Dipanggil dari HomeModule saat tap baris kelas */
  bukaKelas(kelas, mapel) {
    // Set dropdown ke kelas & mapel yang dipilih lalu pindah ke Input Nilai
    if (window.innerWidth <= 768) {
      this.showBottomPage('nilai');
      document.querySelector(`.bn-btn[data-page="nilai"]`)?.classList.add('active');
    } else {
      this.showPage('nilai', document.querySelector('.g-nav-item[data-page="nilai"]'));
    }
    // Set context selects
    setTimeout(() => {
      const mapelSel = UI.$('ctxMapel');
      const kelasSel = UI.$('ctxKelas');
      if (mapelSel) mapelSel.value = mapel;
      if (kelasSel) kelasSel.value = kelas;
    }, 50);
  }

  toggleGroup(groupId) {
    const group = UI.$(groupId);
    if (!group) return;
    const isOpen = group.classList.contains('open');
    group.classList.toggle('open', !isOpen);
    sessionStorage.setItem(`nav_group_${groupId}`, !isOpen ? '1' : '0');
  }

  toggleSidebar() {
    UI.$('appScreen').classList.contains('g-sidebar-open')
      ? this.closeSidebar() : this.openSidebar();
  }

  openSidebar() {
    UI.$('appScreen').classList.add('g-sidebar-open');
    UI.$('g-sidebar-overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  closeSidebar() {
    UI.$('appScreen').classList.remove('g-sidebar-open');
    UI.$('g-sidebar-overlay').classList.remove('show');
    document.body.style.overflow = '';
  }

  // ── Input Nilai ──────────────────────────────────────────

  login() {
    const username = UI.$('loginUser').value.trim();
    const password = UI.$('loginPass').value.trim();
    this._setLoginLoading(true);
    this._auth.login(username, password)
      .finally(() => this._setLoginLoading(false));
  }

  logout() {
    if (this.nilaiMod.hasChanges && !confirm('Ada perubahan yang belum disimpan. Keluar?')) return;
    this._auth.logout();
    this._exitApp();
  }

  async loadSiswa() {
    const ctx = this._getCtx();
    if (!ctx) { UI.showToast('Lengkapi semua pilihan konteks terlebih dahulu', 'error'); return; }

    sessionService.saveKonteks(ctx);
    if (this.nilaiMod.hasChanges && !confirm('Ada perubahan belum disimpan. Lanjutkan ganti kelas?')) return;

    UI.showLoading('Memuat daftar siswa...');
    try {
      const [resSiswa, resNilai] = await Promise.all([
        api.getSiswa(ctx.kelas),
        api.getNilai(ctx),
      ]);
      this.nilaiMod.render(
        resSiswa.siswa || [],
        resNilai.nilai || {},
        { ...ctx, jumlah: (resSiswa.siswa || []).length }
      );
    } catch {
      UI.showToast('Gagal memuat data siswa', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  async saveNilai() {
    if (this.nilaiMod.hasInvalidInputs()) {
      UI.showToast('Ada nilai tidak valid (harus 0–100)', 'error'); return;
    }
    const ctx = this._getCtx();
    UI.showLoading('Menyimpan nilai…');
    UI.$('btnSave').disabled = true;
    try {
      const res = await api.saveNilai({
        ...ctx, namaGuru: this._guru.nama, data: this.nilaiMod.data,
      });
      if (res.status === 'ok') {
        UI.showToast('✓ Semua nilai berhasil disimpan!', 'success');
        this.nilaiMod.clearModified();
      } else {
        UI.showToast('Gagal: ' + (res.message || 'Error'), 'error');
      }
    } catch (e) {
      UI.showToast('Gagal: ' + e.message, 'error');
    } finally {
      UI.hideLoading();
      UI.$('btnSave').disabled = false;
    }
  }

  resetChanges() {
    if (!this.nilaiMod.hasChanges) return;
    if (!confirm('Reset semua perubahan yang belum disimpan?')) return;
    this.nilaiMod.reset();
  }

  kembaliKeFilter() {
    if (this.nilaiMod.hasChanges && !confirm('Ada perubahan belum disimpan. Kembali?')) return;
    UI.$('tableCard').style.display = 'none';
    document.querySelector('.step-header').style.display = 'block';
    this.nilaiMod.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  downloadFormat() { this.excelMod.downloadFormat(); }
  uploadNilai(inp) { this.excelMod.upload(inp); }

  // ── Private: App state ───────────────────────────────────

  _enterApp(guru) {
    this._guru = guru;
    this.exportMod.setGuru(guru);
    this.homeMod.setGuru(guru);
    this.profilMod.setGuru(guru);
    document.body.classList.add('app-ready');
    UI.$('loginScreen').style.display = 'none';
    UI.$('appScreen').style.display   = 'flex';
    UI.$('userName').textContent       = guru.nama;
    UI.$('userAvatar').textContent     = Formatter.inisial(guru.nama);
    this._populateSelects();
    this._restoreGroupStates();

    // Pilih halaman awal sesuai ukuran layar
    if (window.innerWidth <= 768) {
      this.showBottomPage('home');
      document.querySelector('.bn-btn[data-page="home"]')?.classList.add('active');
    } else {
      this.showPage('nilai', document.querySelector('.g-nav-item[data-page="nilai"]'));
    }
  }

  _exitApp() {
    this._guru = null;
    document.body.classList.remove('app-ready');
    UI.$('loginScreen').style.display = 'flex';
    UI.$('appScreen').style.display   = 'none';
    ['loginUser','loginPass'].forEach(id => UI.$(id).value = '');
    UI.$('loginError').style.display  = 'none';
    UI.$('tableCard').style.display   = 'none';
    this.closeSidebar();
  }

  _populateSelects() {
    const mapelSel = UI.$('ctxMapel');
    const kelasSel = UI.$('ctxKelas');
    mapelSel.innerHTML = '<option value="">— Pilih —</option>';
    kelasSel.innerHTML = '<option value="">— Pilih —</option>';
    (this._guru.mapel || []).forEach(m => mapelSel.innerHTML += `<option>${m}</option>`);
    (this._guru.kelas || []).forEach(k => kelasSel.innerHTML += `<option>${k}</option>`);
  }

  _getCtx() {
    const tahun    = UI.$('ctxTahun').value;
    const semester = UI.$('ctxSemester').value;
    const mapel    = UI.$('ctxMapel').value;
    const kelas    = UI.$('ctxKelas').value;
    if (!tahun || !semester || !mapel || !kelas) return null;
    return { tahun, semester, mapel, kelas };
  }

  _showLoginError(msg) {
    const el = UI.$('loginError');
    el.textContent   = '⚠ ' + msg;
    el.style.display = 'block';
  }

  _setLoginLoading(on) {
    UI.$('btnLogin').disabled        = on;
    UI.$('loginBtnText').textContent = on ? 'Memverifikasi...' : 'Masuk →';
  }

  _restoreGroupStates() {
    ['nav-group-nilai'].forEach(id => {
      const saved = sessionStorage.getItem(`nav_group_${id}`);
      UI.$(id)?.classList.toggle('open', saved === null ? true : saved === '1');
    });
  }

  _bindEvents() {
    document.addEventListener('DOMContentLoaded', () => this._restoreSession());
    UI.bindEnterKey(['loginUser', 'loginPass'], () => this.login());
    window.addEventListener('beforeunload', e => {
      if (this.nilaiMod.hasChanges) { e.preventDefault(); e.returnValue = ''; }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) this.closeSidebar();
    });
  }

  _bindBus() {
    bus.on('nilai:saved', () => {
      if (this._activePage === 'home')      this.homeMod.render();
      if (this._activePage === 'dashboard') this.analisis.renderDashboard();
      if (this._activePage === 'ranking')   this.analisis.renderRanking();
    });
  }

  _restoreSession() {
    const guru = this._auth.restoreSession();
    if (!guru) return;
    this._enterApp(guru);

    const ctx = sessionService.loadKonteks();
    if (!ctx) return;
    UI.$('ctxTahun').value    = ctx.tahun    || '';
    UI.$('ctxSemester').value = ctx.semester || '';
    setTimeout(() => {
      UI.$('ctxMapel').value = ctx.mapel || '';
      UI.$('ctxKelas').value = ctx.kelas || '';
      if (ctx.tahun && ctx.semester && ctx.mapel && ctx.kelas) this.loadSiswa();
    }, 50);
  }
}

const App      = new GuruController();
const nilaiMod = App.nilaiMod;
