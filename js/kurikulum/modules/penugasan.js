/**
 * js/kurikulum/modules/penugasan.js
 * PenugasanModule — logika penugasan mapel & kelas per guru.
 * Step 1: pilih mapel. Step 2: pilih kelas per mapel (accordion).
 */
class PenugasanModule {
  constructor(state) {
    // state: { currentGuru, currentPen, openAcc, guruList, mapelList, tingkatMap }
    this._s = state;
  }

  // ── Desktop ──────────────────────────────────────
  render() {
    const { currentGuru, currentPen } = this._s;
    if (!currentGuru) return;

    UI.$('emptyState').style.display = 'none';
    UI.$('guruDetail').style.display = '';
    UI.$('kdTitle').textContent = currentGuru.nama;
    UI.$('kdSub').textContent   = 'NIP: ' + (currentGuru.nip || '—');
    UI.$('detailStats').style.display = 'flex';
    this.updateStats();
    this.renderStep1();
    this.renderStep2();
  }

  // ── Mobile ───────────────────────────────────────
  renderM() {
    const { currentGuru, guruList } = this._s;
    if (!currentGuru) return;

    UI.$('kDetailTitleM').textContent = currentGuru.nama;
    UI.$('kDetailSubM').textContent   = 'NIP: ' + (currentGuru.nip || '—');

    const idx = guruList.findIndex(g => g.username === currentGuru.username);
    UI.$('kDetailAvM').textContent          = initials(currentGuru.nama);
    UI.$('kDetailAvM').style.background     = avatarColor(idx);
    UI.$('kDetailNameM').textContent        = currentGuru.nama;
    UI.$('kDetailNipM').textContent         = 'NIP: ' + (currentGuru.nip || '—');
    this.updateStatsM();
    this.renderStep1M();
    this.renderStep2M();
  }

  updateStats() {
    const { currentPen } = this._s;
    UI.$('spMapel').textContent = currentPen.length;
    UI.$('spKelas').textContent = new Set(currentPen.flatMap(p => p.kelas)).size;
  }

  updateStatsM() {
    const { currentPen } = this._s;
    UI.$('kDsMapel').textContent = currentPen.length;
    UI.$('kDsKelas').textContent = new Set(currentPen.flatMap(p => p.kelas)).size;
  }

  renderStep1() {
    const { currentPen, mapelList } = this._s;
    UI.$('mapelChipGrid').innerHTML = mapelList.length
      ? mapelList.map(m => {
          const on = currentPen.some(p => p.mapel === m.nama);
          return `<button class="mc ${on ? 'on' : ''}" onclick="App.penugasan.toggleMapel('${m.nama}')">
            <span class="mc-dot"></span>${m.nama}</button>`;
        }).join('')
      : '<div style="color:var(--text3);font-size:12px">Belum ada mata pelajaran.</div>';
  }

  renderStep1M() {
    const { currentPen, mapelList } = this._s;
    UI.$('kMapelGridM').innerHTML = mapelList.length
      ? mapelList.map(m => {
          const on = currentPen.some(p => p.mapel === m.nama);
          return `<button class="k-mc ${on ? 'on' : ''}" onclick="App.penugasan.toggleMapelM('${m.nama}')">
            <span class="k-mc-dot"></span>${m.nama}</button>`;
        }).join('')
      : '<div style="color:var(--text3);font-size:12px">Belum ada mata pelajaran.</div>';
  }

  renderStep2() {
    const { currentPen, tingkatMap, mapelList } = this._s;
    if (!currentPen.length) {
      UI.$('step2Body').innerHTML = '<div class="empty-acc">Pilih mata pelajaran di Langkah 1 terlebih dahulu</div>';
      return;
    }
    UI.$('step2Body').innerHTML = `<div class="acc-list">${currentPen.map((row, ri) => {
      const dc = DOT_COLORS[mapelList.findIndex(m => m.nama === row.mapel) % DOT_COLORS.length] || 'dot-blue';
      return `
      <div class="acc-item ${this._s.openAcc === row.mapel ? 'open' : ''}" id="acc-${ri}">
        <div class="acc-head" onclick="App.penugasan.toggleAcc('${row.mapel}')">
          <div class="acc-mdot ${dc}"></div>
          <div class="acc-mapel">${row.mapel}</div>
          <span class="acc-kcount">${row.kelas.length} kelas</span>
          <span class="acc-arrow">▼</span>
          <button class="acc-del" onclick="event.stopPropagation();App.penugasan.removeMapel(${ri})">✕</button>
        </div>
        <div class="acc-body">
          ${Object.entries(tingkatMap).map(([t, klist]) => `
          <div class="tingkat-sec">
            <div class="tingkat-row">
              <span class="tingkat-lbl">${t}</span>
              <button class="tingkat-selall" onclick="App.penugasan.selAllTingkat(${ri},'${t}')">Pilih semua</button>
            </div>
            <div class="kelas-chips">
              ${klist.map(k => `<button class="kchip ${row.kelas.includes(k) ? 'on' : ''}"
                onclick="App.penugasan.toggleK(${ri},'${k}',this)">${k}</button>`).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  renderStep2M() {
    const { currentPen, tingkatMap, mapelList } = this._s;
    if (!currentPen.length) {
      UI.$('kStep2BodyM').innerHTML = '<div class="k-empty" style="padding:16px 0"><div class="k-empty-sub">Pilih mapel di Langkah 1</div></div>';
      return;
    }
    UI.$('kStep2BodyM').innerHTML = `<div class="k-acc-list">${currentPen.map((row, ri) => {
      const dc = DOT_COLORS[mapelList.findIndex(m => m.nama === row.mapel) % DOT_COLORS.length] || 'dot-blue';
      return `
      <div class="k-acc-item ${this._s.openAcc === row.mapel ? 'open' : ''}" id="kacc-${ri}">
        <div class="k-acc-head" onclick="App.penugasan.toggleAccM('${row.mapel}')">
          <div class="k-acc-mdot ${dc}"></div>
          <div class="k-acc-mapel">${row.mapel}</div>
          <span class="k-acc-kcount">${row.kelas.length} kelas</span>
          <span class="k-acc-arrow">▼</span>
          <button class="k-acc-del" onclick="event.stopPropagation();App.penugasan.removeMapelM(${ri})">✕</button>
        </div>
        <div class="k-acc-body">
          ${Object.entries(tingkatMap).map(([t, klist]) => `
          <div class="k-tingkat-sec">
            <div class="k-tingkat-row">
              <span class="k-tingkat-lbl">${t}</span>
              <button class="k-tingkat-selall" onclick="App.penugasan.selAllTingkatM(${ri},'${t}')">Pilih semua</button>
            </div>
            <div class="k-kelas-chips">
              ${klist.map(k => `<button class="k-kchip ${row.kelas.includes(k) ? 'on' : ''}"
                onclick="App.penugasan.toggleKM(${ri},'${k}',this)">${k}</button>`).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ── Toggle helpers ───────────────────────────────
  toggleMapel(nama) {
    const i = this._s.currentPen.findIndex(p => p.mapel === nama);
    if (i >= 0) { this._s.currentPen.splice(i, 1); if (this._s.openAcc === nama) this._s.openAcc = null; }
    else { this._s.currentPen.push({ mapel: nama, kelas: [] }); this._s.openAcc = nama; }
    this.markDirty(); this.render();
  }
  toggleMapelM(nama) {
    const i = this._s.currentPen.findIndex(p => p.mapel === nama);
    if (i >= 0) { this._s.currentPen.splice(i, 1); if (this._s.openAcc === nama) this._s.openAcc = null; }
    else { this._s.currentPen.push({ mapel: nama, kelas: [] }); this._s.openAcc = nama; }
    this.markDirty(); this.renderM();
  }

  toggleAcc(mapel)  { this._s.openAcc = this._s.openAcc === mapel ? null : mapel; this.renderStep2(); }
  toggleAccM(mapel) { this._s.openAcc = this._s.openAcc === mapel ? null : mapel; this.renderStep2M(); }

  toggleK(ri, k, btn) {
    const row = this._s.currentPen[ri];
    const i   = row.kelas.indexOf(k);
    if (i >= 0) row.kelas.splice(i, 1); else row.kelas.push(k);
    btn.classList.toggle('on');
    this.markDirty(); this.updateStats();
    const el = document.querySelector(`#acc-${ri} .acc-kcount`);
    if (el) el.textContent = row.kelas.length + ' kelas';
  }
  toggleKM(ri, k, btn) {
    const row = this._s.currentPen[ri];
    const i   = row.kelas.indexOf(k);
    if (i >= 0) row.kelas.splice(i, 1); else row.kelas.push(k);
    btn.classList.toggle('on');
    this.markDirty(); this.updateStatsM();
    const el = document.querySelector(`#kacc-${ri} .k-acc-kcount`);
    if (el) el.textContent = row.kelas.length + ' kelas';
  }

  selAllTingkat(ri, tingkat) {
    const klist = this._s.tingkatMap[tingkat] || [];
    const row   = this._s.currentPen[ri];
    const allOn = klist.every(k => row.kelas.includes(k));
    if (allOn) row.kelas = row.kelas.filter(k => !klist.includes(k));
    else klist.forEach(k => { if (!row.kelas.includes(k)) row.kelas.push(k); });
    this.markDirty(); this.renderStep2(); this.updateStats();
  }
  selAllTingkatM(ri, tingkat) {
    const klist = this._s.tingkatMap[tingkat] || [];
    const row   = this._s.currentPen[ri];
    const allOn = klist.every(k => row.kelas.includes(k));
    if (allOn) row.kelas = row.kelas.filter(k => !klist.includes(k));
    else klist.forEach(k => { if (!row.kelas.includes(k)) row.kelas.push(k); });
    this.markDirty(); this.renderStep2M(); this.updateStatsM();
  }

  removeMapel(ri)  { this._s.currentPen.splice(ri, 1); this.markDirty(); this.render(); }
  removeMapelM(ri) { this._s.currentPen.splice(ri, 1); this.markDirty(); this.renderM(); }

  // ── Dirty state ──────────────────────────────────
  markDirty() {
    this._s.penDirty = true;
    UI.$('savePenugasanBar').classList.add('show');
    UI.$('kFloatSave').classList.add('show');
    UI.$('kTopbarSaveBtn').classList.add('show');
    UI.$('kBnBadgePen').classList.add('show');
  }
  markClean() {
    this._s.penDirty = false;
    UI.$('savePenugasanBar').classList.remove('show');
    UI.$('kFloatSave').classList.remove('show');
    UI.$('kTopbarSaveBtn').classList.remove('show');
    UI.$('kBnBadgePen').classList.remove('show');
  }

  cancel() {
    this._s.currentPen = clonePen(this._s.currentGuru);
    this._s.openAcc    = null;
    this.markClean();
    this.render();
    this.renderM();
  }

  async save() {
    const { currentGuru, currentPen, guruList } = this._s;
    if (!currentGuru) return;
    UI.showLoading('Menyimpan penugasan...');
    try {
      const res = await api.savePenugasan({ username: currentGuru.username, penugasan: currentPen });
      if (res.status === 'ok') {
        currentGuru.penugasan = currentPen.map(p => ({ mapel: p.mapel, kelas: [...p.kelas] }));
        const idx = guruList.findIndex(g => g.username === currentGuru.username);
        if (idx >= 0) guruList[idx] = { ...currentGuru };
        this.markClean();
        App.renderGuruList();
        App.mobile.renderGuruList();
        App.mobile.updateHomeStats();
        UI.showToast('✓ Penugasan berhasil disimpan', 'success');
      } else {
        UI.showToast('Gagal: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }
}
