/**
 * js/kurikulum/modules/rekap.js
 * RekapModule — Rekap pengisian nilai per guru/mapel/kelas.
 * v2: dropdown periode otomatis + tampilan per komponen nilai.
 */
class RekapModule {
  constructor(state) {
    this._s        = state;
    this._summary  = [];
    this._filtered = [];
    this._periode  = [];
    this._filter   = { status: 'semua', search: '', komponen: 'semua' };
    this._loaded   = false;
    this._periodeLoaded = false;
  }

  render() {
    const el = UI.$('pageRekap');
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

  _renderShell() {
    const el = UI.$('pageRekap');
    if (!el) return;
    el.innerHTML = `${this._renderFilterBar()}<div id="rekapContent">${this._loaded ? this._renderContent() : this._renderEmpty()}</div>`;
  }

  _renderFilterBar() {
    const periodeOptions = this._periode.length
      ? this._periode.map(p => {
          const val = p.semester + '||' + p.tahun;
          const cur = this._s.filterSemester + '||' + this._s.filterTahun;
          return `<option value="${val}" ${val===cur?'selected':''}">Sem ${p.semester} — ${p.tahun}</option>`;
        }).join('')
      : `<option value="">Belum ada data</option>`;

    const kompoOptions = [
      ['semua','Semua komponen'],['uh1','UH 1'],['uh2','UH 2'],
      ['t1','Tugas 1'],['t2','Tugas 2'],['t3','Tugas 3'],['t4','Tugas 4'],
      ['pts','PTS'],['uas','UAS'],
    ].map(([v,l]) => `<option value="${v}" ${this._filter.komponen===v?'selected':''}>${l}</option>`).join('');

    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <select onchange="App.rekap._onPeriodeChange(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
        ${periodeOptions}
      </select>
      <select onchange="App.rekap._onKomponenChange(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">
        ${kompoOptions}
      </select>
      <button class="btn btn-primary btn-sm" onclick="App.rekap.refresh()">🔄 Muat</button>
      <div style="display:flex;gap:4px;margin-left:auto">
        ${['semua','belum','sebagian','selesai'].map(s => `
          <button class="btn btn-sm ${this._filter.status===s?'btn-primary':'btn-ghost'}"
            onclick="App.rekap.setStatus('${s}')" style="font-size:11px">
            ${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}
      </div>
      <input placeholder="🔍 Cari guru / mapel / kelas..." value="${this._filter.search}"
        oninput="App.rekap.setSearch(this.value)"
        style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none;width:220px" />
    </div>`;
  }

  _renderEmpty() {
    return `<div class="k-empty" style="height:60%">
      <div class="k-empty-icon">📊</div>
      <div class="k-empty-sub">${this._periode.length?'Klik 🔄 Muat untuk memuat data':'Belum ada data nilai tersimpan'}</div>
    </div>`;
  }

  refresh() { this._loaded = false; this.load(true); }

  async load(forceRefresh = false) {
    if (!this._periodeLoaded) await this._loadPeriode();
    if (this._loaded && !forceRefresh) { this._renderShell(); this.renderM(); return; }
    UI.showLoading('Memuat rekap nilai...');
    try {
      const res = await api.getNilaiSummary({
        semester : this._s.filterSemester || '',
        tahun    : this._s.filterTahun    || '',
        komponen : this._filter.komponen,
      });
      if (res.status === 'ok') {
        this._summary = res.summary || [];
        this._loaded  = true;
        this._applyFilter();
        this._renderShell();
        this.renderM();
      } else {
        UI.showToast('Gagal memuat rekap: ' + (res.message || 'Error'), 'error');
      }
    } catch {
      UI.showToast('Gagal terhubung ke server', 'error');
    } finally {
      UI.hideLoading();
    }
  }

  _onPeriodeChange(val) {
    const [sem, thn] = val.split('||');
    this._s.filterSemester = sem || '';
    this._s.filterTahun    = thn || '';
  }

  _onKomponenChange(val) {
    this._filter.komponen = val;
    this._loaded = false;
  }

  setSearch(q)      { this._filter.search = q;      this._applyFilter(); const el=UI.$('rekapContent'); if(el) el.innerHTML=this._loaded?this._renderContent():this._renderEmpty(); this.renderM(); }
  setStatus(status) { this._filter.status = status; this._applyFilter(); this._renderShell(); this.renderM(); }

  _applyFilter() {
    let data = this._summary;
    const q  = this._filter.search.toLowerCase();
    if (q) data = data.filter(g => g.namaGuru.toLowerCase().includes(q) || g.penugasan.some(p => p.mapel.toLowerCase().includes(q) || p.kelas.toLowerCase().includes(q)));
    if (this._filter.status === 'belum')    data = data.filter(g => g.penugasan.some(p => p.persen === 0));
    else if (this._filter.status === 'sebagian') data = data.filter(g => g.penugasan.some(p => p.persen > 0 && p.persen < 80));
    else if (this._filter.status === 'selesai')  data = data.filter(g => g.penugasan.every(p => p.persen >= 80));
    this._filtered = data;
  }

  _statusInfo(persen) {
    if (persen === 0) return { label:'Belum',    cls:'red',   icon:'❌' };
    if (persen < 80)  return { label:'Sebagian', cls:'amber', icon:'⚠️' };
    return                   { label:'Selesai',  cls:'green', icon:'✅' };
  }

  _bar(persen, cls) {
    const bg = cls==='green'?'var(--success)':cls==='amber'?'var(--accent)':'var(--error)';
    return `<div style="background:var(--border2);border-radius:4px;height:5px;overflow:hidden;flex:1"><div style="height:100%;border-radius:4px;width:${persen}%;background:${bg};transition:width 0.4s"></div></div>`;
  }

  _overallStats() {
    const total   = this._summary.reduce((a,g) => a+g.totalTugas,  0);
    const selesai = this._summary.reduce((a,g) => a+g.sudahTerisi, 0);
    const belum   = this._summary.filter(g => g.penugasan.some(p => p.persen===0)).length;
    const persen  = total>0 ? Math.round((selesai/total)*100) : 0;
    return { total, selesai, belum, persen };
  }

  _renderContent() {
    const stats   = this._overallStats();
    const isSemua = this._filter.komponen === 'semua';
    const pc      = stats.persen;
    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      <div class="step-card" style="margin:0"><div style="padding:14px;text-align:center">
        <div style="font-size:26px;font-weight:800;color:var(--text)">${pc}%</div>
        <div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Terisi</div>
        <div style="margin-top:8px;height:4px;background:var(--border2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pc}%;background:${pc>=80?'var(--success)':pc>=40?'var(--accent)':'var(--error)'};border-radius:4px;transition:width 0.5s"></div></div>
      </div></div>
      <div class="step-card" style="margin:0"><div style="padding:14px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--success)">${stats.selesai}</div><div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Selesai ≥80%</div></div></div>
      <div class="step-card" style="margin:0"><div style="padding:14px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--text)">${stats.total}</div><div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Total Tugas</div></div></div>
      <div class="step-card" style="margin:0"><div style="padding:14px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--error)">${stats.belum}</div><div style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Guru Belum Isi</div></div></div>
    </div>
    ${this._filtered.length===0
      ? `<div class="empty-acc" style="padding:40px">Tidak ada data yang sesuai filter</div>`
      : this._filtered.map((g,gi) => isSemua ? this._renderCardSemua(g,gi) : this._renderCardSingle(g,gi)).join('')
    }`;
  }

  _KOMP_LABEL() { return {uh1:'UH 1',uh2:'UH 2',t1:'Tugas 1',t2:'Tugas 2',t3:'Tugas 3',t4:'Tugas 4',pts:'PTS',uas:'UAS'}; }

  _renderCardSemua(g, gi) {
    const tp   = g.penugasan.length>0 ? Math.round(g.penugasan.reduce((s,p)=>s+p.persen,0)/g.penugasan.length) : 0;
    const av   = avatarColor(gi);
    const init = initials(g.namaGuru);
    const KL   = this._KOMP_LABEL();
    return `
    <div class="step-card" style="margin-bottom:10px">
      <div class="acc-head" onclick="var rb=this.nextElementSibling;var o=rb.style.display==='block';rb.style.display=o?'none':'block';this.querySelector('.acc-arrow').style.transform=o?'':'rotate(180deg)'">
        <div style="width:32px;height:32px;border-radius:8px;background:${av};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">${init}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.namaGuru}</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">${g.totalTugas} tugas — rata-rata ${tp}% terisi</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:800;color:${tp>=80?'var(--success)':tp>0?'var(--accent)':'var(--error)'}">${tp}%</div>
            <div style="display:flex;align-items:center;gap:6px;width:80px;margin-top:2px">${this._bar(tp,tp>=80?'green':tp>0?'amber':'red')}</div>
          </div>
          <span class="acc-arrow" style="font-size:10px;color:var(--text3);transition:transform 0.2s">▼</span>
        </div>
      </div>
      <div class="rekap-body" style="display:none">
        <div style="padding:12px 16px">
          ${g.penugasan.map(p => {
            const si = this._statusInfo(p.persen);
            const komp = p.komponen || {};
            return `
            <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:700;color:var(--text)">${p.mapel}</span>
                <span style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600;color:var(--text2)">${p.kelas}</span>
                <span style="font-size:11px;color:var(--text3)">${p.totalSiswa} siswa</span>
                <span style="margin-left:auto;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;
                  background:var(--${si.cls==='green'?'success-bg':si.cls==='amber'?'accent-light':'error-bg'});
                  color:var(--${si.cls==='green'?'success':si.cls==='amber'?'accent':'error'})">${si.icon} ${si.label} (${p.persen}%)</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
                ${Object.entries(KL).map(([k,lbl]) => {
                  const kd  = komp[k] || {terisi:0,persen:0};
                  const ksi = this._statusInfo(kd.persen);
                  const kc  = ksi.cls==='green'?'var(--success)':ksi.cls==='amber'?'var(--accent)':'var(--error)';
                  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px">
                    <div style="font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${lbl}</div>
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">${this._bar(kd.persen,ksi.cls)}<span style="font-size:11px;font-weight:700;color:${kc};white-space:nowrap">${kd.persen}%</span></div>
                    <div style="font-size:10px;color:var(--text3)">${kd.terisi}/${p.totalSiswa} siswa</div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  _renderCardSingle(g, gi) {
    const tp   = g.penugasan.length>0 ? Math.round(g.penugasan.reduce((s,p)=>s+p.persen,0)/g.penugasan.length) : 0;
    const av   = avatarColor(gi);
    const init = initials(g.namaGuru);
    const KL   = this._KOMP_LABEL();
    const klbl = KL[this._filter.komponen] || this._filter.komponen.toUpperCase();
    return `
    <div class="step-card" style="margin-bottom:10px">
      <div class="acc-head" onclick="var rb=this.nextElementSibling;var o=rb.style.display==='block';rb.style.display=o?'none':'block';this.querySelector('.acc-arrow').style.transform=o?'':'rotate(180deg)'">
        <div style="width:32px;height:32px;border-radius:8px;background:${av};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">${init}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.namaGuru}</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">${klbl} — ${g.totalTugas} tugas</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:800;color:${tp>=80?'var(--success)':tp>0?'var(--accent)':'var(--error)'}">${tp}%</div>
            <div style="display:flex;align-items:center;gap:6px;width:80px;margin-top:2px">${this._bar(tp,tp>=80?'green':tp>0?'amber':'red')}</div>
          </div>
          <span class="acc-arrow" style="font-size:10px;color:var(--text3);transition:transform 0.2s">▼</span>
        </div>
      </div>
      <div class="rekap-body" style="display:none">
        <div style="padding:12px 16px">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>${['Mapel','Kelas','Siswa','Terisi','Progress','Status'].map(h=>`<th style="text-align:left;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid var(--border)">${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${g.penugasan.map(p => {
                const si = this._statusInfo(p.persen);
                return `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px;font-size:12px;font-weight:600;color:var(--text)">${p.mapel}</td>
                  <td style="padding:8px;font-size:12px;color:var(--text2)"><span style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600">${p.kelas}</span></td>
                  <td style="padding:8px;font-size:12px;color:var(--text2);text-align:center">${p.totalSiswa}</td>
                  <td style="padding:8px;font-size:12px;color:var(--text);text-align:center;font-weight:600">${p.terisi}/${p.totalSiswa}</td>
                  <td style="padding:8px"><div style="display:flex;align-items:center;gap:6px">${this._bar(p.persen,si.cls)}<span style="font-size:10px;font-weight:700;color:var(--${si.cls==='green'?'success':si.cls==='amber'?'accent':'error'});width:30px;text-align:right">${p.persen}%</span></div></td>
                  <td style="padding:8px;text-align:center"><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:var(--${si.cls==='green'?'success-bg':si.cls==='amber'?'accent-light':'error-bg'});color:var(--${si.cls==='green'?'success':si.cls==='amber'?'accent':'error'})">${si.label}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  renderM() {
    const el = UI.$('k-page-rekap-content');
    if (!el) return;
    const KL = this._KOMP_LABEL();
    const isSemua = this._filter.komponen === 'semua';

    const periodeOptions = this._periode.length
      ? this._periode.map(p => {
          const val = p.semester+'||'+p.tahun;
          const cur = this._s.filterSemester+'||'+this._s.filterTahun;
          return `<option value="${val}" ${val===cur?'selected':''}">Sem ${p.semester} — ${p.tahun}</option>`;
        }).join('')
      : `<option value="">Belum ada data</option>`;

    const kompoOptions = [
      ['semua','Semua komponen'],['uh1','UH 1'],['uh2','UH 2'],
      ['t1','Tugas 1'],['t2','Tugas 2'],['t3','Tugas 3'],['t4','Tugas 4'],
      ['pts','PTS'],['uas','UAS'],
    ].map(([v,l]) => `<option value="${v}" ${this._filter.komponen===v?'selected':''}>${l}</option>`).join('');

    if (!this._loaded) {
      el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        <select onchange="App.rekap._onPeriodeChange(this.value)" style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${periodeOptions}</select>
        <select onchange="App.rekap._onKomponenChange(this.value)" style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${kompoOptions}</select>
        <button class="btn btn-primary" onclick="App.rekap.refresh()">🔄 Muat Data</button>
      </div>
      <div class="k-empty"><div class="k-empty-icon">📊</div><div class="k-empty-sub">Pilih periode lalu klik Muat Data</div></div>`;
      return;
    }

    const stats = this._overallStats();
    el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      <div style="display:flex;gap:6px">
        <select onchange="App.rekap._onPeriodeChange(this.value)" style="flex:1;padding:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${periodeOptions}</select>
        <button class="btn btn-primary btn-sm" onclick="App.rekap.refresh()">🔄</button>
      </div>
      <select onchange="App.rekap._onKomponenChange(this.value)" style="padding:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;font-size:12px;outline:none">${kompoOptions}</select>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding-bottom:2px">
      ${['semua','belum','sebagian','selesai'].map(s=>`<button class="btn btn-sm ${this._filter.status===s?'btn-primary':'btn-ghost'}" onclick="App.rekap.setStatus('${s}')" style="white-space:nowrap;font-size:11px;flex-shrink:0">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}
    </div>
    <input class="k-guru-search" placeholder="🔍 Cari guru / mapel / kelas..." value="${this._filter.search}" oninput="App.rekap.setSearch(this.value)" style="margin-bottom:12px;width:100%" />
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="k-stat-card" style="grid-column:span 2">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Total Pengisian</div>
          <div style="font-size:16px;font-weight:800;color:${stats.persen>=80?'var(--success)':stats.persen>=40?'var(--accent)':'var(--error)'}">${stats.persen}%</div>
        </div>
        <div style="height:6px;background:var(--border2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${stats.persen}%;background:${stats.persen>=80?'var(--success)':stats.persen>=40?'var(--accent)':'var(--error)'};border-radius:4px;transition:width 0.5s"></div></div>
      </div>
      <div class="k-stat-card"><div class="k-stat-icon" style="font-size:16px">✅</div><div class="k-stat-val" style="color:var(--success)">${stats.selesai}</div><div class="k-stat-lbl">Selesai</div></div>
      <div class="k-stat-card"><div class="k-stat-icon" style="font-size:16px">❌</div><div class="k-stat-val" style="color:var(--error)">${stats.belum}</div><div class="k-stat-lbl">Guru Belum Isi</div></div>
    </div>
    ${this._filtered.length===0
      ? `<div class="k-empty"><div class="k-empty-sub">Tidak ada data sesuai filter</div></div>`
      : this._filtered.map((g,gi) => {
          const tp = g.penugasan.length>0?Math.round(g.penugasan.reduce((s,p)=>s+p.persen,0)/g.penugasan.length):0;
          const cc = tp>=80?'var(--success)':tp>0?'var(--accent)':'var(--error)';
          return `
          <div class="k-step-card" style="margin-bottom:10px">
            <div class="k-acc-head" onclick="var b=this.nextElementSibling;var o=b.style.display==='block';b.style.display=o?'none':'block';this.querySelector('.k-acc-arrow').style.transform=o?'':'rotate(180deg)'">
              <div style="width:36px;height:36px;border-radius:9px;background:${avatarColor(gi)};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">${initials(g.namaGuru)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.namaGuru}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
                  <div style="flex:1;height:4px;background:var(--border2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${tp}%;background:${cc};border-radius:4px"></div></div>
                  <span style="font-size:11px;font-weight:700;color:${cc};white-space:nowrap">${tp}%</span>
                </div>
              </div>
              <span class="k-acc-arrow" style="font-size:12px;color:var(--text3);transition:transform 0.2s;margin-left:6px">▼</span>
            </div>
            <div style="display:none;padding:10px 14px">
              ${g.penugasan.map(p => {
                const si  = this._statusInfo(p.persen);
                const kc2 = si.cls==='green'?'var(--success)':si.cls==='amber'?'var(--accent)':'var(--error)';
                return `
                <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:${isSemua?'8':'0'}px">
                    <span style="font-size:12px;font-weight:600;color:var(--text)">${p.mapel}</span>
                    <span style="background:var(--surface2);border:1px solid var(--border2);border-radius:3px;padding:1px 6px;font-size:10px;font-weight:600;color:var(--text2)">${p.kelas}</span>
                    <span style="margin-left:auto;font-size:11px;font-weight:700;color:${kc2}">${p.persen}%</span>
                  </div>
                  ${isSemua && p.komponen ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-top:6px">
                    ${Object.entries(KL).map(([k,lbl]) => {
                      const kd  = p.komponen[k]||{terisi:0,persen:0};
                      const ksi = this._statusInfo(kd.persen);
                      const kc3 = ksi.cls==='green'?'var(--success)':ksi.cls==='amber'?'var(--accent)':'var(--error)';
                      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:6px 8px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                          <span style="font-size:10px;font-weight:700;color:var(--text2)">${lbl}</span>
                          <span style="font-size:10px;font-weight:700;color:${kc3}">${kd.persen}%</span>
                        </div>
                        <div style="height:3px;background:var(--border2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${kd.persen}%;background:${kc3};border-radius:3px"></div></div>
                      </div>`;
                    }).join('')}
                  </div>` : ''}
                </div>`;
              }).join('')}
              <div style="padding-top:8px;font-size:11px;color:var(--text3)">${g.totalTugas} tugas · ${g.sudahTerisi} selesai ≥80%</div>
            </div>
          </div>`;
        }).join('')
    }`;
  }
}
