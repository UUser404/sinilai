/**
 * guru/modules/profil.js
 * ProfilModule — Halaman Profil + Pengaturan Akun guru.
 * Fitur:
 *   - Tampilkan info akun (nama, username, NIP, mapel, kelas)
 *   - Form ganti password dengan validasi kekuatan
 *   - Tombol logout
 */
class ProfilModule {
  constructor() {
    this._guru = null;
    this._saving = false;
  }

  setGuru(guru) { this._guru = guru; }

  render() {
    const guru = this._guru;
    if (!guru) return;

    const inisial   = Formatter.inisial(guru.nama);
    const mapelList = (guru.mapel || []).join(', ') || '—';
    const kelasList = (guru.kelas || []).join(', ') || '—';

    UI.$('profil-content').innerHTML = `
      <!-- Avatar & nama -->
      <div class="pf-header">
        <div class="pf-avatar">${inisial}</div>
        <div class="pf-nama">${guru.nama}</div>
        <div class="pf-role">Guru · ${guru.role || 'guru'}</div>
        ${guru.nip ? `<div class="pf-nip">NIP: ${guru.nip}</div>` : ''}
      </div>

      <!-- Info card -->
      <div class="pf-card">
        <div class="pf-card-title">Informasi Akun</div>
        <div class="pf-row">
          <span class="pf-label">Nama Lengkap</span>
          <span class="pf-value">${guru.nama}</span>
        </div>
        <div class="pf-row">
          <span class="pf-label">Username</span>
          <span class="pf-value pf-monospace">${guru.username || '—'}</span>
        </div>
        ${guru.nip ? `
        <div class="pf-row">
          <span class="pf-label">NIP</span>
          <span class="pf-value pf-monospace">${guru.nip}</span>
        </div>` : ''}
        <div class="pf-row">
          <span class="pf-label">Mata Pelajaran</span>
          <span class="pf-value">${mapelList}</span>
        </div>
        <div class="pf-row pf-row-last">
          <span class="pf-label">Kelas yang Diajar</span>
          <span class="pf-value">${kelasList}</span>
        </div>
      </div>

      <!-- Ganti Password -->
      <div class="pf-card">
        <div class="pf-card-title">🔐 Ganti Password</div>
        <div class="pf-pass-form">
          <div class="pf-field">
            <label>Password Saat Ini</label>
            <div class="pf-pass-wrap">
              <input type="password" id="pfOldPass" placeholder="Password lama..." autocomplete="current-password" />
              <button type="button" class="pf-eye-btn" onclick="ProfilModule._togglePass('pfOldPass', this)" tabindex="-1">
                ${ProfilModule._eyeSvg()}
              </button>
            </div>
          </div>
          <div class="pf-field">
            <label>Password Baru</label>
            <div class="pf-pass-wrap">
              <input type="password" id="pfNewPass" placeholder="Min. 8 karakter + angka..." autocomplete="new-password"
                     oninput="ProfilModule._checkStrength(this.value)" />
              <button type="button" class="pf-eye-btn" onclick="ProfilModule._togglePass('pfNewPass', this)" tabindex="-1">
                ${ProfilModule._eyeSvg()}
              </button>
            </div>
            <div class="pf-strength" id="pfStrength" style="display:none"></div>
          </div>
          <div class="pf-field">
            <label>Konfirmasi Password Baru</label>
            <div class="pf-pass-wrap">
              <input type="password" id="pfConfirmPass" placeholder="Ulangi password baru..." autocomplete="new-password" />
              <button type="button" class="pf-eye-btn" onclick="ProfilModule._togglePass('pfConfirmPass', this)" tabindex="-1">
                ${ProfilModule._eyeSvg()}
              </button>
            </div>
          </div>
          <div class="pf-pass-error" id="pfPassError" style="display:none"></div>
          <button class="pf-save-btn" id="pfSaveBtn" onclick="ProfilModule._save()">
            💾 Simpan Password Baru
          </button>
        </div>
      </div>

      <!-- App info -->
      <div class="pf-card">
        <div class="pf-card-title">Tentang Aplikasi</div>
        <div class="pf-row">
          <span class="pf-label">Aplikasi</span>
          <span class="pf-value">SiNilai Portal Guru</span>
        </div>
        <div class="pf-row pf-row-last">
          <span class="pf-label">Versi</span>
          <span class="pf-value">v1.0.0</span>
        </div>
      </div>

      <!-- Logout -->
      <button class="pf-logout-btn" onclick="App.logout()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Keluar dari Akun
      </button>
    `;

    // Bind ke static methods agar tetap bisa dipanggil dari inline onclick
    ProfilModule._guru = guru;
  }

  // ── Static helpers (dipanggil dari HTML inline) ──────────

  static _guru = null;
  static _saving = false;

  static _eyeSvg() {
    return `<svg class="pf-eye-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path class="eye-open" d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>
      <path class="eye-closed" style="display:none" d="M3 3l14 14M10 4C5.5 4 2 10 2 10s1 1.5 2.5 3M17.5 7C19 8.5 18 10 18 10s-3.5 6-8 6a7.2 7.2 0 01-3-.65" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  static _togglePass(inputId, btn) {
    const input    = document.getElementById(inputId);
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    const open   = btn.querySelector('.eye-open');
    const closed = btn.querySelector('.eye-closed');
    if (open)   open.style.display   = isHidden ? 'none' : '';
    if (closed) closed.style.display = isHidden ? '' : 'none';
    input.focus();
  }

  static _checkStrength(val) {
    const el = UI.$('pfStrength');
    if (!el) return;
    if (!val) { el.style.display = 'none'; return; }

    const result = Security.validatePasswordStrength(val);
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasNum   = /[0-9]/.test(val);
    const hasSpec  = /[^A-Za-z0-9]/.test(val);
    const len      = val.length;

    let score = 0;
    if (len >= 8)   score++;
    if (len >= 12)  score++;
    if (hasUpper)   score++;
    if (hasLower)   score++;
    if (hasNum)     score++;
    if (hasSpec)    score++;

    const levels = [
      { label: 'Sangat Lemah', color: '#ef4444', pct: 16 },
      { label: 'Lemah',        color: '#f97316', pct: 32 },
      { label: 'Cukup',        color: '#eab308', pct: 50 },
      { label: 'Baik',         color: '#22c55e', pct: 66 },
      { label: 'Kuat',         color: '#16a34a', pct: 83 },
      { label: 'Sangat Kuat',  color: '#15803d', pct: 100 },
    ];
    const lv = levels[Math.min(score, 5)];

    el.style.display = 'block';
    el.innerHTML = `
      <div class="pf-strength-bar">
        <div class="pf-strength-fill" style="width:${lv.pct}%;background:${lv.color}"></div>
      </div>
      <span class="pf-strength-label" style="color:${lv.color}">${lv.label}</span>
    `;
  }

  static _showError(msg) {
    const el = UI.$('pfPassError');
    if (!el) return;
    el.textContent   = '⚠ ' + msg;
    el.style.display = 'block';
  }

  static _hideError() {
    const el = UI.$('pfPassError');
    if (el) el.style.display = 'none';
  }

  static async _save() {
    if (ProfilModule._saving) return;

    const oldPass  = UI.$('pfOldPass')?.value  || '';
    const newPass  = UI.$('pfNewPass')?.value  || '';
    const confPass = UI.$('pfConfirmPass')?.value || '';

    ProfilModule._hideError();

    // Validasi dasar
    if (!oldPass)  { ProfilModule._showError('Masukkan password saat ini'); return; }
    if (!newPass)  { ProfilModule._showError('Masukkan password baru'); return; }
    if (!confPass) { ProfilModule._showError('Konfirmasi password baru'); return; }

    if (newPass !== confPass) {
      ProfilModule._showError('Password baru dan konfirmasi tidak cocok');
      return;
    }

    const strength = Security.validatePasswordStrength(newPass);
    if (!strength.ok) {
      ProfilModule._showError(strength.msg);
      return;
    }

    if (oldPass === newPass) {
      ProfilModule._showError('Password baru harus berbeda dari password lama');
      return;
    }

    const guru = ProfilModule._guru;
    if (!guru) { ProfilModule._showError('Sesi tidak valid, silakan login ulang'); return; }

    // Set loading
    ProfilModule._saving = true;
    const btn = UI.$('pfSaveBtn');
    if (btn) { btn.textContent = '⏳ Menyimpan...'; btn.disabled = true; }

    try {
      // Hash password lama dan baru sebelum kirim ke server
      const [hashedOld, hashedNew] = await Promise.all([
        Security.hashPasswordAsync(oldPass),
        Security.hashPasswordAsync(newPass),
      ]);

      const res = await api.changePassword({
        username:    guru.username,
        oldPassword: hashedOld,
        newPassword: hashedNew,
      });

      if (res.status === 'ok') {
        UI.showToast('✅ Password berhasil diubah', 'success');
        // Bersihkan form
        ['pfOldPass', 'pfNewPass', 'pfConfirmPass'].forEach(id => {
          const el = UI.$(id);
          if (el) el.value = '';
        });
        const str = UI.$('pfStrength');
        if (str) str.style.display = 'none';
        ProfilModule._hideError();
      } else {
        ProfilModule._showError(res.message || 'Gagal mengubah password');
      }
    } catch (e) {
      console.error('changePassword error:', e);
      ProfilModule._showError('Gagal terhubung ke server. Periksa koneksi internet. (' + e.message + ')');
    } finally {
      ProfilModule._saving = false;
      if (btn) { btn.textContent = '💾 Simpan Password Baru'; btn.disabled = false; }
    }
  }
}
