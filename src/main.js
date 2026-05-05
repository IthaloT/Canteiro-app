   INIT
═══════════════════════════════════════════════════════════ */
/* ── Sidebar collapse (restored) ────────────────────────────── */
function toggleSidebar() {
  const nav = document.getElementById('sidebar');
  if (!nav) return;
  const collapsed = nav.classList.toggle('collapsed');
  localStorage.setItem('canteiro_sidebar', collapsed ? '1' : '0');
  const isDesktop = window.innerWidth >= 1024;
  const timer = document.getElementById('focus-timer-widget');
  const kbdBtn = document.getElementById('kbd-hint-widget');
  if (timer) timer.style.display = (isDesktop && !collapsed) ? 'block' : 'none';
  if (kbdBtn) kbdBtn.style.display = (isDesktop && !collapsed) ? 'flex' : 'none';
  if (collapsed) { const p = document.getElementById('kbd-hint-panel'); if (p) p.classList.remove('open'); }
}

/* ── Horizonte linking (restored) ───────────────────────────── */
let _pendingLinkHistId = null;
function offerLinkHorizonte(histId, nomeCiclo) {
  _pendingLinkHistId = histId;
  const horizs = (S.horizontes || []).filter(x => !x.status || x.status === 'ativo');
  if (horizs.length === 0) return;
  const sel = document.getElementById('link-horizonte-sel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Nenhum —</option>' +
    horizs.map(h => `<option value="${h.id}">${esc(h.nome||'')}</option>`).join('');
  document.getElementById('link-horizonte-nome').textContent = nomeCiclo.slice(0, 40);
  openM('mbg-link-horizonte');
}
function confirmLinkHorizonte() {
  const sel = document.getElementById('link-horizonte-sel');
  if (!sel || !_pendingLinkHistId) return closeM('mbg-link-horizonte');
  const horizonteId = sel.value;
  if (horizonteId) {
    const entry = (S.historico || []).find(h => h.id === _pendingLinkHistId);
    if (entry) { entry.horizonteVinculo = horizonteId; persist(); renderPredio(); }
  }
  _pendingLinkHistId = null;
  closeM('mbg-link-horizonte');
}

/* ── Propósito diary (restored) ─────────────────────────────── */
function toggleDiario() {
  const body = document.getElementById('diario-body');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    const mf = document.getElementById('diario-filter-month');
    if (mf && !mf.value) {
      const now = new Date();
      mf.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    }
    renderDiario();
  }
}
function addDiario() {
  const el = document.getElementById('inp-diario');
  const txt = el.value.trim(); if (!txt) return el.focus();
  if (!S.fundacao.diario) S.fundacao.diario = [];
  S.fundacao.diario.unshift({ id: uid(), data: today(), texto: txt });
  el.value = '';
  persist(); renderDiario();
}
function renderDiario() {
  if (!S.fundacao.diario) S.fundacao.diario = [];
  const cnt = document.getElementById('diario-cnt');
  const n = S.fundacao.diario.length;
  if (cnt) cnt.textContent = n > 0 ? `(${n})` : '';
  const list = document.getElementById('list-diario');
  if (!list) return;
  const mf = document.getElementById('diario-filter-month');
  const filtroMes = mf ? mf.value : '';
  const entries = filtroMes
    ? S.fundacao.diario.filter(e => e.data && e.data.startsWith(filtroMes))
    : S.fundacao.diario;
  if (n === 0) { list.innerHTML = '<div style="font-size:11px;color:var(--t3);font-family:Georgia,serif;padding:4px 0">Nenhum registro ainda.</div>'; return; }
  if (entries.length === 0) { list.innerHTML = '<div style="font-size:11px;color:var(--t3);font-family:Georgia,serif;padding:4px 0">Nenhum registro neste período.</div>'; return; }
  list.innerHTML = entries.map(e =>
    `<div class="diario-entry">
      <div class="diario-entry-date">
        <button class="diario-del" onclick="removeDiario('${e.id}')">×</button>
        ${fmtDate(e.data)}
      </div>
      <div>${esc(e.texto)}</div>
    </div>`
  ).join('');
}
function removeDiario(id) {
  showConfirm('Remover esta entrada do diário?', () => {
    S.fundacao.diario = (S.fundacao.diario || []).filter(e => e.id !== id);
    persist(); renderDiario();
  });
}

function renderAll() {
  const activeTab = document.querySelector('.tab.active');
  const name = activeTab ? activeTab.id.replace('tab-', '') : 'rotina';
  const renders = {
    rotina:  () => { renderHabitos(); renderPorao(); renderDesafios(); _updateRotinaTabCounts(); renderRotinaStrip(); },
    caderno: renderCaderno,
    predio:  renderPredio,
  };
  (renders[name] || renders.rotina)();
}


function init() {
  // Garante que os objetos principais existam ANTES de ler as propriedades
  if (!S.meta) S.meta = { ultimaSync: null };
  if (!S.settings) S.settings = { scriptUrl: '' };
  if (!S.fundacao) S.fundacao = { missao: '', historico: [] };

  // Garante campos novos em dados antigos carregados do localStorage
  if (!S.fundacao.historico) S.fundacao.historico = [];
  if (!S.pilares_arquivados) S.pilares_arquivados = [];
  if (!S.habitosArquivados) S.habitosArquivados = [];
  if (!S.ideias) S.ideias = [];
  if (!S.tagIdeias) S.tagIdeias = [];
  if (!S.contratos) S.contratos = [];
  if (!S.desafios) S.desafios = [];

  // Fix add habito button — safe selector (element may have changed)
  const addHabBtn = document.querySelector('[onclick*="mbg-add-habito"]');
  if (addHabBtn) addHabBtn.onclick = openM_addHabito;

  // Inicializa toggles de dias nos modais fixos
  initDiasToggle('inp-hab-dias');
  initDiasToggle('inp-vicio-dias');

  // Kanban drag-and-drop
  initKanbanDrop();

  // Responsive nav — mostra/oculta elementos da sidebar no desktop
  function applyNavLayout() {
    const isDesktop = window.innerWidth >= 1024;
    const logo = document.getElementById('nav-logo-desktop');
    const actions = document.getElementById('nav-bottom-actions');
    const toggleBtn = document.getElementById('nav-toggle-btn');
    const timer = document.getElementById('focus-timer-widget');
    const kbdHint = document.getElementById('kbd-hint-widget');
    if (logo) logo.style.display = isDesktop ? 'flex' : 'none';
    if (actions) actions.style.display = isDesktop ? 'flex' : 'none';
    if (toggleBtn) toggleBtn.style.display = isDesktop ? 'flex' : 'none';
    // Timer and kbd-hint: controlled by CSS (nav.collapsed hides them)
    // Only toggle the desktop-only class, not inline display
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = sidebar && sidebar.classList.contains('collapsed');
    if (timer) timer.style.display = (isDesktop && !isCollapsed) ? 'block' : 'none';
    if (kbdHint) {
      const isCollapsed2 = sidebar && sidebar.classList.contains('collapsed');
      kbdHint.style.display = (isDesktop && !isCollapsed2) ? 'flex' : 'none';
    }
  }
  applyNavLayout();
  initSidebar();
  window.addEventListener('resize', () => { applyNavLayout(); initPredioNav(); });

  initKeyboardShortcuts();
  _ftRenderPresets();
  _ftRenderCycles();

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/Canteiro-Pessoal-APP/sw.js', { scope: '/Canteiro-Pessoal-APP/' }).catch(() => {});
  }

  // Sync on app close/unload
  window.addEventListener('beforeunload', () => { if (S.settings.scriptUrl && navigator.onLine) triggerSync(); });

  // Online/offline indicator
  window.addEventListener('online', () => {
    document.getElementById('offline-banner').classList.remove('show');
    setSyncStatus('syncing', '');
    pullFromCloud().then(() => triggerSync());
  });
  window.addEventListener('offline', () => {
    document.getElementById('offline-banner').classList.add('show');
    setSyncStatus('err', 'Offline');
  });

  // Pull ao voltar para o app (trocar de aba, desbloquear celular etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      pullFromCloud();
    }
  });

  if (!navigator.onLine) document.getElementById('offline-banner').classList.add('show');

  // Initial render — call full render for active tab
  renderHabitos();
  renderPorao();
  renderDesafios();
  _updateRotinaTabCounts();
  renderRotinaStrip();

  // Onboarding
  checkOnboarding();

  // Sync + pull iniciais
  if (S.settings.scriptUrl && navigator.onLine) {
    const isNew = checkNewDevice();
    if (!isNew) {
      // Puxa primeiro (recebe dados mais recentes), depois envia local
      pullFromCloud().then(() => setTimeout(doSync, 2000));
    }
  } else {
    setSyncStatus(navigator.onLine ? (S.meta.ultimaSync ? 'ok' : '') : 'err', S.meta.ultimaSync ? fmt(S.meta.ultimaSync) : '');
  }
}

init();

      function updateRotinaHeader() {
        const hdrDate = document.getElementById('rdh-date-lbl');
        const hdrBadges = document.getElementById('rdh-badges-container');
        if (!hdrDate || !hdrBadges) return;

        const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        hdrDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        const dHoje = today();

        let pendingDesafios = 0;
        (S.desafios || []).filter(d => d.ativo !== false).forEach(d => {
          const start = new Date(d.inicioEm + 'T00:00:00');
          const maxDays = d.duracaoDias;
          const diaAtual = Math.floor((new Date(dHoje + 'T00:00:00') - start) / 86400000) + 1;
          if (diaAtual <= maxDays) {
            const reg = (d.registros || {})[dHoje];
            if (d.modo === 'construir' && reg !== 'feito') pendingDesafios++;
            if (d.modo === 'resistir' && reg !== 'resistiu' && reg !== 'cedi') pendingDesafios++;
          }
        });

        let pendingHabitos = 0;
        const dObj = new Date(dHoje + 'T00:00:00');
        const wDay = dObj.getDay(); 
        (S.habitos || []).forEach(h => {
          const mapDays = [6, 0, 1, 2, 3, 4, 5];
          const bit = mapDays[wDay];
          if (h.dias[bit] === '1') {
            const reg = (h.registros || {})[dHoje];
            if (reg !== 'feito') pendingHabitos++;
          }
        });

        let pendingVicios = 0;
        (S.vicios || []).filter(v => v.ativo !== false).forEach(v => {
          const reg = (v.registros || {})[dHoje];
          if (reg !== 'resistiu' && reg !== 'cedi') pendingVicios++;
        });

        let html = '';
        if (pendingDesafios > 0) html += `<div class="rdh-badge rdh-badge--desafios">🔥 ${pendingDesafios} Desafios</div>`;
        else html += `<div class="rdh-badge rdh-badge--done">🔥 Concluídos</div>`;

        if (pendingHabitos > 0) html += `<div class="rdh-badge rdh-badge--habitos">🧱 ${pendingHabitos} Hábitos</div>`;
        else html += `<div class="rdh-badge rdh-badge--done">🧱 Concluídos</div>`;

        if (pendingVicios > 0) html += `<div class="rdh-badge rdh-badge--vicios">🛡️ ${pendingVicios} Vícios</div>`;
        else html += `<div class="rdh-badge rdh-badge--done">🛡️ Protegido</div>`;

        hdrBadges.innerHTML = html;
      }

      function rsecWrap(cards, idPrefix) {
        if (!cards.length) return '';
        const limit = 4;
        if (cards.length <= limit) return cards.join('');
        const vis = cards.slice(0, limit).join('');
        const hid = cards.slice(limit).join('');
        return `
          ${vis}
          <div id="${idPrefix}-hidden" style="display:none;margin-top:8px">${hid}</div>
          <button class="rsec-show-more" id="${idPrefix}-btn" onclick="toggleRsec('${idPrefix}')">Ver mais ${cards.length - limit} itens ▼</button>
        `;
      }
      
      function toggleRsec(id) {
        const div = document.getElementById(id + '-hidden');
        const btn = document.getElementById(id + '-btn');
        if (div.style.display === 'none') {
          div.style.display = 'block';
          btn.textContent = 'Recolher ▲';
        } else {
          div.style.display = 'none';
          btn.textContent = `Ver mais ${div.children.length} itens ▼`;
        }
      }

      function openCtx(type, id) {
        const acts = `
          <button class="ctx-sheet-item" onclick="execCtx('${type}','${id}','pular')"><span class="ctx-sheet-icon">⏭️</span><div class="ctx-sheet-lbl">Pular Hoje<div class="ctx-sheet-sub">Não quebra a ofensiva</div></div></button>
          <button class="ctx-sheet-item danger" onclick="execCtx('${type}','${id}','falha')"><span class="ctx-sheet-icon">❌</span><div class="ctx-sheet-lbl">Falhei Hoje<div class="ctx-sheet-sub">Zera a sequência atual</div></div></button>
          <button class="ctx-sheet-item" onclick="execCtx('${type}','${id}','ontem')"><span class="ctx-sheet-icon">⏪</span><div class="ctx-sheet-lbl">Preencher Ontem<div class="ctx-sheet-sub">Lançamento retroativo</div></div></button>
        `;
        document.getElementById('mbg-confirm').classList.add('open');
        document.getElementById('m-confirm').innerHTML = `
          <div class="m-title">Opções</div>
          <div style="display:flex;flex-direction:column;gap:0;">${acts}</div>
          <div style="margin-top:16px;text-align:center;"><button class="btn btn-g" onclick="closeM('mbg-confirm')">Cancelar</button></div>
        `;
      }

      function execCtx(type, id, action) {
        closeM('mbg-confirm');
        const dHoje = today();
        const dOntem = new Date(); dOntem.setDate(dOntem.getDate() - 1);
        const sOntem = dOntem.toLocaleDateString('sv');

        let item, reg;
        if (type === 'hab') {
          item = S.habitos.find(x => x.id === id);
          if(!item) return;
          item.registros = item.registros || {};
          if (action === 'pular') item.registros[dHoje] = 'pulou';
          if (action === 'falha') item.registros[dHoje] = 'faltou';
          if (action === 'ontem') item.registros[sOntem] = 'feito';
          renderHabitos();
        } else if (type === 'des') {
          item = S.desafios.find(x => x.id === id);
          if(!item) return;
          item.registros = item.registros || {};
          if (action === 'pular') item.registros[dHoje] = 'pulou';
          if (action === 'falha') item.registros[dHoje] = 'cedi';
          if (action === 'ontem') item.registros[sOntem] = item.modo === 'construir' ? 'feito' : 'resistiu';
          renderDesafios();
        } else if (type === 'vic') {
          item = S.vicios.find(x => x.id === id);
          if(!item) return;
          item.registros = item.registros || {};
          if (action === 'pular') item.registros[dHoje] = 'pulou';
          if (action === 'falha') item.registros[dHoje] = 'cedi';
          if (action === 'ontem') item.registros[sOntem] = 'resistiu';
          renderVicios();
        }
        updateRotinaHeader();
        syncG();
      }

      function getStreak(registros, startStr) {
        if (!registros) return 0;
        let c = 0;
        const limit = 365;
        for (let i = 0; i < limit; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const ds = d.toLocaleDateString('sv');
          if (startStr && ds < startStr) break;
          const r = registros[ds];
          if (r === 'feito' || r === 'resistiu') c++;
          else if (r === 'pulou' || (ds === today() && !r)) { /* skip */ }
          else break;
        }
        return c;
      }

      function renderDesafios() {
        const list = document.getElementById('desafios-list');
        const hdrCount = document.getElementById('desafios-hdr-count');
        if (!list) return;

        const ativos = (S.desafios||[]).filter(d => d.ativo !== false);
        if (hdrCount) hdrCount.textContent = ativos.length;

        if (ativos.length === 0) {
          list.innerHTML = '<div class="empty">🎯<br>Nenhum desafio ativo.</div>';
          updateRotinaHeader();
          return;
        }

        const _desCards = ativos.map(d => {
          const inicio = new Date(d.inicioEm + 'T00:00:00');
          const hoje = new Date(today() + 'T00:00:00');
          const diaAtual = Math.floor((hoje - inicio) / 86400000) + 1;
          const diasRestantes = Math.max(0, d.duracaoDias - diaAtual + 1);
          const concluido = diaAtual > d.duracaoDias;
          const pct = Math.min(100, Math.round((diaAtual - 1) / d.duracaoDias * 100));
          const reg = (d.registros || {})[today()] || '';
          
          let btnHtml = '';
          if (concluido) {
            btnHtml = `<button class="hab-btn hab-btn--check done">🎉 Finalizado</button>`;
          } else {
            if (d.modo === 'construir') {
              if (reg === 'feito') btnHtml = `<button class="hab-btn hab-btn--check done" onclick="cycleDesafioDay('${d.id}','${today()}')">✓ Feito</button>`;
              else if (reg === 'faltou') btnHtml = `<button class="hab-btn hab-btn--cedi done" onclick="cycleDesafioDay('${d.id}','${today()}')">✕ Falha</button>`;
              else btnHtml = `<button class="hab-btn hab-btn--check" onclick="cycleDesafioDay('${d.id}','${today()}')">Marcar Feito</button>`;
            } else {
              if (reg === 'resistiu') btnHtml = `<button class="hab-btn hab-btn--resistir done" onclick="cycleDesafioDay('${d.id}','${today()}')">🛡️ Resisti</button>`;
              else if (reg === 'cedi') btnHtml = `<button class="hab-btn hab-btn--cedi done" onclick="cycleDesafioDay('${d.id}','${today()}')">✕ Cedi</button>`;
              else btnHtml = `<button class="hab-btn hab-btn--resistir" onclick="cycleDesafioDay('${d.id}','${today()}')">Resistir</button>`;
            }
          }

          const streak = getStreak(d.registros, d.inicioEm);
          const streakHtml = streak > 2 ? `<div class="streak-badge ${streak > 10 ? 'streak-badge--high' : ''}">🔥 ${streak}</div>` : '';

          return `<div class="hab-card">
            <div class="hab-card-top">
              <div class="hab-card-nome">\${esc(d.nome)} \${streakHtml} <div class="hab-card-meta">\${d.modo === 'construir' ? '🧱 Construir' : '💣 Resistir'}</div></div>
              <div class="hab-card-actions">
                <button class="hab-btn--ctx" onclick="openCtx('des','\${d.id}')">⋮</button>
                <button class="hab-btn--ctx" onclick="removeDesafio('\${d.id}')" style="color:var(--red)">×</button>
              </div>
            </div>
            <div class="hab-prog-wrap">
              <div class="hab-prog-label"><span>Dia \${diaAtual}/\${d.duracaoDias} (\${diasRestantes}d restantes)</span><span>\${pct}%</span></div>
              <div class="hab-prog-track"><div class="hab-prog-fill \${d.modo==='resistir'?'hab-prog-fill--vicio':''}" style="width:\${pct}%"></div></div>
            </div>
            <div style="text-align:right">\${btnHtml}</div>
          </div>`;
        });

        list.innerHTML = rsecWrap(_desCards, 'desafios');
        updateRotinaHeader();
      }

      function renderHabitos() {
        const list = document.getElementById('habitos-list');
        const hdrCount = document.getElementById('habitos-hdr-count');
        if (!list) return;

        const hj = today();
        const dObj = new Date(hj + 'T00:00:00');
        const wDay = dObj.getDay();

        let countHj = 0;
        const cards = (S.habitos||[]).map(h => {
          const mapDays = [6, 0, 1, 2, 3, 4, 5];
          const bit = mapDays[wDay];
          const isToday = h.dias[bit] === '1';
          if (isToday) countHj++;
          if (!isToday) return ''; 

          const reg = (h.registros || {})[hj] || '';
          let btnHtml = '';
          if (reg === 'feito') btnHtml = `<button class="hab-btn hab-btn--check done" onclick="cycleHabitoDay('\${h.id}','\${hj}')">✓ Feito</button>`;
          else if (reg === 'parcial') btnHtml = `<button class="hab-btn hab-btn--parcial done" onclick="cycleHabitoDay('\${h.id}','\${hj}')">~ Parcial</button>`;
          else if (reg === 'faltou') btnHtml = `<button class="hab-btn hab-btn--cedi done" onclick="cycleHabitoDay('\${h.id}','\${hj}')">✕ Falha</button>`;
          else btnHtml = `<button class="hab-btn hab-btn--check" onclick="cycleHabitoDay('\${h.id}','\${hj}')">Marcar Feito</button>`;

          let vincHtml = '';
          if (h.links && h.links.length > 0) {
            h.links.forEach(lk => {
              const p = findPredio(lk);
              if (p) vincHtml += `<span class="habito-vtag">\${esc(p.nome)}</span>`;
            });
          }

          const streak = getStreak(h.registros, null);
          const streakHtml = streak > 2 ? `<div class="streak-badge \${streak > 10 ? 'streak-badge--high' : ''}">🔥 \${streak}</div>` : '';

          return `<div class="hab-card">
            <div class="hab-card-top">
              <div class="hab-card-nome">\${esc(h.nome)} \${streakHtml} <div class="hab-card-meta">\${vincHtml}</div></div>
              <div class="hab-card-actions">
                <button class="hab-btn--ctx" onclick="openCtx('hab','\${h.id}')">⋮</button>
                <button class="hab-btn--ctx" onclick="editHabito('\${h.id}')">✎</button>
              </div>
            </div>
            <div style="text-align:right">\${btnHtml}</div>
          </div>`;
        }).filter(Boolean);

        if (hdrCount) hdrCount.textContent = countHj;

        if (cards.length === 0) {
          list.innerHTML = '<div class="empty">🧱<br>Nenhum hábito para hoje.</div>';
        } else {
          list.innerHTML = rsecWrap(cards, 'habitos');
        }
        updateRotinaHeader();
      }

      function renderVicios() {
        const list = document.getElementById('vicios-list');
        const hdrCount = document.getElementById('vicios-hdr-count');
        if (!list) return;

        const ativos = (S.vicios||[]).filter(v => v.ativo !== false);
        if (hdrCount) hdrCount.textContent = ativos.length;

        if (ativos.length === 0) {
          list.innerHTML = '<div class="empty">🛡️<br>Nenhum vício rastreado.</div>';
          updateRotinaHeader();
          return;
        }

        const _vicCards = ativos.map(v => {
          const reg = (v.registros || {})[today()] || '';
          let btnHtml = '';
          if (reg === 'resistiu') btnHtml = `<button class="hab-btn hab-btn--resistir done" onclick="cycleVicioDay('\${v.id}','\${today()}')">🛡️ Protegido</button>`;
          else if (reg === 'cedi') btnHtml = `<button class="hab-btn hab-btn--cedi done" onclick="cycleVicioDay('\${v.id}','\${today()}')">✕ Cedi</button>`;
          else btnHtml = `<button class="hab-btn hab-btn--resistir" onclick="cycleVicioDay('\${v.id}','\${today()}')">Estou Limpo</button>`;

          let vincHtml = '';
          if (v.links && v.links.length > 0) {
            v.links.forEach(lk => {
              const p = findPredio(lk);
              if (p) vincHtml += `<span class="habito-vtag">\${esc(p.nome)}</span>`;
            });
          }

          const streak = getStreak(v.registros, null);
          const streakHtml = streak > 0 ? `<div class="streak-badge \${streak > 10 ? 'streak-badge--high' : ''}">🛡️ \${streak}</div>` : '';

          return `<div class="hab-card">
            <div class="hab-card-top">
              <div class="hab-card-nome">\${esc(v.nome)} \${streakHtml} <div class="hab-card-meta">\${vincHtml}</div></div>
              <div class="hab-card-actions">
                <button class="hab-btn--ctx" onclick="openCtx('vic','\${v.id}')">⋮</button>
                <button class="hab-btn--ctx" onclick="removeVicio('\${v.id}')" style="color:var(--red)">×</button>
              </div>
            </div>
            <div style="text-align:right">\${btnHtml}</div>
          </div>`;
        });

        list.innerHTML = rsecWrap(_vicCards, 'vicios');
        updateRotinaHeader();
      }

      function moveTaskTo(id, newCol) {
        const t = S.caderno.find(x => x.id === id);
        if (!t) return;
        t.status = newCol;
        t.modificadoEm = new Date().toISOString();
        renderKanban();
        syncG();
      }

      function renderKanban() {
        const afazerList = document.getElementById('k-afazer');
        const fazendoList = document.getElementById('k-fazendo');
        const feitoList = document.getElementById('k-feito');
        if (!afazerList || !fazendoList || !feitoList) return;
        
        afazerList.innerHTML = ''; fazendoList.innerHTML = ''; feitoList.innerHTML = '';
        
        const cols = ['k-afazer', 'k-fazendo', 'k-feito'];
        cols.forEach(c => {
          const el = document.getElementById(c);
          if (el) {
            el.removeAttribute('ondragover');
            el.removeAttribute('ondrop');
          }
        });

        const activeTasks = S.caderno.filter(t => !t.inbox && t.status !== 'removido');
        const kCount = { afazer: 0, fazendo: 0, feito: 0 };
        
        activeTasks.sort((a, b) => b.prioridade - a.prioridade).forEach(t => {
          kCount[t.status]++;
          const pk = 'p' + t.prioridade;
          
          let actionBtns = '';
          if (t.status === 'afazer') {
            actionBtns = `<button class="k-btn-move" onclick="moveTaskTo('\${t.id}', 'fazendo')">Iniciar ▶</button>`;
          } else if (t.status === 'fazendo') {
            actionBtns = `
              <button class="k-btn-move" onclick="moveTaskTo('\${t.id}', 'afazer')">◀ Voltar</button>
              <button class="k-btn-move" onclick="moveTaskTo('\${t.id}', 'feito')" style="color:var(--green)">✓ Concluir</button>`;
          } else if (t.status === 'feito') {
            actionBtns = `<button class="k-btn-move" onclick="moveTaskTo('\${t.id}', 'fazendo')">◀ Retomar</button>`;
          }

          let breadcrumb = '';
          if (t.link) {
            const p = findPredio(t.link);
            if (p) breadcrumb = `<div style="font-size:9px;color:var(--t3);margin-bottom:4px">📍 \${esc(p.nome)}</div>`;
          }

          const cardHtml = `<div class="k-card" data-id="\${t.id}">
            \${breadcrumb}
            <div class="k-card-top">
              <span class="k-card-txt">\${esc(t.texto)}</span>
              <div style="display:flex;">
                  <button class="k-card-del" onclick="editTask('\${t.id}')">✎</button>
                  <button class="k-card-del" onclick="removeTask('\${t.id}')">×</button>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <div style="display:flex;gap:6px">
                \${t.tag ? \`<span class="k-tag k-tag-\${t.tag}">\${TAG_LABELS[t.tag] || t.tag}</span>\` : (PRI_LABELS[pk] ? \`<span class="k-tag \${pk}">\${PRI_LABELS[pk]}</span>\` : '')}
              </div>
              <div style="display:flex;gap:4px">
                \${actionBtns}
              </div>
            </div>
          </div>`;

          if (t.status === 'afazer') afazerList.innerHTML += cardHtml;
          else if (t.status === 'fazendo') fazendoList.innerHTML += cardHtml;
          else if (t.status === 'feito') feitoList.innerHTML += cardHtml;
        });

        document.getElementById('k-afazer-n').textContent = kCount.afazer;
        document.getElementById('k-fazendo-n').textContent = kCount.fazendo;
        document.getElementById('k-feito-n').textContent = kCount.feito;
      }

      function openM_addVicio() {
        document.getElementById('vi-nome').value = '';
        openM('mbg-vi');
      }

      function renovarContrato(id) {
        const c = S.contratos.find(x => x.id === id);
        if (!c) return;
        c.renovadoEm = new Date().toISOString();
        toast('Contrato Renovado!');
        renderContratos();
        syncG();
      }

      function renderInbox() {
        const lst = document.getElementById('inbox-list');
        const hC = document.getElementById('inbox-hdr-count');
        if (!lst) return;

        const arr = S.caderno.filter(x => x.inbox);
        if (hC) hC.textContent = arr.length;

        if (arr.length === 0) {
          lst.innerHTML = '<div class="empty">Caixa de entrada vazia.</div>';
          return;
        }

        arr.sort((a,b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

        let h = '';
        arr.forEach(t => {
          h += `<div class="inbox-item">
            <div class="inbox-txt">\${esc(t.texto)}
              <div class="inbox-meta">\${dtf(t.criadoEm)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button class="triage-btn" onclick="openTriage('\${t.id}')">Triar</button>
              <button class="xbtn" onclick="removeTask('\${t.id}')">×</button>
            </div>
          </div>`;
        });
        lst.innerHTML = h;
      }

      function addIdea(txt) {
        if (!txt.trim()) return;
        S.caderno.unshift({
          id: gid(), texto: txt.trim(), inbox: true,
          status: 'afazer', link: '', prioridade: 00, tag: '', desc: '', criadoEm: new Date().toISOString()
        });
        renderInbox();
        syncG();
      }

      function savePredi() {
        const t = document.getElementById('pi-tipo').value;
        if (t === 'longo') {
          const ano = parseInt(document.getElementById('pi-horizonte').value);
          const curYear = new Date().getFullYear();
          if (!ano || ano < curYear) {
            alert('A meta de longo prazo deve ser para o futuro (ano no mínimo ' + curYear + ').');
            return;
          }
        }
        
        const id = document.getElementById('pi-id').value;
        const o = {
          nome: document.getElementById('pi-nome').value.trim(),
          tipo: t,
          status: document.getElementById('pi-status').value,
          area: document.getElementById('pi-area').value,
          icone: document.getElementById('pi-icone').value,
          modificadoEm: new Date().toISOString()
        };
        if(!o.nome) return alert('Nome obrigatório');
        
        if(t==='longo') {
          o.horizonteAno = document.getElementById('pi-horizonte').value;
        } else if(t==='projeto') {
          o.vincLongo = document.getElementById('pi-vinc-longo').value;
          o.prazo = document.getElementById('pi-prazo').value;
        } else if(t==='chave') {
          o.vincProj = document.getElementById('pi-vinc-proj').value;
        }
        
        if(id) {
          const idx = S.predio.findIndex(x=>x.id===id);
          if(idx>-1) S.predio[idx] = {...S.predio[idx], ...o};
        } else {
          o.id = gid();
          o.criadoEm = new Date().toISOString();
          S.predio.push(o);
        }
        closeM('mbg-pi'); renderPredio(); syncG();
      }

      function saveEditPredi() { savePredi(); }