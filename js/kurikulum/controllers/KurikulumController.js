/**
 * js/kurikulum/controllers/KurikulumController.js
 * KurikulumController — orkestrasi login, data loading, dan delegasi ke modul.
 * Zero business logic: hanya routing, event binding, dan inisialisasi modul.
 */

// ── Shared state (dibagi antar modul) ────────────────────────────────────────
const _state = {
  guruList        : [],
  mapelList       : [],
  kelasList       : [],
  tingkatMap      : {},
  currentGuru     : null,
  currentPen      : [],
  penDirty        : false,
  openAcc         : null,
  currentMobilePage: 'home',
  filterSemester  : '',
  filterTahun     : '',
};

// ── Shared helpers ───────────────────────────────────────────────────────────
const DOT_COLORS    = ['dot-blue','dot-green','dot-amber','dot-purple','dot-rose',
                       'dot-cyan','dot-orange','dot-teal','dot-indigo','dot-lime'];
const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#a78bfa','#f43f5e',
                       '#06b6d4','#f97316','#14b8a6','#6366f1','#84cc16'];

function initials(nama)   { return nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function avatarColor(i)   { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }
function clonePen(guru)   { return (guru.penugasan || []).map(p => ({ mapel: p.mapel, kelas: [...(p.kelas || [])] })); }
function openModal(id)    { UI.$(id)?.classList.add('show'); }
function closeModal(id)   { UI.$(id)?.classList.remove('show'); }

function buildTingkatMap(list) {
  const ROMAWI = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12, XIII:13 };
  const map    = {};
  list.forEach(k => {
    let tingkat;
    // Format SMA: Romawi + strip, contoh X-1, XI-2, XII-4
    const sma = k.match(/^(X{0,3}(?:IX|IV|V?I{0,3}))-\d/i);
    if (sma) {
      tingkat = 'Kelas ' + sma[1].toUpperCase();
    } else {
      // Format SMP: angka di depan, contoh 7A, 8B, 9C
      const smp = k.match(/^(\d+)/);
      tingkat = smp ? 'Kelas ' + smp[1] : 'Lainnya';
    }
    if (!map[tingkat]) map[tingkat] = [];
    map[tingkat].push(k);
  });

  // Sort: SMP numerik dulu, lalu SMA urut Romawi, lalu Lainnya
  const sorted = {};
  Object.keys(map)
    .sort((a, b) => {
      const ka = a.replace('Kelas ', '').trim();
      const kb = b.replace('Kelas ', '').trim();
      const na = parseInt(ka) || ROMAWI[ka.toUpperCase()] || 999;
      const nb = parseInt(kb) || ROMAWI[kb.toUpperCase()] || 999;
      return na - nb;
    })
    .forEach(k => { sorted[k] = map[k].sort(); });
  return sorted;
}

// ── Controller ───────────────────────────────────────────────────────────────
class KurikulumController {
  constructor() {
    this.penugasan = new PenugasanModule(_state);
    this.mapel     = new MapelModule(_state);
    this.mobile    = new MobileModule(_state);
    this.rekap     = new RekapModule(_state);
    this.analisis  = new AnalisisModule(_state);

    this._bindEvents();
    this._restoreSession();
  }

  // ── Public API (dipanggil dari HTML onclick) ──────────────────────────────

  async login() {
    const username = UI.$('loginUser').value.trim();
    const password = UI.$('loginPass').value;
    if (!username || !password) {
      this._showLoginErr('Username dan password wajib diisi'); return;
    }
    UI.showLoading('Masuk...');
    try {
      // Hash password sebelum dikirim ke Apps Script (SHA-256 + salt), sama seperti guru & admin
      const hashedPass = await Security.hashPasswordAsync(password);
      const res = await api.login(username, hashedPass);
      if (res.status === 'ok' && res.role === 'kurikulum') {
        sessionStorage.setItem('sinilai_kuri_session', JSON.stringify({ username, nama: res.nama || username }));
        UI.hideLoading();
        this._showApp(res.nama || username);
      } else if (res.status === 'ok') {
        UI.hideLoading();
        this._showLoginErr('Akun ini tidak memiliki akses kurikulum');
      } else {
        UI.hideLoading();
        this._showLoginErr(res.message || 'Login gagal');
      }
    } catch {
      UI.hideLoading();
      this._showLoginErr('Gagal terhubung ke server');
    }
  }

  logout() {
    if (!confirm('Keluar dari dashboard kurikulum?')) return;
    sessionStorage.removeItem('sinilai_kuri_session');
    location.reload();
  }

  showPage(page, btn) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');

    const layout = document.querySelector('.kuri-layout');

    if (page === 'penugasan') {
      layout?.classList.remove('mapel-mode');
      UI.$('kuriListPanel').style.display     = '';
      UI.$('kdTopbarPenugasan').style.display = '';
      UI.$('kdTopbarMapel').style.display     = 'none';
      UI.$('kdTopbarRekap').style.display     = 'none';
      UI.$('pagePenugasan').style.display     = '';
      UI.$('pageMapel').classList.remove('active');
      UI.$('pageRekap').style.display         = 'none';
      UI.$('pageAnalisis').style.display      = 'none';
      UI.$('kdTopbarAnalisis').style.display  = 'none';
      UI.$('savePenugasanBar').style.display  = '';
    } else if (page === 'rekap') {
      layout?.classList.add('mapel-mode');
      UI.$('kuriListPanel').style.display     = 'none';
      UI.$('kdTopbarPenugasan').style.display = 'none';
      UI.$('kdTopbarMapel').style.display     = 'none';
      UI.$('kdTopbarRekap').style.display     = '';
      UI.$('kdTopbarAnalisis').style.display  = 'none';
      UI.$('pagePenugasan').style.display     = 'none';
      UI.$('pageMapel').classList.remove('active');
      UI.$('pageRekap').style.display         = '';
      UI.$('pageAnalisis').style.display      = 'none';
      UI.$('savePenugasanBar').style.display  = 'none';
      this.rekap.render();
    } else if (page === 'analisis') {
      layout?.classList.add('mapel-mode');
      UI.$('kuriListPanel').style.display     = 'none';
      UI.$('kdTopbarPenugasan').style.display = 'none';
      UI.$('kdTopbarMapel').style.display     = 'none';
      UI.$('kdTopbarRekap').style.display     = 'none';
      UI.$('kdTopbarAnalisis').style.display  = '';
      UI.$('pagePenugasan').style.display     = 'none';
      UI.$('pageMapel').classList.remove('active');
      UI.$('pageRekap').style.display         = 'none';
      UI.$('pageAnalisis').style.display      = '';
      UI.$('savePenugasanBar').style.display  = 'none';
      this.analisis.render();
    } else {
      layout?.classList.add('mapel-mode');
      UI.$('kuriListPanel').style.display     = 'none';
      UI.$('kdTopbarPenugasan').style.display = 'none';
      UI.$('kdTopbarMapel').style.display     = '';
      UI.$('kdTopbarRekap').style.display     = 'none';
      UI.$('pagePenugasan').style.display     = 'none';
      UI.$('pageMapel').classList.add('active');
      UI.$('pageRekap').style.display         = 'none';
      UI.$('pageAnalisis').style.display      = 'none';
      UI.$('kdTopbarAnalisis').style.display  = 'none';
      UI.$('savePenugasanBar').style.display  = 'none';
      this.mapel.render();
    }
  }

  // ── Desktop guru list ─────────────────────────────────────────────────────
  renderGuruList(list = _state.guruList) {
    UI.$('guruCountBadge').textContent = `(${list.length})`;
    UI.$('guruItems').innerHTML = list.length
      ? list.map((g, i) => {
          const totalKelas = new Set((g.penugasan || []).flatMap(p => p.kelas || [])).size;
          const hasAny     = (g.penugasan || []).length > 0;
          const active     = _state.currentGuru?.username === g.username ? 'active' : '';
          return `
          <div class="guru-entry ${active}" onclick="App.selectGuru('${g.username}')">
            <div class="ge-av" style="background:${avatarColor(i)}">${initials(g.nama)}</div>
            <div>
              <div class="ge-name">${g.nama}</div>
              <div class="ge-sub">${hasAny ? `${(g.penugasan || []).length} mapel · ${totalKelas} kelas` : 'Belum ditugaskan'}</div>
            </div>
            <div class="ge-dot ${hasAny ? 'ok' : 'empty'}"></div>
          </div>`;
        }).join('')
      : '<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">Tidak ada guru</div>';
  }

  filterGuru(q) {
    const filtered = _state.guruList.filter(g =>
      g.nama.toLowerCase().includes(q.toLowerCase()) || (g.nip || '').includes(q));
    this.renderGuruList(filtered);
  }

  selectGuru(username) {
    if (_state.penDirty && !confirm('Ada perubahan belum disimpan. Tinggalkan?')) return;
    _state.currentGuru = _state.guruList.find(g => g.username === username);
    if (!_state.currentGuru) return;
    _state.currentPen = clonePen(_state.currentGuru);
    _state.penDirty   = false;
    _state.openAcc    = null;
    this.penugasan.markClean();
    this.renderGuruList();
    this.penugasan.render();
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async loadAll() {
    UI.showLoading('Memuat data...');
    try {
      const [resGuru, resMapel, resSiswa] = await Promise.all([
        api.getGuru(),
        api.getMapel(),
        api.getSiswaAll(),
      ]);

      if (resGuru.status === 'ok') {
        _state.guruList = (resGuru.guru || [])
          .filter(g => g.role === 'guru' || !g.role);
      }

      if (resMapel.status === 'ok') _state.mapelList = resMapel.mapel || [];

      if (resSiswa.status === 'ok') {
        // Kelas unik dari data siswa, sort numerik lalu alfabet
        _state.kelasList = [...new Set(
          (resSiswa.siswa || []).map(s => String(s.kelas || '').trim()).filter(Boolean)
        )].sort((a, b) => {
          const na = parseInt(a) || 0, nb = parseInt(b) || 0;
          if (na !== nb) return na - nb;
          return a.localeCompare(b);
        });
        _state.tingkatMap = buildTingkatMap(_state.kelasList);
      }

      this.renderGuruList();
      this.mobile.renderGuruList();
      this.mobile.updateHomeStats();
      this.mapel.renderM();
    } catch {
      UI.showToast('Gagal memuat data', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────
  _showLoginErr(msg) {
    const el = UI.$('loginErr');
    el.textContent   = msg;
    el.style.display = 'block';
  }

  _showApp(nama) {
    UI.$('loginScreen').style.display = 'none';
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      UI.$('kMobileTopbar').style.display = 'flex';
      UI.$('kBottomNav').style.display    = 'flex';
      UI.$('kMobilePages').style.display  = 'block';
      UI.$('kHomeName').textContent       = nama;
      UI.$('kProfilName').textContent     = nama;
      UI.$('kProfilAv').textContent       = initials(nama);
    } else {
      UI.$('appScreen').style.display = '';
      UI.$('mainArea').style.display  = '';
      UI.$('kuriName').textContent    = nama;
      document.body.classList.add('app-ready');
    }
    this.loadAll();
  }

  _restoreSession() {
    const sess = sessionStorage.getItem('sinilai_kuri_session');
    if (!sess) return;
    try {
      const { nama } = JSON.parse(sess);
      this._showApp(nama);
    } catch {
      sessionStorage.removeItem('sinilai_kuri_session');
    }
  }

  _bindEvents() {
    UI.bindEnterKey(['loginUser', 'loginPass'], () => this.login());
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
const App = new KurikulumController();
