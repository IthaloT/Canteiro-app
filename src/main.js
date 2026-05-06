/* ── INIT ───────────────────────────────────────────── */
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