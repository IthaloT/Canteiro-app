   UTILITÁRIOS
═══════════════════════════════════════════════════════════ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function today() { return new Date().toLocaleDateString('sv'); }
function fmt(d) { if (!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d) { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getWeekDays() {
  const hoje = new Date();
  const dia  = hoje.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const seg  = new Date(hoje); seg.setDate(hoje.getDate() + diff);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = new Date(seg); d.setDate(seg.getDate() + i); days.push(d.toLocaleDateString('sv')); }
  return days;
}

function getLast30() {
  const days = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toLocaleDateString('sv')); }
  return days;
}

function calcVicioStreak(regs) {
  let s = 0; const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toLocaleDateString('sv');
    if (regs[ds] === 'resistiu') { s++; d.setDate(d.getDate() - 1); } else break;
  }
  return s;
}

function getPrediLabel(id) {
  for (const tipo of ['frentes','ciclos','horizontes','pilares']) {
    const item = S[tipo].find(x => x.id === id);
    if (item) return { nome: item.nome || item.texto, tipo };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   NAVEGAÇÃO
═══════════════════════════════════════════════════════════ */
// Estado do toggle da aba Rotina
let rotinaView = 'construir';

function setTab(name, el) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  el.classList.add('active');
  const renders = {
    rotina: () => { renderHabitos(); renderPorao(); renderDesafios(); _updateRotinaTabCounts(); renderRotinaStrip(); },
    caderno: renderCaderno,
    predio: renderPredio,
  };
  renders[name]?.();
}

function setRotinaView(view) { rotinaView = view || 'construir'; }


const RSEC_LIMIT = 4; // max items visible per section before collapse
const _rsecExpanded = {}; // tracks which sections are expanded

function rsecShowMore(id) {
  _rsecExpanded[id] = !_rsecExpanded[id];
  if      (id === 'habitos')  renderHabitos();
  else if (id === 'vicios')   renderPorao();
  else if (id === 'desafios') renderDesafios();
}

function rsecWrap(items, sectionId, renderFn) {
  // items: array of rendered HTML strings
  // Returns HTML with show-more button if needed
  const expanded = _rsecExpanded[sectionId];
  const limit = RSEC_LIMIT;
  if (items.length <= limit) return items.join('');
  const visible = expanded ? items : items.slice(0, limit);
  const hidden = items.length - limit;
  const btnLabel = expanded
    ? `▲ Mostrar menos`
    : `▼ Ver mais ${hidden} ${sectionId === 'habitos' ? 'hábito' : sectionId === 'vicios' ? 'vício' : 'desafio'}${hidden > 1 ? 's' : ''}`;
  return visible.join('') + `<button class="rsec-show-more" onclick="rsecShowMore('${sectionId}')">${btnLabel}</button>`;
}

function renderRotinaStrip() {
  const el = document.getElementById('rotina-strip');
  if (!el) return;
  const t = today();
  const habs = (S.habitos||[]).filter(h => !h.arquivado);
  const habFeitos = habs.filter(h => (h.registros||{})[t] === 'feito').length;
  let bestStreak = 0;
  habs.forEach(h => {
    let s = 0; const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = d.toLocaleDateString('sv'); d.setDate(d.getDate() - 1);
      if ((h.registros||{})[ds] === 'feito') s++; else break;
    }
    if (s > bestStreak) bestStreak = s;
  });
  const desAtivos = (S.desafios||[]).filter(d => d.ativo !== false).length;
  const vicOk  = (S.vicios||[]).filter(v => (v.registros||{})[t] === 'resistiu').length;
  const vicTot = (S.vicios||[]).length;
  const parts = [];
  if (habs.length)  parts.push(`🧱 ${habFeitos}/${habs.length} hoje`);
  if (bestStreak>1) parts.push(`🔥 ${bestStreak}d`);
  if (desAtivos)    parts.push(`🎯 ${desAtivos} desafio${desAtivos>1?'s':''}`);
  if (vicTot)       parts.push(`🛡️ ${vicOk}/${vicTot}`);
  el.textContent = parts.join('  ·  ');
  const meta = document.getElementById('hab-hoje-meta');
  if (meta && habs.length) meta.textContent = `${habFeitos}/${habs.length} hoje`;
}


function rotinaAddAction() {
  if (rotinaView === 'construir') openM_addHabito();
  else if (rotinaView === 'destruir') openM('mbg-add-vicio');
  else openM('mbg-add-desafio');
}

function _updateRotinaTabCounts() {
  const hc = document.getElementById('rtab-hab-cnt');
  const vc = document.getElementById('rtab-vic-cnt');
  const dc = document.getElementById('rtab-des-cnt');
  if (hc) hc.textContent = (S.habitos||[]).filter(h=>!h.arquivado).length;
  if (vc) vc.textContent = (S.vicios||[]).length;
  if (dc) dc.textContent = (S.desafios||[]).filter(d=>d.ativo!==false).length;
}


/* ══════════════════════════════════════════════════════════════
   DESAFIOS
══════════════════════════════════════════════════════════════ */
function setDesafioMode(modo) {
  document.getElementById('inp-des-modo').value = modo;
  const bc = document.getElementById('des-mode-construir');
  const br = document.getElementById('des-mode-resistir');
  bc.style.cssText = modo==='construir'
    ? 'flex:1;border-color:var(--green);color:var(--green);background:rgba(61,158,106,.1)'
    : 'flex:1';
  br.style.cssText = modo==='resistir'
    ? 'flex:1;border-color:var(--red);color:var(--red);background:var(--rd)'
    : 'flex:1';
}

function setDesafioDur(dias) {
  document.getElementById('inp-des-dur').value = dias;
  document.querySelectorAll('.des-dur-preset').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === dias);
    b.style.background = parseInt(b.textContent) === dias ? 'var(--acc-d)' : '';
    b.style.borderColor = parseInt(b.textContent) === dias ? 'var(--acc)' : '';
    b.style.color = parseInt(b.textContent) === dias ? 'var(--acc)' : '';
  });
}

function saveDesafio() {
  const nome = document.getElementById('inp-des-nome').value.trim();
  if (!nome) return document.getElementById('inp-des-nome').focus();
  const modo = document.getElementById('inp-des-modo').value;
  const dur  = parseInt(document.getElementById('inp-des-dur').value) || 21;
  if (!S.desafios) S.desafios = [];
  S.desafios.push({ id: uid(), nome, modo, duracaoDias: dur, inicioEm: today(), registros: {}, ativo: true });
  persist(); closeM('mbg-add-desafio');
  document.getElementById('inp-des-nome').value = '';
  renderDesafios(); _updateRotinaTabCounts();
}

function cycleDesafioDay(id, ds) {
  const d = (S.desafios||[]).find(x => x.id === id); if (!d) return;
  if (!d.registros) d.registros = {};
  const cur = d.registros[ds] || '';
  if (d.modo === 'construir') {
    d.registros[ds] = cur === 'feito' ? '' : 'feito';
  } else {
    d.registros[ds] = cur === 'resistiu' ? 'cedi' : cur === 'cedi' ? '' : 'resistiu';
  }
  persist(); renderDesafios();
}

function removeDesafio(id) {
  showConfirm('Remover este desafio?', () => {
    S.desafios = (S.desafios||[]).filter(x => x.id !== id);
    persist(); renderDesafios(); _updateRotinaTabCounts();
  });
}

function flipFloor(id) { document.getElementById('fl-' + id).classList.toggle('open'); }

/* ═══════════════════════════════════════════════════════════
   MODAIS
═══════════════════════════════════════════════════════════ */
function openM(id) { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.mbg').forEach(bg => bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); }));

function showConfirm(msg, onOk) {
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-ok');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.onclick = () => { closeM('mbg-confirm'); onOk(); };
  openM('mbg-confirm');
}

// Dupla confirmação — para ações irreversíveis
function showConfirm2(msg1, msg2, onOk) {
  showConfirm(msg1, () => showConfirm(msg2, onOk));
}

/* ═══════════════════════════════════════════════════════════
   HÁBITOS
═══════════════════════════════════════════════════════════ */
const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const HAB_CYCLE = ['feito', 'parcial', 'faltou', null];

// ── Helpers de cálculo de % com freqAlvo e diasAtivos ──────────
function calcPctHabito(h, days) {
  const diasValidos = getHabDiasAtivos(h, days);
  const freqAlvo = Math.min(h.freqAlvo || 7, diasValidos.length || 1);
  const regs = h.registros || {};
  const feito = diasValidos.filter(d => regs[d] === 'feito').length;
  return { feito, alvo: freqAlvo, pct: Math.min(100, Math.round(feito / freqAlvo * 100)), diasValidos };
}
function calcPctVicio(v, days) {
  const diasValidos = v.diasAtivos ? days.filter(d => v.diasAtivos.includes(new Date(d+'T12:00:00').getDay())) : days;
  const regs = v.registros || {};
  const resistiu = diasValidos.filter(d => regs[d] === 'resistiu').length;
  const alvo = diasValidos.length || 1;
  return { resistiu, alvo, pct: Math.round(resistiu / alvo * 100), diasValidos };
}

function cycleHabitoDay(id, date) {
  const h = S.habitos.find(x => x.id === id);
  if (!h) return;
  if (!h.registros) h.registros = {};
  const cur = h.registros[date] || null;
  const idx = HAB_CYCLE.indexOf(cur);
  const next = HAB_CYCLE[(idx === -1 ? 0 : idx + 1) % HAB_CYCLE.length];
  if (next === null) delete h.registros[date];
  else h.registros[date] = next;
  persist(); renderHabitos();
}

function removeHabito(id) {
  showConfirm2('Remover este hábito?', 'Confirma? O histórico de dados será preservado no dashboard.', () => {
    const h = S.habitos.find(x => x.id === id);
    if (h) {
      if (!S.habitosArquivados) S.habitosArquivados = [];
      S.habitosArquivados.push({ ...h, removidoEm: today() });
    }
    S.habitos = S.habitos.filter(x => x.id !== id);
    persist(); renderHabitos();
  });
}

function openEditHabito(id) {
  const h = S.habitos.find(x => x.id === id); if (!h) return;
  document.getElementById('edit-hab-id').value = id;
  document.getElementById('edit-hab-nome').value = h.nome || '';
  // Dias ativos
  setDiasToggle('edit-hab-dias', h.diasAtivos || null);
  initDiasToggle('edit-hab-dias');
  const updatePreview = () => {
    const dias = getDiasAtivos('edit-hab-dias');
    const n = dias ? dias.length : 7;
    const el = document.getElementById('edit-hab-freq-preview');
    if (el) el.textContent = `Meta: ${n}x/semana`;
  };
  document.querySelectorAll('#edit-hab-dias .dia-tog').forEach(el => {
    el.onclick = () => { el.classList.toggle('on'); updatePreview(); };
  });
  updatePreview();
  // Vínculos — accordion picker
  if (!h.vinculoIds) h.vinculoIds = h.vinculoId ? [h.vinculoId] : [];
  renderVinculosChips(h.vinculoIds, 'edit-hab-vinculos-chips', 'removeVinculo');
  buildVincularPicker('edit-hab-vp', (itemId) => {
    const h2 = S.habitos.find(x => x.id === document.getElementById('edit-hab-id').value);
    if (h2 && !h2.vinculoIds.includes(itemId)) {
      h2.vinculoIds.push(itemId);
      renderVinculosChips(h2.vinculoIds, 'edit-hab-vinculos-chips', 'removeVinculo');
    }
  });
  openM('mbg-edit-habito');
}

function renderEditVinculos(ids) {
  const container = document.getElementById('edit-hab-vinculos-list');
  if (!ids || ids.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--t3);font-family:Georgia,serif">Nenhum vínculo</div>';
    return;
  }
  container.innerHTML = ids.map(id => {
    const lbl = getPrediLabel(id);
    if (!lbl) return '';
    const tipoLabel = {frentes:'Ação',ciclos:'Trimestre',horizontes:'Metas de Longo Prazo',pilares:'Área de foco'}[lbl.tipo] || lbl.tipo;
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
      <span class="habito-vtag" style="font-size:11px;padding:3px 8px">${esc(tipoLabel)}: ${esc(lbl.nome.slice(0,30))}</span>
      <button onclick="removeVinculo('${id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0">×</button>
    </div>`;
  }).join('');
}

function removeVinculo(vinculoId) {
  const id = document.getElementById('edit-hab-id').value;
  const h = S.habitos.find(x => x.id === id); if (!h) return;
  h.vinculoIds = (h.vinculoIds||[]).filter(v => v !== vinculoId);
  renderVinculosChips(h.vinculoIds, 'edit-hab-vinculos-chips', 'removeVinculo');
}

function saveEditHabito() {
  const id   = document.getElementById('edit-hab-id').value;
  const nome = document.getElementById('edit-hab-nome').value.trim();
  if (!nome) return document.getElementById('edit-hab-nome').focus();
  const h = S.habitos.find(x => x.id === id); if (!h) return;
  h.nome = nome;
  const diasAtivos = getDiasAtivos('edit-hab-dias');
  h.diasAtivos = diasAtivos;
  h.freqAlvo = diasAtivos ? diasAtivos.length : 7;
  if (!h.vinculoIds) h.vinculoIds = h.vinculoId ? [h.vinculoId] : [];
  h.vinculoId = h.vinculoIds[0] || null;
  persist(); closeM('mbg-edit-habito'); renderHabitos();
}

/* ── Vincular accordion picker ──────────────────────────────── */
const _vpCallbacks = {};
let _addHabVinculos = [];

function buildVincularPicker(containerId, onSelectFn) {
  _vpCallbacks[containerId] = onSelectFn;
  const container = document.getElementById(containerId);
  if (!container) return;
  const tipos = [
    {key:'frentes',    label:'Ação'},
    {key:'ciclos',     label:'Trimestre'},
    {key:'horizontes', label:'Longo Prazo'},
    {key:'pilares',    label:'Área de foco'},
  ];
  let out = '';
  tipos.forEach(t => {
    const items = (S[t.key]||[]).filter(x => !x.status||x.status==='ativo');
    if (!items.length) return;
    const catId = `${containerId}__${t.key}`;
    out += `<div class="vp-cat" onclick="toggleVpCat('${catId}')">
      <span class="vp-arrow" id="vpa-${catId}">▸</span>
      <span class="vp-cat-label">${t.label}</span>
      <span class="badge">${items.length}</span>
    </div>
    <div class="vp-items" id="${catId}" style="display:none">
      ${items.map(it => `<div class="vp-item" onclick="selectVpItem('${containerId}','${it.id}','${t.key}')">${esc((it.nome||it.texto||'').slice(0,48))}</div>`).join('')}
    </div>`;
  });
  container.innerHTML = out || '<div style="padding:8px 11px;font-size:11px;color:var(--t3);font-family:Georgia,serif">Nenhum item disponível.</div>';
}

function toggleVpCat(catId) {
  const body = document.getElementById(catId);
  const arrow = document.getElementById('vpa-' + catId);
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '▸' : '▾';
}

function selectVpItem(containerId, itemId, tipo) {
  if (_vpCallbacks[containerId]) _vpCallbacks[containerId](itemId, tipo);
}

function renderVinculosChips(ids, chipsContainerId, removeFn) {
  const container = document.getElementById(chipsContainerId);
  if (!container) return;
  if (!ids || ids.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--t3);font-family:Georgia,serif">Nenhum vínculo ainda</span>';
    return;
  }
  const labels = {frentes:'Ação',ciclos:'Trimestre',horizontes:'L.Prazo',pilares:'Área'};
  container.innerHTML = ids.map(id => {
    const lbl = getPrediLabel(id);
    if (!lbl) return '';
    return `<span class="chip">${labels[lbl.tipo]||lbl.tipo}: ${esc((lbl.nome||'').slice(0,22))}<span class="chip-x" onclick="${removeFn}('${id}')">×</span></span>`;
  }).join('');
}

function populatePilarSelect(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const ativos = (S.pilares||[]).filter(x => !x.status||x.status==='ativo');
  sel.innerHTML = '<option value="">Sem vínculo</option>' +
    ativos.map(p => `<option value="${p.id}">${esc(p.texto||p.nome||'')}</option>`).join('');
}

function openM_addHabito() {
  _addHabVinculos = [];
  renderVinculosChips([], 'add-hab-vinculos-chips', 'removeAddHabVinculo');
  buildVincularPicker('add-hab-vp', (itemId, tipo) => {
    if (!_addHabVinculos.includes(itemId)) {
      _addHabVinculos.push(itemId);
      renderVinculosChips(_addHabVinculos, 'add-hab-vinculos-chips', 'removeAddHabVinculo');
    }
  });
  document.getElementById('inp-hab-nome').value = '';
  setDiasToggle('inp-hab-dias', null);
  initDiasToggle('inp-hab-dias');
  initDiasToggle('inp-vicio-dias');
  // Atualiza preview de frequência ao clicar nos dias
  const updatePreview = () => {
    const dias = getDiasAtivos('inp-hab-dias');
    const n = dias ? dias.length : 7;
    const el = document.getElementById('hab-freq-preview');
    if (el) el.textContent = `Meta: ${n}x/semana`;
  };
  document.querySelectorAll('#inp-hab-dias .dia-tog').forEach(el => {
    const orig = el.onclick;
    el.onclick = () => { el.classList.toggle('on'); updatePreview(); };
  });
  updatePreview();
  openM('mbg-add-habito');
}

/* ── Helpers para toggles de dias ─────────────────────────── */
function initDiasToggle(containerId) {
  document.querySelectorAll(`#${containerId} .dia-tog`).forEach(el => {
    el.onclick = () => el.classList.toggle('on');
  });
}
function getDiasAtivos(containerId) {
  const ativos = [];
  document.querySelectorAll(`#${containerId} .dia-tog.on`).forEach(el => {
    ativos.push(parseInt(el.dataset.dia));
  });
  // Se todos os 7 dias estão marcados, retorna null (= todos)
  return ativos.length === 7 ? null : ativos;
}
function setDiasToggle(containerId, diasAtivos) {
  document.querySelectorAll(`#${containerId} .dia-tog`).forEach(el => {
    const dia = parseInt(el.dataset.dia);
    el.classList.toggle('on', !diasAtivos || diasAtivos.includes(dia));
  });
}

function removeAddHabVinculo(id) {
  _addHabVinculos = _addHabVinculos.filter(x => x !== id);
  renderVinculosChips(_addHabVinculos, 'add-hab-vinculos-chips', 'removeAddHabVinculo');
}

function saveHabito() {
  const nome = document.getElementById('inp-hab-nome').value.trim();
  if (!nome) return document.getElementById('inp-hab-nome').focus();
  const diasAtivos = getDiasAtivos('inp-hab-dias');
  const freqAlvo = diasAtivos ? diasAtivos.length : 7;
  const vinculoId = _addHabVinculos[0] || null;
  S.habitos.push({ id: uid(), nome, vinculoId, vinculoIds: [..._addHabVinculos], registros: {}, freqAlvo, diasAtivos });
  persist(); closeM('mbg-add-habito'); renderHabitos(); _updateRotinaTabCounts(); renderRotinaStrip();
}

/* ═══════════════════════════════════════════════════════════
   CADERNO — INBOX
═══════════════════════════════════════════════════════════ */
function addInbox() {
  const el = document.getElementById('inp-inbox');
  const txt = el.value.trim(); if (!txt) return;
  S.inbox.push({ id: uid(), texto: txt, data: today(), status: 'pendente' });
  el.value = ''; persist(); renderCaderno();
}

function renderCaderno() {
  renderInbox();
  renderKanban();
}

let inboxExpanded = false;

function quickDiscard(id) {
  showConfirm2('Descartar este item?', 'Confirma? Ele irá para a Caixa de Descarte.', () => {
    const item = S.inbox.find(x => x.id === id); if (!item) return;
    item.status = 'descartado';
    S.descarte.push({ id: uid(), texto: item.texto, data: today() });
    persist(); renderInbox();
  });
}

/* ── Triagem ─────────────────────────────────────────────── */
let tID = null, tUrg = false, tImp = false;
let tDirectMode = false; // true = criação manual (sem inbox)

function openTriage(id) {
  tDirectMode = false;
  tID = id;
  const item = S.inbox.find(x => x.id === id);
  if (!item) return;
  document.getElementById('triage-tag').textContent = 'Triagem';
  document.getElementById('t-direct-input').style.display = 'none';
  document.getElementById('triage-txt').textContent = item.texto;
  document.getElementById('triage-txt').style.display = 'block';
  ['t-s1','t-s2','t-s3','t-s4'].forEach((s, i) => document.getElementById(s).style.display = i === 0 ? 'block' : 'none');
  const q0 = document.getElementById('t-s2-q0');
  const q1 = document.getElementById('t-s2-q1');
  const q2 = document.getElementById('t-s2-q2');
  if (q0) q0.style.display = 'block';
  if (q1) q1.style.display = 'none';
  if (q2) q2.style.display = 'none';
  openM('mbg-triage');
}

function openDirectTask() {
  tDirectMode = true;
  tID = null;
  document.getElementById('triage-tag').textContent = 'Nova Tarefa';
  document.getElementById('t-direct-input').style.display = 'block';
  document.getElementById('triage-txt').style.display = 'none';
  document.getElementById('inp-direct-task').value = '';
  // Vai direto para o wizard — pula t-s1
  ['t-s1','t-s2','t-s3','t-s4'].forEach(s => document.getElementById(s).style.display = 'none');
  document.getElementById('t-s2').style.display = 'block';
  const q0d = document.getElementById('t-s2-q0');
  if (q0d) q0d.style.display = 'block';
  document.getElementById('t-s2-q1').style.display = 'none';
  document.getElementById('t-s2-q2').style.display = 'none';
  // Oculta o "← Voltar" da Q0 no modo direto (não há t-s1 para voltar)
  const backBtn = document.getElementById('t-back-btn');
  if (backBtn) backBtn.style.display = 'none';
  openM('mbg-triage');
  setTimeout(() => document.getElementById('inp-direct-task').focus(), 100);
}

function tAct(action) {
  document.getElementById('t-s1').style.display = 'none';
  if (action === 'discard') {
    const item = S.inbox.find(x => x.id === tID);
    if (item) { item.status = 'descartado'; S.descarte.push({ id: uid(), texto: item.texto, data: today() }); }
    persist(); closeM('mbg-triage'); renderCaderno(); return;
  }
  if (action === 'idea') {
    // Popula tags disponíveis no step 4
    renderTriageTags();
    document.getElementById('t-s4').style.display = 'block';
    return;
  }
  if (action === 'task') { document.getElementById('t-s2').style.display = 'block'; const q0e = document.getElementById('t-s2-q0'); if(q0e) q0e.style.display='block'; document.getElementById('t-s2-q1').style.display='none'; document.getElementById('t-s2-q2').style.display='none'; }
  else {
    // Pré-preenche nome com texto da inbox
    const item = S.inbox.find(x => x.id === tID);
    document.getElementById('inp-triage-proj').value = item ? item.texto : '';
    document.getElementById('inp-triage-prazo').value = '';
    document.getElementById('t-s3').style.display = 'block';
  }
}

function tBack() {
  if (tDirectMode) {
    // No modo direto, "voltar" fecha o modal
    closeM('mbg-triage'); return;
  }
  document.getElementById('t-s1').style.display = 'block';
  document.getElementById('t-s2').style.display = 'none';
  document.getElementById('t-s3').style.display = 'none';
  document.getElementById('t-s4').style.display = 'none';
  const q0b = document.getElementById('t-s2-q0');
  const q1b = document.getElementById('t-s2-q1');
  const q2b = document.getElementById('t-s2-q2');
  if (q0b) q0b.style.display = 'block';
  if (q1b) q1b.style.display = 'none';
  if (q2b) q2b.style.display = 'none';
}


function tWizardQ0Yes() {
  document.getElementById('t-s2-q0').style.display = 'none';
  document.getElementById('t-s2-q1').style.display = 'block';
}
function tWizardQ0No() {
  if (tDirectMode) { closeM('mbg-triage'); return; }
  const item = S.inbox.find(x => x.id === tID);
  if (item) { item.status = 'descartado'; S.descarte.push({ id: uid(), texto: item.texto, data: today() }); }
  persist(); closeM('mbg-triage'); renderCaderno();
  showToast('Item descartado');
}
function tWizardBackQ1() {
  document.getElementById('t-s2-q1').style.display = 'none';
  document.getElementById('t-s2-q0').style.display = 'block';
}

function tWizardQ2() {
  document.getElementById('t-s2-q1').style.display = 'none';
  document.getElementById('t-s2-q2').style.display = 'block';
}
function tWizardBack() {
  document.getElementById('t-s2-q2').style.display = 'none';
  document.getElementById('t-s2-q1').style.display = 'block';
}
function tWizard(destino) {
  // No modo direto, valida que há texto digitado
  if (tDirectMode) {
    const txt = document.getElementById('inp-direct-task').value.trim();
    if (!txt) {
      document.getElementById('inp-direct-task').focus();
      document.getElementById('inp-direct-task').style.borderColor = 'var(--red)';
      setTimeout(() => document.getElementById('inp-direct-task').style.borderColor = '', 1500);
      return;
    }
    let urgente = false, importante = false, tag = null;
    if (destino === 'agendar')     { importante = true;  tag = 'agendar'; }
    if (destino === 'pedir-ajuda') { urgente = true;     tag = 'pedir-ajuda'; }
    if (destino === 'afazer')      { urgente = true; importante = true; }
    const ordem = S.tarefas.filter(t => t.coluna === 'afazer').length;
    S.tarefas.push({ id: uid(), texto: txt, urgente, importante, coluna: 'afazer', tag, criadoEm: today(), ordem });
    persist(); closeM('mbg-triage'); renderKanban();
    showToast('✓ Tarefa criada!');
    return;
  }
  // Modo triagem normal
  const item = S.inbox.find(x => x.id === tID);
  if (!item) return;
  item.status = 'triado';
  let urgente = false, importante = false, coluna = 'afazer', tag = null;
  if (destino === 'agendar')     { importante = true;  tag = 'agendar'; }
  if (destino === 'pedir-ajuda') { urgente = true;     tag = 'pedir-ajuda'; }
  if (destino === 'afazer')      { urgente = true; importante = true; }
  const ordem = S.tarefas.filter(t => t.coluna === 'afazer').length;
  S.tarefas.push({ id: uid(), texto: item.texto, urgente, importante, coluna, tag, criadoEm: today(), ordem });
  persist(); closeM('mbg-triage'); renderCaderno();
  showToast('✓ Tarefa criada!');
}

function tConfirmProj() {
  const nome = document.getElementById('inp-triage-proj').value.trim();
  if (!nome) return document.getElementById('inp-triage-proj').focus();
  const prazo = document.getElementById('inp-triage-prazo').value;
  if (!prazo) {
    document.getElementById('inp-triage-prazo').focus();
    document.getElementById('inp-triage-prazo').style.borderColor = 'var(--red)';
    setTimeout(() => document.getElementById('inp-triage-prazo').style.borderColor = '', 1500);
    return;
  }
  const item = S.inbox.find(x => x.id === tID);
  if (item) item.status = 'triado';
  const ordem = S.frentes.filter(t => !t.status || t.status === 'ativo').length;
  S.frentes.push({
    id: uid(), nome, prazo, descricao: '', status: 'ativo',
    rodada: 1, criadoEm: today(), ordem
  });
  persist(); closeM('mbg-triage'); renderCaderno(); renderPredio();
  showToast('✓ Ação criada!');
}

/* ═══════════════════════════════════════════════════════════
   CAIXA DE IDEIAS
═══════════════════════════════════════════════════════════ */
let tIdeaTags = []; // tags selecionadas na triagem

function renderTriageTags() {
  const container = document.getElementById('t-s4-tags');
  tIdeaTags = [];
  if (!S.tagIdeias || S.tagIdeias.length === 0) {
    container.innerHTML = '<span style="font-size:11px;color:var(--t3);font-family:Georgia,serif">Nenhuma tag criada ainda. Crie tags em Caderno → 🏷 Tags.</span>';
    return;
  }
  container.innerHTML = S.tagIdeias.map(t =>
    `<span class="ideia-tag" id="ttag-${t.id}" onclick="toggleTriageTag('${t.id}','${esc(t.nome)}')">${esc(t.nome)}</span>`
  ).join('');
}

function toggleTriageTag(id, nome) {
  const el = document.getElementById('ttag-' + id);
  const idx = tIdeaTags.findIndex(t => t.id === id);
  if (idx === -1) {
    tIdeaTags.push({ id, nome });
    el.classList.add('ativa');
  } else {
    tIdeaTags.splice(idx, 1);
    el.classList.remove('ativa');
  }
}

function tConfirmIdea() {
  const item = S.inbox.find(x => x.id === tID);
  if (item) item.status = 'triado';
  if (!S.ideias) S.ideias = [];
  S.ideias.push({
    id: uid(),
    texto: item ? item.texto : '',
    tags: [...tIdeaTags],
    criadoEm: today()
  });
  persist(); closeM('mbg-triage'); renderCaderno();
}

// 2.3 — Accordion da Caixa de Ideias
function toggleIdeiasAccordion() {
  const hdr  = document.getElementById('ideias-accordion-hdr');
  const body = document.getElementById('ideias-accordion-body');
  if (!hdr || !body) return;
  const isOpen = body.classList.contains('open');
  hdr.classList.toggle('open', !isOpen);
  body.classList.toggle('open', !isOpen);
  if (!isOpen) renderIdeias(); // renderiza só ao abrir
}

function renderIdeias() {
  if (!S.ideias) S.ideias = [];
  const cnt = document.getElementById('ideias-cnt');
  if (cnt) cnt.textContent = S.ideias.length;
  const list = document.getElementById('list-ideias');
  if (!list) return;

  if (S.ideias.length === 0) {
    list.innerHTML = '<div class="empty" style="padding:12px 0">Nenhuma ideia ainda.<br>Trie um item da Caixa de Entrada como 💡 Ideia.</div>';
    return;
  }

  // Agrupar por tag
  const grupos = {}; // tagId → {nome, ideias[]}
  S.ideias.forEach(ideia => {
    if (!ideia.tags || ideia.tags.length === 0) {
      if (!grupos['__avulsas']) grupos['__avulsas'] = { nome: '# Avulsas', ideias: [] };
      grupos['__avulsas'].ideias.push(ideia);
    } else {
      ideia.tags.forEach(tag => {
        if (!grupos[tag.id]) grupos[tag.id] = { nome: '# ' + tag.nome, ideias: [] };
        if (!grupos[tag.id].ideias.find(x => x.id === ideia.id)) grupos[tag.id].ideias.push(ideia);
      });
    }
  });

  function cardHtml(ideia) {
    return `<div class="ideia-card">
      <div class="ideia-card-top">
        <div class="ideia-txt">${esc(ideia.texto)}</div>
        <button class="xbtn" onclick="removeIdeia('${ideia.id}')" title="Remover">×</button>
      </div>
      <div class="ideia-actions">
        <button class="btn btn-g btn-sm" onclick="ideiaParaKanban('${ideia.id}')">→ Kanban</button>
      </div>
      <div class="ideia-meta">${fmtDate(ideia.criadoEm)}</div>
    </div>`;
  }

  let html = '';
  // Tags nomeadas primeiro, avulsas por último
  const ordemGrupos = Object.keys(grupos).filter(k => k !== '__avulsas');
  if (grupos['__avulsas']) ordemGrupos.push('__avulsas');
  ordemGrupos.forEach(gKey => {
    const g = grupos[gKey];
    html += `<div class="ideias-group-hdr">${esc(g.nome)} <span style="color:var(--t3);font-size:9px">(${g.ideias.length})</span></div>`;
    html += g.ideias.map(cardHtml).join('');
  });
  list.innerHTML = html;
}

function removeIdeia(id) {
  showConfirm('Remover esta ideia?', () => {
    S.ideias = (S.ideias || []).filter(x => x.id !== id);
    persist(); renderIdeias();
  });
}

function ideiaParaKanban(id) {
  const ideia = (S.ideias || []).find(x => x.id === id);
  if (!ideia) return;
  S.tarefas.push({
    id: uid(), texto: ideia.texto,
    urgente: false, importante: false,
    coluna: 'afazer', criadoEm: today()
  });
  S.ideias = (S.ideias || []).filter(x => x.id !== id);
  persist(); renderIdeias(); renderKanban();
  showToast('💡 Ideia enviada para o Kanban');
}

/* ── Tags de Ideias ──────────────────────────────────────── */
function openGerenciarTags() {
  if (!S.tagIdeias) S.tagIdeias = [];
  document.getElementById('inp-nova-tag').value = '';
  renderListTags();
  openM('mbg-tags');
}

function renderListTags() {
  const list = document.getElementById('list-tags');
  if (!S.tagIdeias || S.tagIdeias.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--t3);font-family:Georgia,serif;padding:8px 0">Nenhuma tag criada ainda.</div>';
    return;
  }
  list.innerHTML = S.tagIdeias.map(t =>
    `<div class="tag-list-item">
      <span class="ideia-tag ativa">${esc(t.nome)}</span>
      <span style="flex:1"></span>
      <button class="tag-del-btn" onclick="removeTag('${t.id}')" title="Remover tag">×</button>
    </div>`
  ).join('');
}

function addTag() {
  const inp = document.getElementById('inp-nova-tag');
  const nome = inp.value.trim();
  if (!nome) return inp.focus();
  if (!S.tagIdeias) S.tagIdeias = [];
  if (S.tagIdeias.some(t => t.nome.toLowerCase() === nome.toLowerCase())) {
    inp.value = '';
    return;
  }
  S.tagIdeias.push({ id: uid(), nome });
  inp.value = '';
  persist(); renderListTags();
}

function removeTag(id) {
  S.tagIdeias = (S.tagIdeias || []).filter(t => t.id !== id);
  (S.ideias || []).forEach(ideia => {
    ideia.tags = (ideia.tags || []).filter(t => t.id !== id);
  });
  persist(); renderListTags(); renderIdeias();
}

/* ── Kanban ──────────────────────────────────────────────── */
const COLUNAS = ['afazer', 'fazendo', 'feito'];
const COL_LABELS = { afazer: 'A Fazer', fazendo: 'Fazendo', feito: 'Feito' };
const PRI_LABELS = { '11': 'Fazer agora', '10': 'Planejar', '01': 'Pedir Ajuda', '00': '' };
const TAG_LABELS = { 'agendar': '📅 Planejar', 'pedir-ajuda': '🤝 Pedir Ajuda' };

let dragTaskId = null;
let dragOverCol = null;

// ── Kanban: calcula posição de inserção dentro da coluna ──────
function getDropIndex(colEl, clientY) {
  const cards = [...colEl.querySelectorAll('.k-card:not(.dragging)')];
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return cards.length;
}

// Mostra/atualiza indicador visual de inserção
function updateDropIndicator(colEl, clientY) {
  colEl.querySelectorAll('.k-drop-indicator').forEach(el => el.remove());
  const cards = [...colEl.querySelectorAll('.k-card:not(.dragging)')];
  const idx = getDropIndex(colEl, clientY);
  const indicator = document.createElement('div');
  indicator.className = 'k-drop-indicator';
  if (idx >= cards.length) {
    colEl.appendChild(indicator);
  } else {
    colEl.insertBefore(indicator, cards[idx]);
  }
}

let _touchDragId=null,_touchDragEl=null,_touchGhost=null,_touchLongTimer=null;

function initKanbanDrop() {
  document.querySelectorAll('.k-col[data-col]').forEach(colEl => {
    const contentEl = colEl.querySelector('[id^="col-"]');
    colEl.addEventListener('dragover', e => {
      e.preventDefault(); colEl.classList.add('drag-over');
      if (contentEl) updateDropIndicator(contentEl, e.clientY);
    });
    colEl.addEventListener('dragleave', e => {
      if (!colEl.contains(e.relatedTarget)) {
        colEl.classList.remove('drag-over');
        if (contentEl) contentEl.querySelectorAll('.k-drop-indicator').forEach(el=>el.remove());
      }
    });
    colEl.addEventListener('drop', e => {
      e.preventDefault(); colEl.classList.remove('drag-over');
      if (!contentEl) return;
      const dropIdx = getDropIndex(contentEl, e.clientY);
      contentEl.querySelectorAll('.k-drop-indicator').forEach(el=>el.remove());
      if (dragTaskId) moveTaskTo(dragTaskId, colEl.dataset.col, dropIdx);
    });
  });
  // Touch: long-press on handle activates drag
  document.addEventListener('touchstart', e => {
    const handle = e.target.closest('.k-drag-handle');
    if (!handle) return;
    const card = handle.closest('.k-card'); if (!card) return;
    _touchLongTimer = setTimeout(() => {
      _touchDragId = card.dataset.id; _touchDragEl = card;
      card.classList.add('touch-dragging');
      _touchGhost = card.cloneNode(true);
      Object.assign(_touchGhost.style, {
        position:'fixed',zIndex:'999',opacity:'.88',pointerEvents:'none',
        width:card.offsetWidth+'px',transform:'rotate(2deg) scale(1.03)',
        boxShadow:'0 10px 30px rgba(0,0,0,.5)',borderRadius:'8px'
      });
      document.body.appendChild(_touchGhost);
      const t=e.touches[0];
      _touchGhost.style.left=(t.clientX-card.offsetWidth/2)+'px';
      _touchGhost.style.top=(t.clientY-36)+'px';
      if(navigator.vibrate) navigator.vibrate(40);
    }, 320);
  }, {passive:false});

  document.addEventListener('touchmove', e => {
    clearTimeout(_touchLongTimer);
    if (!_touchDragId) return;
    e.preventDefault();
    const t=e.touches[0];
    if(_touchGhost){
      _touchGhost.style.left=(t.clientX-(_touchDragEl?_touchDragEl.offsetWidth/2:60))+'px';
      _touchGhost.style.top=(t.clientY-36)+'px';
    }
    document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('drag-over'));
    const over=document.elementFromPoint(t.clientX,t.clientY);
    const col=over&&over.closest('.k-col[data-col]');
    if(col) col.classList.add('drag-over');
  }, {passive:false});

  document.addEventListener('touchend', e => {
    clearTimeout(_touchLongTimer);
    if(!_touchDragId){ return; }
    const t=e.changedTouches[0];
    if(_touchGhost){_touchGhost.remove();_touchGhost=null;}
    if(_touchDragEl){_touchDragEl.classList.remove('touch-dragging');_touchDragEl=null;}
    document.querySelectorAll('.k-col').forEach(c=>c.classList.remove('drag-over'));
    const over=document.elementFromPoint(t.clientX,t.clientY);
    const col=over&&over.closest('.k-col[data-col]');
    if(col&&col.dataset.col){
      const contentEl=col.querySelector('[id^="col-"]');
      const dropIdx=contentEl?getDropIndex(contentEl,t.clientY):0;
      moveTaskTo(_touchDragId,col.dataset.col,dropIdx);
      if(navigator.vibrate) navigator.vibrate(20);
    }
    _touchDragId=null;
  }, {passive:false});
}

function onCardDragStart(e, id) {
  dragTaskId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => {
    const el = document.querySelector(`.k-card[data-id="${id}"]`);
    if (el) el.classList.add('dragging');
  }, 0);
}
function onCardDragEnd() {
  dragTaskId = null;
  document.querySelectorAll('.k-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.k-col.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.k-drop-indicator').forEach(el => el.remove());
}

function moveTaskTo(id, coluna, insertIdx) {
  const task = S.tarefas.find(x => x.id === id); if (!task) return;
  const wasCol = task.coluna;
  task.coluna = coluna;
  if (coluna === 'feito' && wasCol !== 'feito') task.concluidoEm = today();
  // Reordena: remove da posição atual, insere no índice alvo
  const colTasks = S.tarefas.filter(t => t.id !== id && t.coluna === coluna)
    .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
  colTasks.splice(insertIdx, 0, task);
  colTasks.forEach((t, i) => { t.ordem = i; });
  persist(); renderKanban();
}

function moveTask(id, coluna) {
  // Fallback sem posição — insere no final
  const colTasks = S.tarefas.filter(t => t.coluna === coluna && t.id !== id);
  moveTaskTo(id, coluna, colTasks.length);
}

function removeTask(id) {
  showConfirm('Remover esta tarefa?', () => {
    S.tarefas = S.tarefas.filter(x => x.id !== id);
    persist(); renderKanban();
  });
}

/* toggles for add-task modal */
let taskTogUrg = false, taskTogImp = false; // mantido para retrocompatibilidade com tarefas existentes

function saveTaskDirect() {
  const txt = document.getElementById('inp-task-txt').value.trim();
  if (!txt) return document.getElementById('inp-task-txt').focus();
  const col = document.getElementById('inp-task-col').value;
  const ordem = S.tarefas.filter(t => t.coluna === col).length;
  S.tarefas.push({ id: uid(), texto: txt, urgente: false, importante: false, coluna: col, criadoEm: today(), ordem });
  document.getElementById('inp-task-txt').value = '';
  document.getElementById('inp-task-col').value = 'afazer';
  persist(); closeM('mbg-add-task'); renderKanban();
}

/* ═══════════════════════════════════════════════════════════