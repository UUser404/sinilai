/**
 * js/kurikulum/modules/mapel.js
 * MapelModule — CRUD mata pelajaran (desktop + mobile).
 * Edit nama otomatis memperbarui penugasan semua guru.
 */
class MapelModule {
  constructor(state) {
    this._s = state;
  }

  // ── Desktop render ───────────────────────────────
  render() {
    const { mapelList, guruList } = this._s;
    UI.$('mapelTableWrap').innerHTML = mapelList.length
      ? mapelList.map((m, i) => {
          const usage = guruList.filter(g => (g.penugasan || []).some(p => p.mapel === m.nama)).length;
          return `
          <div class="mapel-row-item" id="mr-${i}">
            <div class="mr-dot ${DOT_COLORS[i % DOT_COLORS.length]}"></div>
            <div class="mr-name" id="mrName-${i}">${m.nama}</div>
            <input class="mr-edit-input" id="mrInput-${i}" value="${m.nama}" />
            <span class="mr-usage">${usage} guru</span>
            <div class="mr-actions">
              <button class="btn btn-ghost btn-sm" id="mrEditBtn-${i}"   onclick="App.mapel.startEdit(${i})">Edit</button>
              <button class="btn btn-primary btn-sm" id="mrSaveBtn-${i}" style="display:none" onclick="App.mapel.confirmEdit(${i})">Simpan</button>
              <button class="btn btn-ghost btn-sm" id="mrCancelBtn-${i}" style="display:none" onclick="App.mapel.cancelEdit(${i})">Batal</button>
              <button class="btn btn-danger btn-sm" onclick="App.mapel.confirmHapus(${i})">Hapus</button>
            </div>
          </div>`;
        }).join('')
      : '<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">Belum ada mata pelajaran</div>';
  }

  // ── Mobile render ────────────────────────────────
  renderM() {
    const el = UI.$('kMapelTableM');
    if (!el) return;
    const { mapelList, guruList } = this._s;
    el.innerHTML = mapelList.length
      ? mapelList.map((m, i) => {
          const usage = guruList.filter(g => (g.penugasan || []).some(p => p.mapel === m.nama)).length;
          return `
          <div class="k-mapel-row" id="kmr-${i}">
            <div class="k-mapel-dot ${DOT_COLORS[i % DOT_COLORS.length]}"></div>
            <div class="k-mapel-name" id="kmrName-${i}">${m.nama}</div>
            <input class="k-mapel-edit-input" id="kmrInput-${i}" value="${m.nama}" />
            <span class="k-mapel-usage">${usage} guru</span>
            <div class="k-mapel-btns">
              <button class="btn btn-ghost btn-sm" id="kmrEditBtn-${i}"   onclick="App.mapel.startEditM(${i})">Edit</button>
              <button class="btn btn-primary btn-sm" id="kmrSaveBtn-${i}" style="display:none" onclick="App.mapel.confirmEditM(${i})">✓</button>
              <button class="btn btn-ghost btn-sm" id="kmrCancelBtn-${i}" style="display:none" onclick="App.mapel.cancelEditM(${i})">✕</button>
              <button class="btn btn-danger btn-sm" onclick="App.mapel.confirmHapus(${i})">🗑</button>
            </div>
          </div>`;
        }).join('')
      : '<div class="k-empty" style="padding:28px 0"><div class="k-empty-icon">📚</div><div class="k-empty-sub">Belum ada mata pelajaran</div></div>';
  }

  // ── Desktop edit ─────────────────────────────────
  startEdit(i) {
    UI.$('mrName-'  + i).style.display = 'none';
    UI.$('mrInput-' + i).classList.add('show');
    UI.$('mrEditBtn-'+i).style.display = 'none';
    UI.$('mrSaveBtn-'+i).style.display = '';
    UI.$('mrCancelBtn-'+i).style.display = '';
    UI.$('mrInput-' + i).focus();
  }
  cancelEdit(i) {
    UI.$('mrInput-' + i).value = this._s.mapelList[i].nama;
    UI.$('mrName-'  + i).style.display = '';
    UI.$('mrInput-' + i).classList.remove('show');
    UI.$('mrEditBtn-'+i).style.display = '';
    UI.$('mrSaveBtn-'+i).style.display = 'none';
    UI.$('mrCancelBtn-'+i).style.display = 'none';
  }
  confirmEdit(i) { this._doConfirmEdit(i, UI.$('mrInput-' + i).value.trim(), false); }

  // ── Mobile edit ──────────────────────────────────
  startEditM(i) {
    UI.$('kmrName-'  + i).style.display = 'none';
    UI.$('kmrInput-' + i).classList.add('show');
    UI.$('kmrEditBtn-'+i).style.display = 'none';
    UI.$('kmrSaveBtn-'+i).style.display = '';
    UI.$('kmrCancelBtn-'+i).style.display = '';
    UI.$('kmrInput-' + i).focus();
  }
  cancelEditM(i) {
    UI.$('kmrInput-' + i).value = this._s.mapelList[i].nama;
    UI.$('kmrName-'  + i).style.display = '';
    UI.$('kmrInput-' + i).classList.remove('show');
    UI.$('kmrEditBtn-'+i).style.display = '';
    UI.$('kmrSaveBtn-'+i).style.display = 'none';
    UI.$('kmrCancelBtn-'+i).style.display = 'none';
  }
  confirmEditM(i) { this._doConfirmEdit(i, UI.$('kmrInput-' + i).value.trim(), true); }

  // ── Shared confirm edit ──────────────────────────
  _doConfirmEdit(i, namaBaru, isMobile) {
    const { mapelList, guruList } = this._s;
    const namaLama = mapelList[i].nama;
    if (!namaBaru) { UI.showToast('Nama mapel tidak boleh kosong', 'error'); return; }
    if (namaBaru === namaLama) { isMobile ? this.cancelEditM(i) : this.cancelEdit(i); return; }
    if (mapelList.some((m, j) => j !== i && m.nama.toLowerCase() === namaBaru.toLowerCase())) {
      UI.showToast('Nama mapel sudah ada', 'error'); return;
    }
    const terdampak = guruList.filter(g => (g.penugasan || []).some(p => p.mapel === namaLama));
    if (terdampak.length) {
      this._showDampakModal(
        `Nama mapel "${namaLama}" → "${namaBaru}"`,
        `Penugasan ${terdampak.length} guru berikut akan diperbarui otomatis:`,
        terdampak, () => this._doEdit(i, namaLama, namaBaru)
      );
    } else {
      this._doEdit(i, namaLama, namaBaru);
    }
  }

  async _doEdit(i, namaLama, namaBaru) {
    const { mapelList, guruList } = this._s;
    UI.showLoading('Memperbarui mata pelajaran...');
    try {
      const res = await api.editMapel({ namaLama, namaBaru });
      if (res.status === 'ok') {
        mapelList[i].nama = namaBaru;
        guruList.forEach(g => (g.penugasan || []).forEach(p => { if (p.mapel === namaLama) p.mapel = namaBaru; }));
        if (this._s.currentGuru) {
          this._s.currentPen.forEach(p => { if (p.mapel === namaLama) p.mapel = namaBaru; });
          App.penugasan.render();
          App.penugasan.renderM();
        }
        this.render(); this.renderM();
        App.renderGuruList(); App.mobile.renderGuruList();
        UI.showToast(`✓ Mapel berhasil diubah menjadi "${namaBaru}"`, 'success');
      } else { UI.showToast('Gagal: ' + (res.message || 'Error'), 'error'); }
    } catch { UI.showToast('Gagal terhubung ke server', 'error'); }
    finally  { UI.hideLoading(); }
  }

  // ── Hapus ────────────────────────────────────────
  confirmHapus(i) {
    const { mapelList, guruList } = this._s;
    const nama = mapelList[i].nama;
    const terdampak = guruList.filter(g => (g.penugasan || []).some(p => p.mapel === nama));
    if (terdampak.length) {
      this._showDampakModal(
        `Hapus mata pelajaran "${nama}"?`,
        `⚠️ Penugasan "${nama}" akan dihapus dari ${terdampak.length} guru berikut:`,
        terdampak, () => this._doHapus(i, nama)
      );
    } else {
      if (!confirm(`Hapus mata pelajaran "${nama}"?`)) return;
      this._doHapus(i, nama);
    }
  }

  async _doHapus(i, nama) {
    const { mapelList, guruList } = this._s;
    UI.showLoading('Menghapus mata pelajaran...');
    try {
      const res = await api.deleteMapel({ nama });
      if (res.status === 'ok') {
        mapelList.splice(i, 1);
        guruList.forEach(g => { if (g.penugasan) g.penugasan = g.penugasan.filter(p => p.mapel !== nama); });
        if (this._s.currentGuru) {
          this._s.currentPen = this._s.currentPen.filter(p => p.mapel !== nama);
          App.penugasan.render();
          App.penugasan.renderM();
        }
        this.render(); this.renderM();
        App.renderGuruList(); App.mobile.renderGuruList();
        App.mobile.updateHomeStats();
        UI.showToast(`✓ Mapel "${nama}" berhasil dihapus`, 'success');
      } else { UI.showToast('Gagal: ' + (res.message || 'Error'), 'error'); }
    } catch { UI.showToast('Gagal terhubung ke server', 'error'); }
    finally  { UI.hideLoading(); }
  }

  // ── Tambah desktop ───────────────────────────────
  async tambah() {
    const nama = UI.$('newMapelInput').value.trim();
    await this._doTambah(nama, () => { UI.$('newMapelInput').value = ''; });
  }

  // ── Tambah mobile ────────────────────────────────
  async tambahM() {
    const nama = UI.$('kNewMapelM').value.trim();
    await this._doTambah(nama, () => { UI.$('kNewMapelM').value = ''; });
  }

  async _doTambah(nama, onSuccess) {
    if (!nama) { UI.showToast('Nama mapel tidak boleh kosong', 'error'); return; }
    if (this._s.mapelList.some(m => m.nama.toLowerCase() === nama.toLowerCase())) {
      UI.showToast('Nama mapel sudah ada', 'error'); return;
    }
    UI.showLoading('Menambahkan...');
    try {
      const res = await api.addMapel({ nama });
      if (res.status === 'ok') {
        this._s.mapelList.push({ id: res.id || Date.now(), nama });
        onSuccess();
        this.render(); this.renderM();
        App.mobile.updateHomeStats();
        UI.showToast(`✓ Mapel "${nama}" berhasil ditambahkan`, 'success');
      } else { UI.showToast('Gagal: ' + (res.message || 'Error'), 'error'); }
    } catch { UI.showToast('Gagal terhubung ke server', 'error'); }
    finally  { UI.hideLoading(); }
  }

  // ── Modal dampak ─────────────────────────────────
  _showDampakModal(title, warning, terdampak, onConfirm) {
    UI.$('dampakTitle').textContent   = title;
    UI.$('dampakWarning').textContent = warning;
    UI.$('dampakList').innerHTML = terdampak.map((g, i) => `
      <div class="dampak-item">
        <div class="dampak-av" style="background:${avatarColor(i)}">${initials(g.nama)}</div>
        <div><div class="dampak-name">${g.nama}</div></div>
      </div>`).join('');
    openModal('modalDampak');
    UI.$('dampakConfirmBtn').onclick = () => { closeModal('modalDampak'); onConfirm(); };
  }
}
