/**
 * admin/controllers/AdminController.js
 * AdminController — orkestrasi semua modul halaman admin.
 * Zero business logic: hanya routing, event binding, dan delegasi ke modul.
 */
class AdminController {
  constructor() {
    // ── Inisialisasi modul ──
    this.dashboard = new DashboardModule();
    this.guru      = new GuruModule();
    this.siswa     = new SiswaModule();
    this.nilai     = new NilaiAdminModule();
    this.history   = new HistoryModule();

    this._auth     = new AuthService('admin', {
      onSuccess: (user) => this._enterApp(user),
      onError:   (msg)  => {
        const el = UI.$('loginErr');
        el.textContent   = '⚠ ' + msg;
        el.style.display = 'block';
      },
    });

    this._admin = null;

    this._bindEvents();
  }

  // ── Public API (dipanggil dari HTML onclick) ──────────────

  login() {
    const u = UI.$('loginUser').value.trim();
    const p = UI.$('loginPass').value;
    const btn = document.querySelector('.btn-login');
    btn.textContent = 'Memverifikasi...';
    btn.disabled    = true;
    this._auth.login(u, p).finally(() => {
      btn.textContent = 'Masuk sebagai Admin';
      btn.disabled    = false;
    });
  }

  logout() {
    this._auth.logout();
    this._exitApp();
  }

  showPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    UI.$(`page-${id}`)?.classList.add('active');
    btn.classList.add('active');

    const loaders = {
      dashboard: () => this.dashboard.load(),
      guru:      () => this.guru.load(),
      siswa:     () => this.siswa.load(),
      nilai:     () => Promise.all([this.guru.load(), this.siswa.load()])
                         .then(() => this.nilai.populateFilterSelects(
                           this.guru.data, this.siswa.data
                         )),
      export:    () => Promise.all([this.guru.load(), this.siswa.load()])
                         .then(() => this.nilai.populateFilterSelects(
                           this.guru.data, this.siswa.data
                         )),
      history:   () => this.history.load(),
    };
    loaders[id]?.();

    if (window.innerWidth <= 768) this.closeSidebar();
  }

  toggleSidebar() {
    UI.$('appScreen').classList.contains('open')
      ? this.closeSidebar()
      : this.openSidebar();
  }

  openSidebar() {
    UI.$('appScreen').classList.add('open');
    UI.$('sidebarOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  closeSidebar() {
    UI.$('appScreen').classList.remove('open');
    UI.$('sidebarOverlay').classList.remove('show');
    document.body.style.overflow = '';
  }

  // ── Private: App state ────────────────────────────────────

  _enterApp(user) {
    this._admin = user;
    document.body.classList.add('app-ready');
    UI.$('loginScreen').style.display  = 'none';
    UI.$('appScreen').style.display    = 'flex';
    UI.$('mainArea').style.display     = 'block';
    UI.$('adminName').textContent      = user;
    this.dashboard.load();
  }

  _exitApp() {
    this._admin = null;
    document.body.classList.remove('app-ready');
    this.dashboard.cancelAutoRefresh();
    this.dashboard.stopClock();
    UI.$('loginScreen').style.display   = 'flex';
    UI.$('appScreen').style.display     = 'none';
    UI.$('mainArea').style.display      = 'none';
    UI.$('mobileTopbar').style.display  = 'none';
    this.closeSidebar();
  }

  // ── Private: Event binding ────────────────────────────────

  _bindEvents() {
    document.addEventListener('DOMContentLoaded', () => {
      this.dashboard.startClock();
      const user = this._auth.restoreSession();
      if (user) this._enterApp(user);
    });

    UI.bindEnterKey(['loginUser', 'loginPass'], () => this.login());

    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeSidebar();
        // CSS media query menyembunyikan di desktop; reset inline style
        UI.$('mobileTopbar').style.display = '';
      } else {
        if (this._admin) UI.$('mobileTopbar').style.display = 'flex';
      }
    });
  }
}

// ── Global helpers (dipanggil dari HTML) ─────────────────────
function openModal(id)  { UI.$(id)?.classList.add('show'); }
function closeModal(id) { UI.$(id)?.classList.remove('show'); }

function filterTable(tbodyId, query) {
  const q = query.toLowerCase();
  document.querySelectorAll(`#${tbodyId} tr`).forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Global instance ──────────────────────────────────────────
const Admin = new AdminController();
