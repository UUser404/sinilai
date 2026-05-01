/**
 * js/kurikulum/modules/analisis.js
 * AnalisisModule — Analisis rata-rata nilai PTS/UAS per mapel & rombel.
 */
class AnalisisModule {
  constructor(state) {
    this._s       = state;
    this._data    = null;
    this._periode = [];
    this._filter  = {
      komponen : 'semua', // 'semua' | 'pts' | 'uas'
      tampilan : 'mapel', // 'mapel' | 'rombel'
      kkm      : 75,
      mapel    : '',      // filter mapel spesifik (mode rombel)
    };
    this._periodeLoaded = false;
  }

  // ─── Entry point ───────────────────────────────────────────────────────────
  render() {
    const el = UI.$('pageAnalisis');
    if (!el) return;
    if (!this._periodeLoaded) {
      this._loadPeriode().then(() => this._renderShell());
    } else {
      this._renderShell();
    }
  }

  async _loadPeriode() {
    try {
      const res = await api.getAvailablePeriode();
      if (res.status === 'ok') {
        this._periode = res.periodeList || [];
        if (this._periode.length && !this._s.filterSemester) {
          this._s.filterSemester = this._periode[0].semester;
          this._s.filterTahun    = this._periode[0].tahun;
        }
      }
    } catch(e) {}
    this._periodeLoaded = true;
  }

  // ─── Shell ─────────────────────────────────────────────────────────────────
  _renderShell() {
    const el = UI.$('pageAnalisis');
    if (!el) return;
    el.innerHTML = this._renderFilterBar() +
      `<div id="analisisContent">${this._data ? this._renderContent() : this._renderEmpty()}</div>`;
  }

  _renderEmpty() {
    return `<div class="k-empty" style="height:60%">
      <div class="k-empty-icon">📈</div>
      <div class="k-empty-title">Analisis Nilai</div>
      <div class="k-empty-sub">${this._periode.length ? 'Klik 🔄 Muat untuk memuat data' : 'Belum ada data nilai tersimpan'}</div>
    </div>`;
  }

  // ─── Filter bar ────────────────────────────────────────────────────────────
  _renderFilterBar() {
    const periodeOpts = this._periode.length
      ? this._periode.map(p => {
          const val = p.semester + '||' + p.tahun;
          const cur = this._s.filterSemester + '||' + this._s.filterTahun;
          return `<option value="${val}" ${val===cur?'selected':''}">Sem ${p.semester} — ${p.tahun}</option>`;
        }).join('')
      : `<option value="">Belum ada data</option>`;

    const mapelOpts = this._data
      ? `<option value="">Semua Mapel</option>` +
        this._data.mapelList.map(m =>
          `<option value="${m}" ${this._filter.mapel===m?'selected':''}>${m}</option>`
        ).join('')
      : `<option value="">— pilih setelah muat —</option>`;

    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <select onchange="App.analisis._onPeriodeChange(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
        ${periodeOpts}
      </select>

      <select onchange="App.analisis._onKomponenChange(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
        <option value="semua" ${this._filter.komponen==='semua'?'selected':''}>PTS + UAS</option>
        <option value="pts"   ${this._filter.komponen==='pts'  ?'selected':''}>PTS saja</option>
        <option value="uas"   ${this._filter.komponen==='uas'  ?'selected':''}>UAS saja</option>
      </select>

      <div style="display:flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px">
        <span style="font-size:11px;color:var(--text2)">KKM</span>
        <input type="number" min="0" max="100" value="${this._filter.kkm}"
          onchange="App.analisis._onKkmChange(this.value)"
          style="width:44px;border:none;background:transparent;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;outline:none;text-align:center" />
      </div>

      <button class="btn btn-primary btn-sm" onclick="App.analisis.load(true)">🔄 Muat</button>

      <div style="display:flex;gap:4px;margin-left:auto">
        <button class="btn btn-sm ${this._filter.tampilan==='mapel'  ?'btn-primary':'btn-ghost'}"
          onclick="App.analisis._onTampilanChange('mapel')"  style="font-size:11px">Per Mapel</button>
        <button class="btn btn-sm ${this._filter.tampilan==='rombel' ?'btn-primary':'btn-ghost'}"
          onclick="App.analisis._onTampilanChange('rombel')" style="font-size:11px">Per Rombel</button>
      </div>

      ${this._filter.tampilan === 'rombel' ? `
      <select onchange="App.analisis._onMapelChange(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
        ${mapelOpts}
      </select>` : ''}
    </div>`;
  }

  // ─── Event handlers ────────────────────────────────────────────────────────
  _onPeriodeChange(val) {
    const [sem, thn] = val.split('||');
    this._s.filterSemester = sem || '';
    this._s.filterTahun    = thn || '';
  }
  _onKomponenChange(val) { this._filter.komponen = val; this._updateContent(); }
  _onKkmChange(val)      { this._filter.kkm = parseInt(val) || 75; this._updateContent(); }
  _onTampilanChange(val) { this._filter.tampilan = val; this._renderShell(); }
  _onMapelChange(val)    { this._filter.mapel = val; this._updateContent(); }

  _updateContent() {
    this._renderShell();
  }

  // ─── Load data ─────────────────────────────────────────────────────────────
  async load(forceRefresh = false) {
    if (!this._periodeLoaded) await this._loadPeriode();
    if (this._data && !forceRefresh) { this._renderShell(); return; }

    UI.showLoading('Memuat analisis nilai...');
    try {
      const res = await api.getAnalisisNilai({
        semester : this._s.filterSemester || '',
        tahun    : this._s.filterTahun    || '',
        komponen : this._filter.komponen,
        kkm      : this._filter.kkm,
      });
      if (res.status === 'ok') {
        this._data = res;
        this._renderShell();
      } else {
        UI.showToast('Gagal memuat analisis: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  _color(rata, kkm) {
    if (rata === null || rata === undefined) return 'var(--text3)';
    if (rata >= 85)        return 'var(--success)';
    if (rata >= kkm)       return 'var(--accent)';
    return 'var(--error)';
  }
  _bg(rata, kkm) {
    if (rata === null || rata === undefined) return 'var(--surface2)';
    if (rata >= 85)        return 'var(--success-bg)';
    if (rata >= kkm)       return 'var(--accent-light)';
    return 'var(--error-bg)';
  }
  _bar(rata, kkm) {
    const p   = Math.min(rata || 0, 100);
    const col = this._color(rata, kkm);
    return `<div style="height:5px;background:var(--border2);border-radius:4px;overflow:hidden;margin-top:4px">
      <div style="height:100%;width:${p}%;background:${col};border-radius:4px;transition:width 0.4s"></div>
    </div>`;
  }
  _statCell(stat, kkm) {
    if (!stat) return `<span style="color:var(--text3);font-size:11px">—</span>`;
    const col = this._color(stat.rata, kkm);
    return `<div>
      <span style="font-size:15px;font-weight:800;color:${col}">${stat.rata}</span>
      <span style="font-size:10px;color:var(--text3);margin-left:2px">/ 100</span>
      ${this._bar(stat.rata, kkm)}
      <div style="display:flex;gap:8px;margin-top:4px">
        <span style="font-size:10px;color:var(--text3)">↓${stat.min} ↑${stat.max}</span>
        ${stat.dibawahKkm > 0
          ? `<span style="font-size:10px;font-weight:600;color:var(--error)">${stat.dibawahKkm} < KKM</span>`
          : `<span style="font-size:10px;color:var(--success)">✓ semua ≥ KKM</span>`}
      </div>
    </div>`;
  }

  // ─── Render konten ─────────────────────────────────────────────────────────
  _renderContent() {
    if (!this._data) return this._renderEmpty();
    return this._filter.tampilan === 'rombel'
      ? this._renderPerRombel()
      : this._renderPerMapel();
  }

  // ─── Mode: Per Mapel (kartu per mapel, expand per kelas) ──────────────────
  _renderPerMapel() {
    const { data, kkm } = this._data;
    const K = this._filter.kkm || kkm;
    const showPts = this._filter.komponen !== 'uas';
    const showUas = this._filter.komponen !== 'pts';

    if (!data.length) return `<div class="k-empty"><div class="k-empty-sub">Tidak ada data nilai</div></div>`;

    return data.map((d, di) => {
      const ks    = d.keseluruhan;
      const mainStat = showPts && ks.pts ? ks.pts : (showUas && ks.uas ? ks.uas : null);
      const rataMain = mainStat ? mainStat.rata : null;
      const col   = this._color(rataMain, K);
      const kelasList = Object.keys(d.perKelas).sort();

      return `
      <div class="step-card" style="margin-bottom:10px">
        <div class="acc-head" onclick="var rb=this.nextElementSibling;var o=rb.style.display==='block';rb.style.display=o?'none':'block';this.querySelector('.acc-arrow').style.transform=o?'':'rotate(180deg)'">
          <div style="width:36px;height:36px;border-radius:9px;background:${avatarColor(di)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">
            ${d.mapel.slice(0,2).toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--text)">${d.mapel}</div>
            <div style="font-size:10px;color:var(--text2);margin-top:2px">${kelasList.length} rombel</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
            ${showPts && ks.pts ? `<div style="text-align:center">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">PTS</div>
              <div style="font-size:18px;font-weight:800;color:${this._color(ks.pts.rata,K)}">${ks.pts.rata}</div>
              ${this._bar(ks.pts.rata,K)}
            </div>` : ''}
            ${showUas && ks.uas ? `<div style="text-align:center">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">UAS</div>
              <div style="font-size:18px;font-weight:800;color:${this._color(ks.uas.rata,K)}">${ks.uas.rata}</div>
              ${this._bar(ks.uas.rata,K)}
            </div>` : ''}
            <span class="acc-arrow" style="font-size:10px;color:var(--text3);transition:transform 0.2s">▼</span>
          </div>
        </div>

        <div style="display:none;padding:0 16px 16px">
          <table style="width:100%;border-collapse:collapse;margin-top:4px">
            <thead><tr>
              <th style="text-align:left;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:8px;border-bottom:1px solid var(--border)">Rombel</th>
              <th style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:8px;border-bottom:1px solid var(--border)">Siswa</th>
              ${showPts ? `<th style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:8px;border-bottom:1px solid var(--border)">PTS</th>` : ''}
              ${showUas ? `<th style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:8px;border-bottom:1px solid var(--border)">UAS</th>` : ''}
            </tr></thead>
            <tbody>
              ${kelasList.map(kelas => {
                const kd = d.perKelas[kelas];
                const jml = (kd.pts?.jumlahSiswa || kd.uas?.jumlahSiswa || 0);
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:10px 8px">
                    <span style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text)">${kelas}</span>
                  </td>
                  <td style="padding:10px 8px;text-align:center;font-size:11px;color:var(--text2)">${jml}</td>
                  ${showPts ? `<td style="padding:10px 8px">${this._statCell(kd.pts, K)}</td>` : ''}
                  ${showUas ? `<td style="padding:10px 8px">${this._statCell(kd.uas, K)}</td>` : ''}
                </tr>`;
              }).join('')}
              <tr style="background:var(--surface2)">
                <td style="padding:10px 8px;font-size:11px;font-weight:700;color:var(--text2)" colspan="2">Rata-rata Keseluruhan</td>
                ${showPts ? `<td style="padding:10px 8px">${this._statCell(ks.pts, K)}</td>` : ''}
                ${showUas ? `<td style="padding:10px 8px">${this._statCell(ks.uas, K)}</td>` : ''}
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('');
  }

  // ─── Mode: Per Rombel (grid heatmap mapel × kelas) ────────────────────────
  _renderPerRombel() {
    const { data, kelasList, kkm } = this._data;
    const K = this._filter.kkm || kkm;
    const showPts = this._filter.komponen !== 'uas';
    const showUas = this._filter.komponen !== 'pts';

    // Filter mapel jika ada
    const filteredData = this._filter.mapel
      ? data.filter(d => d.mapel === this._filter.mapel)
      : data;

    if (!filteredData.length) return `<div class="k-empty"><div class="k-empty-sub">Tidak ada data nilai</div></div>`;

    const kLabel = showPts && showUas ? 'PTS / UAS' : showPts ? 'PTS' : 'UAS';

    return `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:600px">
        <thead>
          <tr>
            <th style="text-align:left;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:8px 12px;border-bottom:2px solid var(--border);position:sticky;left:0;background:var(--surface)">
              Mata Pelajaran
            </th>
            ${kelasList.map(k => `
              <th style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.5px;text-transform:uppercase;padding:8px;border-bottom:2px solid var(--border);text-align:center;min-width:90px">
                ${k}
              </th>`).join('')}
          </tr>
          <tr>
            <th style="padding:4px 12px;border-bottom:1px solid var(--border);position:sticky;left:0;background:var(--surface)"></th>
            ${kelasList.map(() => `
              <th style="font-size:9px;color:var(--text3);padding:4px;border-bottom:1px solid var(--border);text-align:center">${kLabel}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${filteredData.map((d, di) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:10px 12px;font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;position:sticky;left:0;background:var(--surface)">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:6px;height:6px;border-radius:50%;background:${avatarColor(di)};flex-shrink:0"></div>
                ${d.mapel}
              </div>
            </td>
            ${kelasList.map(kelas => {
              const kd  = d.perKelas[kelas];
              if (!kd) return `<td style="padding:8px;text-align:center"><span style="font-size:11px;color:var(--text3)">—</span></td>`;
              const pts = showPts ? kd.pts : null;
              const uas = showUas ? kd.uas : null;
              const rataShow = pts ? pts.rata : (uas ? uas.rata : null);
              return `<td style="padding:6px 8px;text-align:center">
                <div style="background:${this._bg(rataShow,K)};border-radius:var(--radius-sm);padding:6px 4px">
                  ${pts ? `<div style="font-size:12px;font-weight:700;color:${this._color(pts.rata,K)}">${pts.rata}</div>` : ''}
                  ${pts && uas ? `<div style="font-size:9px;color:var(--text3);margin:1px 0">/</div>` : ''}
                  ${uas ? `<div style="font-size:12px;font-weight:700;color:${this._color(uas.rata,K)}">${uas.rata}</div>` : ''}
                  ${(pts?.dibawahKkm || uas?.dibawahKkm)
                    ? `<div style="font-size:9px;color:var(--error);margin-top:2px">${pts?.dibawahKkm||uas?.dibawahKkm} < KKM</div>`
                    : `<div style="font-size:9px;color:var(--success);margin-top:2px">✓</div>`}
                </div>
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;border-radius:3px;background:var(--success-bg);border:1px solid var(--success)"></div><span style="font-size:11px;color:var(--text2)">≥ 85 (Sangat Baik)</span></div>
      <div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;border-radius:3px;background:var(--accent-light);border:1px solid var(--accent)"></div><span style="font-size:11px;color:var(--text2)">≥ KKM (Baik)</span></div>
      <div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;border-radius:3px;background:var(--error-bg);border:1px solid var(--error)"></div><span style="font-size:11px;color:var(--text2)">< KKM (Perlu Perhatian)</span></div>
    </div>`;
  }
  // ─── Mobile render ─────────────────────────────────────────────────────────
  renderM() {
    const el = UI.$('k-page-analisis-content');
    if (!el) return;
    // Load periode dulu jika belum, lalu render ulang
    if (!this._periodeLoaded) {
      this._loadPeriode().then(() => this.renderM());
      return;
    }

    const KKM      = this._filter.kkm;
    const showPts  = this._filter.komponen !== 'uas';
    const showUas  = this._filter.komponen !== 'pts';

    const periodeOpts = this._periode.length
      ? this._periode.map(p => {
          const val = p.semester + '||' + p.tahun;
          const cur = this._s.filterSemester + '||' + this._s.filterTahun;
          return `<option value="${val}" ${val===cur?'selected':''}">Sem ${p.semester} — ${p.tahun}</option>`;
        }).join('')
      : `<option value="">Belum ada data</option>`;

    if (!this._data) {
      el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <select onchange="App.analisis._onPeriodeChange(this.value)"
          style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${periodeOpts}</select>
        <div style="display:flex;gap:8px">
          <select onchange="App.analisis._onKomponenChange(this.value)"
            style="flex:1;padding:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
            <option value="semua" ${this._filter.komponen==='semua'?'selected':''}>PTS + UAS</option>
            <option value="pts"   ${this._filter.komponen==='pts'  ?'selected':''}>PTS saja</option>
            <option value="uas"   ${this._filter.komponen==='uas'  ?'selected':''}>UAS saja</option>
          </select>
          <div style="display:flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px">
            <span style="font-size:11px;color:var(--text2)">KKM</span>
            <input type="number" min="0" max="100" value="${this._filter.kkm}"
              onchange="App.analisis._onKkmChange(this.value)"
              style="width:40px;border:none;background:transparent;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;outline:none;text-align:center" />
          </div>
        </div>
        <button class="btn btn-primary" onclick="App.analisis.load(true)">🔄 Muat Data</button>
      </div>
      <div class="k-empty"><div class="k-empty-icon">📈</div><div class="k-empty-sub">Pilih periode lalu klik Muat Data</div></div>`;
      return;
    }

    const { data } = this._data;

    el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      <div style="display:flex;gap:6px">
        <select onchange="App.analisis._onPeriodeChange(this.value)"
          style="flex:1;padding:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${periodeOpts}</select>
        <button class="btn btn-primary btn-sm" onclick="App.analisis.load(true)">🔄</button>
      </div>
      <div style="display:flex;gap:6px">
        <select onchange="App.analisis._onKomponenChange(this.value)"
          style="flex:1;padding:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
          <option value="semua" ${this._filter.komponen==='semua'?'selected':''}>PTS + UAS</option>
          <option value="pts"   ${this._filter.komponen==='pts'  ?'selected':''}>PTS saja</option>
          <option value="uas"   ${this._filter.komponen==='uas'  ?'selected':''}>UAS saja</option>
        </select>
        <div style="display:flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:4px 8px;flex-shrink:0">
          <span style="font-size:11px;color:var(--text2)">KKM</span>
          <input type="number" min="0" max="100" value="${this._filter.kkm}"
            onchange="App.analisis._onKkmChange(this.value)"
            style="width:36px;border:none;background:transparent;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;outline:none;text-align:center" />
        </div>
      </div>
    </div>

    ${data.length === 0
      ? `<div class="k-empty"><div class="k-empty-sub">Tidak ada data nilai</div></div>`
      : data.map((d, di) => {
          const ks      = d.keseluruhan;
          const mainPts = showPts && ks.pts ? ks.pts.rata : null;
          const mainUas = showUas && ks.uas ? ks.uas.rata : null;
          const rataMain = mainPts || mainUas;
          const col      = this._color(rataMain, KKM);
          const kelasList = Object.keys(d.perKelas).sort();

          return `
          <div class="k-step-card" style="margin-bottom:10px">
            <div class="k-acc-head" onclick="var b=this.nextElementSibling;var o=b.style.display==='block';b.style.display=o?'none':'block';this.querySelector('.k-acc-arrow').style.transform=o?'':'rotate(180deg)'">
              <div style="width:36px;height:36px;border-radius:9px;background:${avatarColor(di)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">
                ${d.mapel.slice(0,2).toUpperCase()}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.mapel}</div>
                <div style="font-size:10px;color:var(--text2);margin-top:2px">${kelasList.length} rombel</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
                ${showPts && ks.pts ? `<div style="text-align:center">
                  <div style="font-size:9px;color:var(--text3);text-transform:uppercase">PTS</div>
                  <div style="font-size:16px;font-weight:800;color:${this._color(ks.pts.rata,KKM)}">${ks.pts.rata}</div>
                </div>` : ''}
                ${showUas && ks.uas ? `<div style="text-align:center">
                  <div style="font-size:9px;color:var(--text3);text-transform:uppercase">UAS</div>
                  <div style="font-size:16px;font-weight:800;color:${this._color(ks.uas.rata,KKM)}">${ks.uas.rata}</div>
                </div>` : ''}
                <span class="k-acc-arrow" style="font-size:12px;color:var(--text3);transition:transform 0.2s">▼</span>
              </div>
            </div>
            <div style="display:none;padding:10px 14px">
              ${kelasList.map(kelas => {
                const kd  = d.perKelas[kelas];
                const jml = kd.pts?.jumlahSiswa || kd.uas?.jumlahSiswa || 0;
                return `
                <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <span style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:var(--text)">${kelas}</span>
                    <span style="font-size:10px;color:var(--text3)">${jml} siswa</span>
                    <div style="display:flex;gap:10px;margin-left:auto">
                      ${showPts && kd.pts ? `<div style="text-align:center">
                        <div style="font-size:9px;color:var(--text3)">PTS</div>
                        <div style="font-size:14px;font-weight:700;color:${this._color(kd.pts.rata,KKM)}">${kd.pts.rata}</div>
                        ${kd.pts.dibawahKkm > 0 ? `<div style="font-size:9px;color:var(--error)">${kd.pts.dibawahKkm} < KKM</div>` : ''}
                      </div>` : ''}
                      ${showUas && kd.uas ? `<div style="text-align:center">
                        <div style="font-size:9px;color:var(--text3)">UAS</div>
                        <div style="font-size:14px;font-weight:700;color:${this._color(kd.uas.rata,KKM)}">${kd.uas.rata}</div>
                        ${kd.uas.dibawahKkm > 0 ? `<div style="font-size:9px;color:var(--error)">${kd.uas.dibawahKkm} < KKM</div>` : ''}
                      </div>` : ''}
                    </div>
                  </div>
                </div>`;
              }).join('')}
              <div style="padding-top:8px">
                <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Keseluruhan</div>
                <div style="display:flex;gap:10px">
                  ${showPts && ks.pts ? `<div style="flex:1;background:${this._bg(ks.pts.rata,KKM)};border-radius:var(--radius-sm);padding:8px;text-align:center">
                    <div style="font-size:10px;color:var(--text2);font-weight:600">PTS</div>
                    <div style="font-size:18px;font-weight:800;color:${this._color(ks.pts.rata,KKM)}">${ks.pts.rata}</div>
                    <div style="font-size:10px;color:var(--text3)">↓${ks.pts.min} ↑${ks.pts.max}</div>
                    ${ks.pts.dibawahKkm > 0 ? `<div style="font-size:10px;color:var(--error)">${ks.pts.dibawahKkm} < KKM</div>` : `<div style="font-size:10px;color:var(--success)">✓ semua ≥ KKM</div>`}
                  </div>` : ''}
                  ${showUas && ks.uas ? `<div style="flex:1;background:${this._bg(ks.uas.rata,KKM)};border-radius:var(--radius-sm);padding:8px;text-align:center">
                    <div style="font-size:10px;color:var(--text2);font-weight:600">UAS</div>
                    <div style="font-size:18px;font-weight:800;color:${this._color(ks.uas.rata,KKM)}">${ks.uas.rata}</div>
                    <div style="font-size:10px;color:var(--text3)">↓${ks.uas.min} ↑${ks.uas.max}</div>
                    ${ks.uas.dibawahKkm > 0 ? `<div style="font-size:10px;color:var(--error)">${ks.uas.dibawahKkm} < KKM</div>` : `<div style="font-size:10px;color:var(--success)">✓ semua ≥ KKM</div>`}
                  </div>` : ''}
                </div>
              </div>
            </div>
          </div>`;
        }).join('')
    }`;
  }

}
