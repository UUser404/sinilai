/**
 * guru/modules/nilai.js
 * NilaiModule — render tabel input nilai + recalc + navigasi keyboard.
 * Menggunakan NilaiCalculator (service) dan Validator/Formatter (utils).
 * Emit events ke bus; tidak tahu tentang UI lain di halaman.
 */
class NilaiModule {
  constructor() {
    this._calc    = new NilaiCalculator();
    this.data     = [];   // [{nis, nama, nilai:{...}}]
    this._orig    = [];   // snapshot untuk reset/diff
    this._hasChg  = false;
    this.ctx      = null; // {kelas, mapel, semester, tahun} — disimpan saat render
  }

  get hasChanges() { return this._hasChg; }

  // ── Render ───────────────────────────────────────────────

  render(siswaList, existingNilai, ctx) {
    this.data = siswaList.map(s => ({
      nis:   s.nis,
      nama:  s.nama,
      nilai: existingNilai[s.nis]
        ? { ...existingNilai[s.nis] }
        : nilaiKosong(),
    }));
    this._orig = JSON.parse(JSON.stringify(this.data));
    this._calc.update(this.data.map(s => s.nilai));
    this.ctx   = ctx; // simpan untuk dipakai ExcelModule (nama file, dll.)

    this._renderRows();
    this._assignTabIndex();
    this._updateInfoBar(ctx);
    this._setHasChanges(false);

    document.querySelector('.step-header').style.display = 'none';
    UI.$('tableCard').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Input handlers ───────────────────────────────────────

  handleInput(input) {
    const idx = +input.dataset.idx;
    const col = input.dataset.col;
    this.data[idx].nilai[col] = input.value === '' ? '' : parseFloat(input.value);
    this._calc.update(this.data.map(s => s.nilai));

    const modified = JSON.stringify(this.data[idx].nilai) !== JSON.stringify(this._orig[idx].nilai);
    input.closest('tr').classList.toggle('modified', modified);

    this._recalcAll();
    this._setHasChanges(true);
  }

  handleKeydown(e) {
    if (Validator.isBlockedKey(e.key)) { e.preventDefault(); return; }
    if (e.key === 'Enter') { e.preventDefault(); this._moveDown(e.target); }
  }

  handleBlur(input) {
    const { value, valid } = Validator.nilaiInput(input.value);
    if (valid === null) { input.classList.remove('valid', 'invalid'); return; }
    input.value = value;
    input.classList.toggle('valid', valid === true);
    input.classList.toggle('invalid', valid === false);
  }

  // ── Reset / Save helpers ─────────────────────────────────

  reset() {
    this.data = JSON.parse(JSON.stringify(this._orig));
    this._calc.update(this.data.map(s => s.nilai));

    document.querySelectorAll('.nilai-input').forEach(inp => {
      const idx = +inp.dataset.idx, col = inp.dataset.col;
      inp.value = this.data[idx].nilai[col] ?? '';
      inp.classList.remove('valid', 'invalid');
      inp.closest('tr').classList.remove('modified');
    });
    this._recalcAll();
    this._setHasChanges(false);
    bus.emit('nilai:reset');
  }

  clearModified() {
    document.querySelectorAll('tr.modified').forEach(r => r.classList.remove('modified'));
    this._orig = JSON.parse(JSON.stringify(this.data));
    this._setHasChanges(false);
    bus.emit('nilai:saved');
  }

  hasInvalidInputs() {
    return document.querySelectorAll('.nilai-input.invalid').length > 0;
  }

  /** Sinkronisasi DOM setelah import Excel */
  syncFromImport(imported) {
    imported.forEach(({ idx }) => {
      document.querySelector(`tr[data-idx="${idx}"]`)?.classList.add('modified');
    });
    this._calc.update(this.data.map(s => s.nilai));
    this._recalcAll();
    this._setHasChanges(true);
  }

  // ── Private render ───────────────────────────────────────

  _renderRows() {
    const tbody = UI.$('nilaiBody');
    tbody.innerHTML = '';
    this.data.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      tr.innerHTML   = this._rowHtml(s, idx);
      tbody.appendChild(tr);
    });
  }

  _rowHtml(s, idx) {
    const n   = s.nilai;
    const ada = this._calc.adaNilai(n);

    const inputDefs = [
      { col:'uh1', cls:'col-uh' }, { col:'uh2', cls:'' },
      { col:'t1', cls:'col-tugas' }, { col:'t2', cls:'' }, { col:'t3', cls:'' }, { col:'t4', cls:'' },
      { col:'p1', cls:'col-praktik' }, { col:'p2', cls:'' },
      { col:'pts', cls:'col-pts' }, { col:'asas', cls:'col-akhir' },
    ];

    let html = `
      <td class="no">${idx + 1}</td>
      <td class="left nama">${s.nama}
        <br><small style="color:var(--text3);font-size:11px;font-weight:400">${s.nis}</small>
      </td>`;

    inputDefs.forEach(({ col, cls }) => {
      const val = n[col] !== undefined ? n[col] : '';
      html += `<td class="${cls}">
        <input class="nilai-input" type="number" min="0" max="100"
          data-nis="${s.nis}" data-col="${col}" data-idx="${idx}"
          value="${val}" placeholder="—"
          oninput="nilaiMod.handleInput(this)"
          onkeydown="nilaiMod.handleKeydown(event)"
          onblur="nilaiMod.handleBlur(this)"
        />
      </td>`;

      if (col === 'uh2')
        html += this._calcCellHtml(`rataUH-${idx}`, ada ? this._calc.rataUH(n) : null, 'uh');
      if (col === 't4')
        html += this._calcCellHtml(`rataTugas-${idx}`, ada ? this._calc.rataTugas(n) : null, 'tugas');
      if (col === 'p2') {
        const rP  = ada ? this._calc.rataPraktik(n) : null;
        const pro = ada ? this._calc.nilaiProses(n) : null;
        html += this._calcCellHtml(`rataPraktik-${idx}`, rP, 'praktik');
        html += this._calcCellHtml(`proses-${idx}`, pro, 'proses', 'col-proses');
      }
    });

    const rap = ada ? this._calc.nilaiRaport(n) : null;
    html += this._calcCellHtml(`raport-${idx}`, rap, 'raport', 'col-raport');
    return html;
  }

  _calcCellHtml(key, val, type, extra = '') {
    const show = val !== null && val > 0;
    const cls  = show ? `calc-cell ${type} ${extra}`.trim() : `calc-cell empty ${extra}`.trim();
    return `<td class="${cls}" data-calc="${key}">${show ? val.toFixed(1) : '—'}</td>`;
  }

  _recalcAll() {
    this.data.forEach((s, idx) => {
      const row = document.querySelector(`tr[data-idx="${idx}"]`);
      if (!row) return;
      const n = s.nilai;
      [
        [`rataUH-${idx}`,      this._calc.rataUH(n),      'uh'],
        [`rataTugas-${idx}`,   this._calc.rataTugas(n),   'tugas'],
        [`rataPraktik-${idx}`, this._calc.rataPraktik(n), 'praktik'],
        [`proses-${idx}`,      this._calc.nilaiProses(n), 'proses'],
        [`raport-${idx}`,      this._calc.nilaiRaport(n), 'raport'],
      ].forEach(([key, val, type]) => this._updateCell(row, key, val, type));
    });
  }

  _updateCell(row, key, val, type) {
    const cell = row.querySelector(`[data-calc="${key}"]`);
    if (!cell) return;
    const extra   = type === 'proses' ? ' col-proses' : type === 'raport' ? ' col-raport' : '';
    const colsMap = {
      uh:      NILAI_COLS.UH, tugas: NILAI_COLS.TUGAS, praktik: NILAI_COLS.PRAKTIK,
      proses:  [...NILAI_COLS.UH, ...NILAI_COLS.TUGAS, ...NILAI_COLS.PRAKTIK],
      raport:  ALL_INPUT_COLS,
    };
    const aktif = (colsMap[type] || []).some(k => this._calc.isKolomAktif(k));
    cell.textContent = aktif ? val.toFixed(1) : '—';
    cell.className   = aktif ? `calc-cell ${type}${extra}` : `calc-cell empty${extra}`;
  }

  _assignTabIndex() {
    const tbody = UI.$('nilaiBody');
    TAB_ORDER.forEach((col, ci) => {
      this.data.forEach((_, ri) => {
        const inp = tbody.querySelector(`.nilai-input[data-col="${col}"][data-idx="${ri}"]`);
        if (inp) inp.tabIndex = ci * this.data.length + ri + 1;
      });
    });
  }

  _moveDown(input) {
    const col  = input.dataset.col;
    const idx  = +input.dataset.idx;
    const next = document.querySelector(`.nilai-input[data-col="${col}"][data-idx="${idx + 1}"]`);
    if (next) { next.focus(); next.select(); return; }
    const nextCol = TAB_ORDER[TAB_ORDER.indexOf(col) + 1];
    const first   = nextCol && document.querySelector(`.nilai-input[data-col="${nextCol}"][data-idx="0"]`);
    if (first) { first.focus(); first.select(); }
  }

  _updateInfoBar({ mapel, kelas, semester, tahun, jumlah }) {
    UI.$('infoKelas').textContent    = kelas;
    UI.$('infoMapel').textContent    = mapel;
    UI.$('infoSemester').textContent = Formatter.labelSemester(semester, tahun);
    UI.$('badgeJumlah').textContent  = `${jumlah} siswa`;
  }

  _setHasChanges(val) {
    this._hasChg = val;
    UI.$('changeIndicator').style.display = val ? 'inline' : 'none';
    if (val) bus.emit('nilai:changed');
  }
}
