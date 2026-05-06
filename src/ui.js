/* ── PORÃO ──────────────────────────────────────────────────── */
const VICIO_CYCLE = ['resistiu', 'cedi', null];

function renderPorao() {
  renderVicios();
  renderDescarte();
}

function markVicioResistiu(id) {
  const v = S.vicios.find(x => x.id === id); if (!v) return;
  if (!v.registros) v.registros = {};
  const t = today();
  if (v.registros[t] === 'resistiu') delete v.registros[t];
  else v.registros[t] = 'resistiu';
  persist(); renderVicios();
}

function markVicioCedi(id) {
  const v = S.vicios.find(x => x.id === id); if (!v) return;
  if (!v.registros) v.registros = {};
  const t = today();
  if (v.registros[t] === 'cedi') delete v.registros[t];
  else v.registros[t] = 'cedi';
  persist(); renderVicios();
}

function cycleVicioDay(id, date) {
  const v = S.vicios.find(x => x.id === id); if (!v) return;
  if (!v.registros) v.registros = {};
  const cur  = v.registros[date] || null;
  const idx  = VICIO_CYCLE.indexOf(cur);
  const next = VICIO_CYCLE[(idx === -1 ? 0 : idx + 1) % VICIO_CYCLE.length];
  if (next === null) delete v.registros[date];
  else v.registros[date] = next;
  persist(); renderVicios();
}

function removeVicio(id) {
  showConfirm2('Remover este rastreador?', 'Confirma? Todo o histórico de dados será apagado permanentemente.', () => {
    S.vicios = S.vicios.filter(x => x.id !== id);
    persist(); renderVicios();
  });
}

function saveVicio() {
  const nome = document.getElementById('inp-vicio-nome').value.trim();
  if (!nome) return document.getElementById('inp-vicio-nome').focus();
  const diasAtivos = getDiasAtivos('inp-vicio-dias');
  S.vicios.push({ id: uid(), nome, registros: {}, diasAtivos });
  persist(); closeM('mbg-add-vicio'); renderPorao();
}

function renderDescarte() {
  document.getElementById('disc-cnt').textContent = S.descarte.length;
  const list = document.getElementById('list-descarte');
  list.innerHTML = S.descarte.length === 0
    ? '<div class="empty">Nenhum item descartado ainda.</div>'
    : S.descarte.slice().reverse().map(d => `
      <div class="disc-item">
        <span style="flex:1">${esc(d.texto)}</span>
        <span class="disc-date">${fmtDate(d.data)}</span>
        <button class="restore-btn" onclick="restoreDescarte('${d.id}')">↩ restaurar</button>
      </div>`).join('');
}

function restoreDescarte(id) {
  const item = S.descarte.find(x => x.id === id); if (!item) return;
  S.inbox.push({ id: uid(), texto: item.texto, data: today(), status: 'pendente' });
  S.descarte = S.descarte.filter(x => x.id !== id);
  persist(); renderPorao();
}

/* ═══════════════════════════════════════════════════════════
   PROPÓSITO MAIOR — save manual + histórico de versões
═══════════════════════════════════════════════════════════ */
function saveMissao() {
  const nova = document.getElementById('inp-missao').value.trim();
  if (!nova) return;
  if (!S.fundacao.historico) S.fundacao.historico = [];
  const anterior = S.fundacao.missao || '';
  // Só arquiva se houver texto diferente do atual
  if (anterior && anterior !== nova) {
    S.fundacao.historico.push({ texto: anterior, arquivadoEm: today() });
  }
  S.fundacao.missao = nova;
  persist();
  // Feedback visual no botão
  const lbl = document.getElementById('missao-saved-lbl');
  if (lbl) { lbl.classList.add('show'); setTimeout(() => lbl.classList.remove('show'), 2500); }
}

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÕES — seções colapsáveis
═══════════════════════════════════════════════════════════ */
function toggleCfgSection(id) {
  const sections = document.querySelectorAll('.cfg-section');
  sections.forEach(s => {
    const body = s.querySelector('.cfg-section-body');
    const caret = s.querySelector('.cfg-section-caret');
    const isThis = s.id === 'cfg-' + id || s.querySelector('#cfg-' + id);
    if (body && caret) {
      if (isThis) {
        s.classList.toggle('open');
      }
    }
  });
}

function openSettingsModal() {
  document.getElementById('inp-script-url').value = S.settings.scriptUrl || '';
  setSyncStatus(navigator.onLine ? (S.meta.ultimaSync ? 'ok' : '') : 'err', '');
  // Fecha todas as seções ao abrir — usuário abre a que precisar
  document.querySelectorAll('.cfg-section').forEach(s => s.classList.remove('open'));
  // Renderiza lista de manutenção
  renderMaintenance();
  openM('mbg-settings');
}

function saveSettings() {
  const url = document.getElementById('inp-script-url').value.trim();
  S.settings.scriptUrl = url;
  persist();
  setSyncStatus(url ? 'ok' : '', '');
  if (url && navigator.onLine) {
    setTimeout(doSync, 500);
    schedulePull();
  }
}

/* ═══════════════════════════════════════════════════════════
   HISTÓRICO — abas Metas / Arquivados / Contratos
═══════════════════════════════════════════════════════════ */
let histTabAtiva = 'metas';

function switchHistTab(tab) {
  histTabAtiva = tab;
  ['metas','arquivados','contratos'].forEach(t => {
    const el = document.getElementById('hist-tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  renderHistory();
}

function buildHeatmap(habitos) {
  const hoje = new Date();
  return Array.from({length:365},(_,i)=>{
    const d=new Date(hoje); d.setDate(hoje.getDate()-364+i);
    const ds=d.toLocaleDateString('sv');
    const tot=Math.max(1,habitos.filter(h=>!h.arquivado).length);
    const f=habitos.filter(h=>(h.registros||{})[ds]==='feito').length;
    const lvl=f===0?0:f/tot<.25?1:f/tot<.5?2:f/tot<.75?3:4;
    return `<div class="heatmap-cell l${lvl}" title="${ds}: ${f}/${tot}"></div>`;
  }).join('');
}

function renderHistory() {
  const list = document.getElementById('hist-list');

  if (histTabAtiva === 'metas') {
    if (!S.historico || S.historico.length === 0) {
      list.innerHTML = '<div class="empty">Nenhuma meta encerrada ainda.</div>';
      return;
    }
    const tipoNomes = {frentes:'Ação',ciclos:'Trimestre',horizontes:'Metas de Longo Prazo',pilares:'Área de foco'};
    list.innerHTML = S.historico.slice().reverse().map(h => {
      const tipoLabel = tipoNomes[h.tipo] || h.tipo;
      const atrasoBadge = h.atrasoDias > 0
        ? `<span style="font-size:9px;color:var(--red);background:var(--rd);border:1px solid rgba(200,75,75,.3);border-radius:3px;padding:1px 6px;font-family:Georgia,serif;margin-left:4px">+${h.atrasoDias}d atraso</span>`
        : '';
      return `<div class="hist-item">
        <div class="hist-nome">${esc(h.nome)}${atrasoBadge}<div style="font-size:10px;color:var(--t3)">${tipoLabel} · ${fmtDate(h.encerradoEm)}</div></div>
        ${h.rodada > 1 ? `<span class="hist-rodada">${h.rodada}ª rodada</span>` : ''}
        <span class="hist-badge ${h.statusFinal}">${h.statusFinal}</span>
      </div>`;
    }).join('');

  } else if (histTabAtiva === 'arquivados') {
    const pilArq = S.pilares_arquivados || [];
    const propHist = (S.fundacao || {}).historico || [];
    if (pilArq.length === 0 && propHist.length === 0) {
      list.innerHTML = '<div class="empty">Nenhum item arquivado ainda.</div>';
      return;
    }
    const itens = [
      ...pilArq.map(p => ({ tipo: 'area', nome: p.texto || p.nome || '', data: p.arquivadoEm, id: p.id })),
      ...propHist.map((p, i) => ({ tipo: 'proposito', nome: p.texto, data: p.arquivadoEm, id: 'ph-' + i }))
    ].sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    list.innerHTML = itens.map(it => {
      const tipoTag = it.tipo === 'area'
        ? `<span style="font-size:9px;color:var(--acc);background:var(--acc-d);border:1px solid var(--acc-g);border-radius:3px;padding:1px 6px;font-family:Georgia,serif">Área de foco</span>`
        : `<span style="font-size:9px;color:var(--blue);background:var(--bd);border:1px solid rgba(74,127,193,.3);border-radius:3px;padding:1px 6px;font-family:Georgia,serif">Propósito</span>`;
      return `<div class="hist-item" style="flex-direction:column;align-items:flex-start;gap:5px">
        <div style="display:flex;align-items:center;gap:7px;width:100%">
          ${tipoTag}
          <span style="font-size:10px;color:var(--t3);margin-left:auto">${fmtDate(it.data)}</span>
        </div>
        <div style="font-size:13px;color:var(--t2);line-height:1.5">${esc(it.nome)}</div>
      </div>`;
    }).join('');

  } else if (histTabAtiva === 'contratos') {
    const honrados = (S.contratos || []).filter(c => c.resgatado);
    if (honrados.length === 0) {
      list.innerHTML = '<div class="empty">Nenhum contrato honrado ainda.<br>Resgate suas recompensas para vê-las aqui. 🏆</div>';
      return;
    }
    list.innerHTML = honrados.slice().reverse().map(c => `
      <div class="hist-item">
        <div class="hist-nome">🏆 ${esc(c.recompensa)}<div style="font-size:10px;color:var(--t3)">${c.tipoAlvo === 'meta' ? 'Meta' : c.tipoAlvo === 'habito' ? 'Hábito' : 'Vício'} · ${fmtDate(c.resgatadoEm)}</div></div>
        <button class="btn btn-g btn-sm" onclick="renovarContrato('${c.id}')" title="Criar nova rodada">🔄</button>
      </div>`).join('');
  }
}

document.getElementById('mbg-history').addEventListener('click', e => {
  if (e.target.closest('.modal')) return;
});
document.querySelector('[onclick="openM(\'mbg-history\')"]').addEventListener('click', () => {
  histTabAtiva = 'metas';
  ['metas','arquivados','contratos'].forEach(t => {
    const el = document.getElementById('hist-tab-' + t);
    if (el) el.classList.toggle('active', t === 'metas');
  });
  renderHistory();
});
function exportJSON() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'canteiro-' + today() + '.json';
  a.click();
}

function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d.habitos && d.inbox && d.tarefas) {
        const localSettings = S.settings;
        S = { ...d, settings: localSettings };
        localStorage.setItem(KEY, JSON.stringify(S));
        location.reload();
      } else alert('Arquivo inválido.');
    } catch { alert('Erro ao importar.'); }
  };
  r.readAsText(file);
  e.target.value = '';
}

/* ═══════════════════════════════════════════════════════════
   RENDER ALL
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   CONTRATOS
═══════════════════════════════════════════════════════════ */
let contratoTipoSel = 'meta';

function selectTipoContrato(tipo) {
  contratoTipoSel = tipo;
  ['meta','habito','vicio'].forEach(t => {
    document.getElementById('tipo-opt-' + t).classList.toggle('sel', t === tipo);
  });
  popularAlvosContrato(tipo);
  atualizarDescContrato();
}

function popularAlvosContrato(tipo) {
  const sel = document.getElementById('inp-contrato-alvo');
  sel.innerHTML = '';
  let itens = [];
  if (tipo === 'meta') {
    ['frentes','ciclos','horizontes'].forEach(t => {
      const nomes = {frentes:'Ação',ciclos:'Trimestre',horizontes:'Metas de Longo Prazo'};
      S[t].filter(x => !x.status || x.status === 'ativo').forEach(item => {
        itens.push({ id: item.id, label: `[${nomes[t]}] ${(item.nome||item.texto||'').slice(0,40)}` });
      });
    });
  } else if (tipo === 'habito') {
    itens = S.habitos.map(h => ({ id: h.id, label: h.nome }));
  } else {
    itens = S.vicios.map(v => ({ id: v.id, label: v.nome }));
  }
  if (itens.length === 0) {
    sel.innerHTML = '<option value="">Nenhum item disponível</option>';
  } else {
    sel.innerHTML = itens.map(i => `<option value="${i.id}">${esc(i.label)}</option>`).join('');
  }
  sel.onchange = atualizarDescContrato;
  atualizarDescContrato();
}

function atualizarDescContrato() {
  const desc = document.getElementById('contrato-alvo-desc');
  if (contratoTipoSel === 'meta') {
    desc.textContent = 'O contrato desbloqueia quando esta meta for concluída.';
  } else if (contratoTipoSel === 'habito') {
    const sel = document.getElementById('inp-contrato-alvo');
    const h = S.habitos.find(x => x.id === sel.value);
    const alvo = h?.freqAlvo || 7;
    desc.textContent = `O contrato desbloqueia quando o hábito atingir 100% da meta (${alvo}x/semana) na semana atual.`;
  } else {
    desc.textContent = 'O contrato desbloqueia quando o vício atingir 100% de resistência nos dias configurados.';
  }
}

function openAddContrato() {
  contratoTipoSel = 'meta';
  document.getElementById('inp-contrato-recompensa').value = '';
  ['meta','habito','vicio'].forEach(t => {
    document.getElementById('tipo-opt-' + t).classList.toggle('sel', t === 'meta');
  });
  popularAlvosContrato('meta');
  openM('mbg-add-contrato');
}

function saveContrato() {
  const recompensa = document.getElementById('inp-contrato-recompensa').value.trim();
  if (!recompensa) return document.getElementById('inp-contrato-recompensa').focus();
  const alvoId = document.getElementById('inp-contrato-alvo').value;
  if (!alvoId) return showToast('Selecione um alvo para o contrato.');
  // Nome do alvo para exibir no card
  let alvoNome = '';
  if (contratoTipoSel === 'meta') {
    for (const t of ['frentes','ciclos','horizontes']) {
      const it = S[t].find(x => x.id === alvoId);
      if (it) { alvoNome = it.nome || it.texto || ''; break; }
    }
  } else if (contratoTipoSel === 'habito') {
    alvoNome = (S.habitos.find(x => x.id === alvoId) || {}).nome || '';
  } else {
    alvoNome = (S.vicios.find(x => x.id === alvoId) || {}).nome || '';
  }
  if (!S.contratos) S.contratos = [];
  S.contratos.push({
    id: uid(), recompensa, tipoAlvo: contratoTipoSel,
    alvoId, alvoNome, desbloqueado: false, resgatado: false, criadoEm: today()
  });
  persist(); closeM('mbg-add-contrato'); renderContratos();
}

// Verifica se um contrato está desbloqueado (chamado a cada render)
function checkContratoDesbloqueado(c) {
  if (c.desbloqueado || c.resgatado) return c.desbloqueado;
  const week = getWeekDays();

  if (c.tipoAlvo === 'meta') {
    // Desbloqueado quando a meta está no histórico como concluída
    return (S.historico || []).some(h => h.id === c.alvoId || h.nome === c.alvoNome && h.statusFinal === 'concluido');
  }
  if (c.tipoAlvo === 'habito') {
    const h = S.habitos.find(x => x.id === c.alvoId);
    if (!h) return false;
    const { pct } = calcPctHabito(h, week);
    return pct >= 100;
  }
  if (c.tipoAlvo === 'vicio') {
    const v = S.vicios.find(x => x.id === c.alvoId);
    if (!v) return false;
    const { pct } = calcPctVicio(v, week);
    return pct >= 100;
  }
  return false;
}

function renderContratos() {
  if (!S.contratos) S.contratos = [];
  const tutorial = document.getElementById('fl-contratos-tutorial');
  const ativos = S.contratos.filter(c => !c.resgatado);
  if (tutorial) tutorial.style.display = ativos.length === 0 ? 'block' : 'none';

  const list = document.getElementById('list-contratos');
  if (!list) return;
  if (ativos.length === 0) {
    list.innerHTML = '<div class="empty" style="padding:10px 0">Nenhum contrato ativo.<br>Crie um acordo para ganhar uma recompensa.</div>';
    return;
  }

  const week = getWeekDays();
  list.innerHTML = ativos.map(c => {
    const desbloqueado = checkContratoDesbloqueado(c);
    // Persiste o desbloqueio no objeto
    if (desbloqueado && !c.desbloqueado) c.desbloqueado = true;

    // Calcula progresso
    let pct = 0, progLabel = '';
    if (c.tipoAlvo === 'meta') {
      const concluido = (S.historico||[]).some(h => (h.id === c.alvoId || h.alvoNome === c.alvoNome) && h.statusFinal === 'concluido');
      pct = concluido ? 100 : 0;
      progLabel = concluido ? 'Meta concluída ✓' : 'Aguardando conclusão da meta';
    } else if (c.tipoAlvo === 'habito') {
      const h = S.habitos.find(x => x.id === c.alvoId);
      if (h) { const r = calcPctHabito(h, week); pct = r.pct; progLabel = `${r.feito}/${r.alvo} · ${pct}%`; }
      else { progLabel = 'Hábito removido'; }
    } else {
      const v = S.vicios.find(x => x.id === c.alvoId);
      if (v) { const r = calcPctVicio(v, week); pct = r.pct; progLabel = `${r.resistiu}/${r.alvo} dias · ${pct}%`; }
      else { progLabel = 'Vício removido'; }
    }

    const tipoLabel = {meta:'🎯 Meta',habito:'🧱 Hábito',vicio:'🛡️ Vício'}[c.tipoAlvo] || c.tipoAlvo;
    const statusCls = desbloqueado ? 'livre' : 'bloqueado';
    const statusTxt = desbloqueado ? '🔓 Desbloqueado' : '🔒 Bloqueado';

    return `<div class="contrato-card${desbloqueado ? ' desbloqueado' : ''}">
      <div class="contrato-top">
        <div style="flex:1">
          <div class="contrato-recompensa">🎁 ${esc(c.recompensa)}</div>
          <div class="contrato-alvo">${tipoLabel}: ${esc(c.alvoNome)}</div>
        </div>
        <span class="contrato-status ${statusCls}">${statusTxt}</span>
      </div>
      <div class="contrato-prog">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t3);font-family:Georgia,serif">
          <span>Progresso</span><span>${progLabel}</span>
        </div>
        <div class="contrato-prog-track">
          <div class="contrato-prog-fill${pct>=100?' green':''}" style="width:${pct}%"></div>
        </div>
      </div>
      <button class="btn-resgatar" ${desbloqueado ? '' : 'disabled'} onclick="resgatarContrato('${c.id}')">
        ${desbloqueado ? '🏆 Resgatar Recompensa' : '🔒 Cumpra o acordo para desbloquear'}
      </button>
    </div>`;
  }).join('');
}

function resgatarContrato(id) {
  const c = (S.contratos||[]).find(x => x.id === id); if (!c) return;
  showConfirm2(`Resgatar "${c.recompensa}"?`, 'Confirma? O contrato irá para o histórico de Contratos Honrados.', () => {
    c.resgatado = true;
    c.resgatadoEm = today();
    persist(); renderContratos();
    showToast('🏆 Recompensa resgatada!');
  });
}

/* ── Metas mobile nav ─────────────────────────────────────── */
function setPredioTab(id, btn) {
  // Close contratos overlay if open
  const flC = document.getElementById('fl-contratos');
  if (id !== 'contratos') {
    const floatBtn = document.getElementById('contratos-float-btn');
    const backBtn = document.getElementById('contratos-back-btn');
    const nav = document.querySelector('.predio-nav');
    if (flC) { flC.classList.remove('predio-active'); flC.style.display = ''; }
    if (floatBtn) floatBtn.classList.remove('active');
    if (backBtn) backBtn.style.display = 'none';
    if (nav) nav.style.opacity = '';
  }
  // Show active floor via class, hide others
  const floors = ['frentes','ciclos','horizontes','pilares','fundacao','contratos'];
  floors.forEach(f => {
    const el = document.getElementById('fl-' + f);
    if (!el) return;
    el.style.display = '';
    el.classList.toggle('predio-active', f === id);
  });
  document.querySelectorAll('.predio-nav-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  localStorage.setItem('canteiro_predio_tab', id);
  renderMetasInsights(id);
}

function initPredioNav() {
  const saved = localStorage.getItem('canteiro_predio_tab') || 'frentes';
  const btn = document.querySelector(`.predio-nav-tab[onclick*="'${saved}'"]`);
  setPredioTab(saved, btn);
}

/* ── Metas insights / analisador ─────────────────────────── */
function renderMetasInsights(tab) {
  const bar = document.getElementById('metas-insights-bar');
  if (!bar) return;
  const t = today();
  const hist = S.historico || [];

  // Month boundaries
  const now = new Date();
  const mesInicio = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

  let kpis = [], alertas = [];

  // Period toggle state (stored on bar element)
  const barEl = document.getElementById('metas-insights-bar');
  const periodo = barEl ? (barEl.dataset.periodo || 'total') : 'total';
  const tre_meses = (() => { const d = new Date(); d.setMonth(d.getMonth()-3); return d.toLocaleDateString('sv'); })();

  if (!tab || tab === 'frentes') {
    const ativos = (S.frentes||[]).filter(x => !x.status||x.status==='ativo');
    const cutoff = periodo === '3m' ? tre_meses : '0000-00-00';
    const concl = hist.filter(h => h.tipo==='frentes'&&h.statusFinal==='concluido'&&(h.encerradoEm||'')>=cutoff).length;
    const atrasadas = ativos.filter(f => f.prazo && f.prazo < t);
    const btnLabel = periodo === '3m' ? 'Últ. 3 meses' : 'Total';
    kpis = [
      {n: ativos.length, l:'Ativas'},
      {n: atrasadas.length, l:'Em atraso', ok: atrasadas.length === 0 ? true : false},
      {n: concl, l: btnLabel + ' concluídas'},
    ];
    // append period toggle to alertas area via extra HTML
    if (atrasadas.length > 0) alertas.push(`🔴 ${atrasadas.length} com prazo vencido`);
    else if (ativos.length > 5) alertas.push(`⚠️ Muitas ações abertas — considere revisar`);
    else if (ativos.length === 0) alertas.push('💡 Nenhuma ação ativa. Adicione uma.');
    else alertas.push('✅ Ações em ordem');

  } else if (tab === 'ciclos') {
    const ativos = (S.ciclos||[]).filter(x => !x.status||x.status==='ativo');
    const concl = hist.filter(h=>h.tipo==='ciclos'&&h.statusFinal==='concluido').length;
    const prox = ativos.filter(x=>x.prazo).sort((a,b)=>a.prazo<b.prazo?-1:1)[0];
    kpis = [
      {n:`${ativos.length}/3`, l:'Ativas'},
      {n: concl, l:'Concluídas'},
    ];
    if (ativos.length === 0) alertas.push('💡 Defina até 3 metas para este trimestre');
    const atrasadas = ativos.filter(c => {
      let pr = c.prazo;
      if (!pr && c.criadoEm) { const d=new Date(c.criadoEm+'T12:00:00'); d.setDate(d.getDate()+90); pr=d.toLocaleDateString('sv'); }
      return pr && pr < t;
    });
    if (atrasadas.length > 0) alertas.push(`🔴 ${atrasadas.length} meta${atrasadas.length>1?'s':''} trimestral vencida`);
    if (prox && !alertas.length) alertas.push(`📅 Próx. prazo: ${fmtDate(prox.prazo)}`);
    if (!atrasadas.length && ativos.length > 0 && !prox) alertas.push('✅ Metas trimestrais em andamento');

  } else if (tab === 'horizontes') {
    const ativos = (S.horizontes||[]).filter(x => !x.status||x.status==='ativo');
    const concl = hist.filter(h=>h.tipo==='horizontes'&&h.statusFinal==='concluido').length;
    kpis = [
      {n: ativos.length, l:'Objetivos ativos'},
      {n: concl, l:'Concluídos (total)'},
    ];
    if (ativos.length === 0) alertas.push('💡 Defina seus objetivos de 1 a 10 anos');
    else alertas.push('✅ Objetivos de longo prazo em andamento');

  } else if (tab === 'contratos') {
    const ativos = (S.contratos||[]).filter(c => !c.desbloqueado && !c.resgatado);
    const desbloq = (S.contratos||[]).filter(c => c.desbloqueado && !c.resgatado);
    const resgatados = (S.contratos||[]).filter(c => c.resgatado);
    kpis = [
      {n: ativos.length, l:'Pendentes'},
      {n: desbloq.length, l:'Desbloqueados', ok: desbloq.length > 0},
      {n: resgatados.length, l:'Resgatados'},
    ];
    if (desbloq.length > 0) alertas.push(`🎉 ${desbloq.length} contrato${desbloq.length>1?'s':''} desbloqueado${desbloq.length>1?'s':''} para resgatar!`);
    else if (ativos.length === 0) alertas.push('💡 Crie contratos vinculados a metas e hábitos');
    else alertas.push(`🔒 ${ativos.length} contrato${ativos.length>1?'s':''} aguardando cumprimento`);

  } else if (tab === 'pilares') {
    const ativos = (S.pilares||[]).filter(x => !x.status||x.status==='ativo');
    const ids = ativos.map(p => p.id);
    const habsV = (S.habitos||[]).filter(h => (h.vinculoIds||[h.vinculoId].filter(Boolean)).some(v => ids.includes(v))).length;
    const frentesV = (S.frentes||[]).filter(x => ids.includes(x.pilarId)).length;
    const ciclosV  = (S.ciclos||[]).filter(x => ids.includes(x.pilarId)).length;
    const horizV   = (S.horizontes||[]).filter(x => ids.includes(x.pilarId)).length;
    const totalV = habsV + frentesV + ciclosV + horizV;
    kpis = [
      {n: ativos.length, l:'Áreas ativas'},
      {n: habsV, l:'Hábitos'},
      {n: frentesV + ciclosV + horizV, l:'Metas vinculadas'},
    ];
    if (ativos.length === 0) alertas.push('💡 Defina as grandes áreas da sua vida');
    else if (totalV === 0) alertas.push('💡 Vincule hábitos e metas às suas áreas');
    else alertas.push(`✅ ${totalV} item${totalV>1?'s':''} vinculados às áreas`);

  } else if (tab === 'fundacao') {
    const temMissao = !!(S.fundacao && S.fundacao.missao && S.fundacao.missao.trim());
    const nDiario = ((S.fundacao && S.fundacao.diario) || []).length;
    const ultimaEntrada = nDiario > 0 ? S.fundacao.diario[0].data : null;
    kpis = [
      {n: temMissao ? '✓' : '—', l:'Propósito', ok: temMissao},
      {n: nDiario, l:'Entradas diário'},
    ];
    if (!temMissao) alertas.push('💡 Defina seu propósito maior — a bússola de tudo');
    else if (ultimaEntrada) alertas.push(`📓 Última entrada: ${fmtDate(ultimaEntrada)}`);
    else alertas.push('📓 Nenhuma entrada no diário ainda');
  }

  // Period toggle button for AÇÕES
  let extraHtml = '';
  if (!tab || tab === 'frentes') {
    const nxt = periodo === '3m' ? 'total' : '3m';
    const nxtLabel = periodo === '3m' ? 'Ver total' : 'Ver últ. 3 meses';
    extraHtml = `<button onclick="const b=document.getElementById('metas-insights-bar');b.dataset.periodo='${nxt}';renderMetasInsights('frentes')" style="background:none;border:1px solid var(--b1);color:var(--t3);border-radius:20px;padding:2px 10px;font-size:10px;cursor:pointer;font-family:Georgia,serif;margin-top:4px">${nxtLabel}</button>`;
  }

  const kpiHtml = kpis.map(k =>
    `<div class="metas-kpi${k.ok===false?'':k.ok?' ok':''}">
      <div class="metas-kpi-n">${k.n}</div>
      <div class="metas-kpi-l">${k.l}</div>
    </div>`
  ).join('');

  bar.innerHTML = `
    <div class="metas-kpis">${kpiHtml}</div>
    <ul class="metas-alerta">${alertas.map(a=>`<li>${a}</li>`).join('')}</ul>
    ${extraHtml}
  `;
}



/* ── Sidebar collapse ───────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════
   FOCUS TIMER
══════════════════════════════════════════════════════════════ */
// ── Focus Timer state ───────────────────────────────────────
let _ftSecs = 25 * 60;
let _ftTotal = 25 * 60;
let _ftInterval = null;
let _ftRunning = false;
let _ftSessions = [];
let _ftActivePreset = 0;   // index into _ftPresets
let _ftCycle = 0;          // current cycle (0-indexed)

// Default presets — [label, workMins, breakMins, cycles]
const FT_PRESET_DEFAULTS = [
  ['Foco', 25, 5, 4],
  ['Deep', 50, 10, 2],
  ['Ultra', 90, 15, 2],
];
let _ftPresets = (() => {
  try { return JSON.parse(localStorage.getItem('canteiro_ft_presets')) || FT_PRESET_DEFAULTS; }
  catch { return FT_PRESET_DEFAULTS; }
})();
let _ftInBreak = false;


function _ftPlayBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    // Rich bell sequence: 3 strikes with harmonics, ~4s total
    const strikes = [
      { t:0,    freq:523.25, harm:1046.5, gain:0.55, dur:2.2 },
      { t:0.9,  freq:659.25, harm:1318.5, gain:0.45, dur:1.8 },
      { t:1.7,  freq:783.99, harm:1567.98, gain:0.4, dur:2.0 },
      { t:2.6,  freq:523.25, harm:1046.5, gain:0.35, dur:1.6 },
    ];
    // Reverb via convolver
    const reverb = ctx.createConvolver();
    const rLen = ctx.sampleRate * 1.5;
    const rBuf = ctx.createBuffer(2, rLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = rBuf.getChannelData(c);
      for (let i = 0; i < rLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/rLen, 2);
    }
    reverb.buffer = rBuf;
    const reverbGain = ctx.createGain(); reverbGain.gain.value = 0.25;
    reverb.connect(reverbGain); reverbGain.connect(ctx.destination);

    strikes.forEach(s => {
      [s.freq, s.harm].forEach((freq, hi) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = hi === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        const g = hi === 0 ? s.gain : s.gain * 0.3;
        env.gain.setValueAtTime(0, now + s.t);
        env.gain.linearRampToValueAtTime(g, now + s.t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.001, now + s.t + s.dur);
        osc.connect(env);
        env.connect(ctx.destination);
        env.connect(reverb);
        osc.start(now + s.t);
        osc.stop(now + s.t + s.dur + 0.05);
      });
    });
  } catch(e) { console.warn('Bell error:', e); }
}

function _ftNotify(mins) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('⏱ Canteiro — Sessão concluída', {
      body: mins + ' minutos de foco. Bom trabalho!',
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 rx=%224%22 fill=%22%230E0E0E%22/><text x=%2216%22 y=%2224%22 font-size=%2220%22 text-anchor=%22middle%22>⬡</text></svg>'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') _ftNotify(mins);
    });
  }
}

function _ftRequestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function openFtFullscreen() {
  const el = document.getElementById('ft-fullscreen');
  if (!el) return;
  el.style.display = 'flex';
  _ftRenderFsPresets();
  _ftRenderDisplay();
  _ftRenderCycles();
  const fsPlay = document.getElementById('ft-fs-play');
  if (fsPlay) fsPlay.textContent = _ftRunning ? '⏸' : '▶';
}

function closeFtFullscreen() {
  const el = document.getElementById('ft-fullscreen');
  if (el) el.style.display = 'none';
}

function toggleKbdPanel() {
  const p = document.getElementById('kbd-hint-panel');
  if (p) p.classList.toggle('open');
}

function focusTimerSelectPreset(idx) {
  _ftActivePreset = idx;
  _ftCycle = 0;
  _ftInBreak = false;
  focusTimerReset();
  const p = _ftPresets[idx];
  _ftTotal = p[1] * 60;
  _ftSecs = _ftTotal;
  _ftRenderDisplay();
  _ftRenderPresets();
  _ftRenderCycles();
  // Sync fullscreen too
  _ftRenderFsPresets();
}

function focusTimerEditPreset(idx, e) {
  e.stopPropagation();
  const p = _ftPresets[idx];
  const newWork = parseInt(prompt('Tempo de foco (min):', p[1]));
  if (!newWork || newWork < 1) return;
  const newBreak = parseInt(prompt('Pausa (min):', p[2]));
  if (!newBreak || newBreak < 1) return;
  const newCycles = parseInt(prompt('Ciclos:', p[3]));
  if (!newCycles || newCycles < 1) return;
  const newLabel = prompt('Nome:', p[0]) || p[0];
  _ftPresets[idx] = [newLabel, newWork, newBreak, newCycles];
  localStorage.setItem('canteiro_ft_presets', JSON.stringify(_ftPresets));
  if (_ftActivePreset === idx) focusTimerSelectPreset(idx);
  else _ftRenderPresets();
}

function _ftRenderPresets() {
  ['ft-presets','ft-fs-presets'].forEach(containerId => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const isFs = containerId === 'ft-fs-presets';
    el.innerHTML = _ftPresets.map((p, i) =>
      `<button class="${isFs?'ft-fs-preset-btn':'ft-preset-btn'}${i===_ftActivePreset?' active-btn':''}"
        onclick="focusTimerSelectPreset(${i})"
        title="${p[1]}min foco · ${p[2]}min pausa · ${p[3]} ciclos">
        ${p[0]}
        ${!isFs ? `<button class="ft-preset-edit" onclick="focusTimerEditPreset(${i},event)" title="Editar">✎</button>` : ''}
      </button>`
    ).join('');
  });
}

function _ftRenderCycles() {
  const p = _ftPresets[_ftActivePreset];
  const total = p[3];
  const dots = Array.from({length:total}, (_,i) =>
    `<div class="ft-cycle-dot${i<_ftCycle?' done':i===_ftCycle&&!_ftInBreak?' active':''}"></div>`
  ).join('');
  const cr = document.getElementById('ft-cycle-row');
  if (cr) cr.innerHTML = dots;
  const fsC = document.getElementById('ft-fs-cycle');
  if (fsC) {
    const label = _ftInBreak
      ? `⏸ Pausa · ${_ftCycle+1}/${total}`
      : `Ciclo ${_ftCycle+1}/${total}`;
    fsC.textContent = label;
  }
}

function _ftRenderFsPresets() {
  const el = document.getElementById('ft-fs-presets');
  if (el) {
    el.innerHTML = _ftPresets.map((p, i) =>
      `<button class="ft-fs-preset-btn${i===_ftActivePreset?' active-btn':''}"
        onclick="focusTimerSelectPreset(${i})">
        ${p[0]}: ${p[1]}min
      </button>`
    ).join('');
  }
}

function focusTimerToggle() {
  const btns = ['ft-btn-play','ft-fs-play'];
  if (_ftRunning) {
    clearInterval(_ftInterval);
    _ftRunning = false;
    btns.forEach(id => { const b = document.getElementById(id); if(b) b.textContent = '▶'; });
    _ftSetState('');
  } else {
    _ftRunning = true;
    btns.forEach(id => { const b = document.getElementById(id); if(b) b.textContent = '⏸'; });
    _ftSetState(_ftInBreak ? 'break' : 'running');
    _ftRequestNotifPermission();
    _ftInterval = setInterval(() => {
      _ftSecs--;
      _ftRenderDisplay();
      if (_ftSecs <= 0) {
        clearInterval(_ftInterval);
        _ftRunning = false;
        btns.forEach(id => { const b = document.getElementById(id); if(b) b.textContent = '▶'; });
        const p = _ftPresets[_ftActivePreset];
        if (!_ftInBreak) {
          // Work session done
          _ftSessions.push({ mins: p[1], ts: today(), preset: p[0] });
          _ftRenderSessions();
          _ftPlayBell();
          _ftNotify(p[1]);
          _ftCycle++;
          if (_ftCycle >= p[3]) {
            // All cycles done
            _ftCycle = 0;
            _ftSetState('done');
            showToast('🎉 ' + p[3] + ' ciclos concluídos! Descanse bem.');
          } else {
            // Start break
            _ftInBreak = true;
            const breakSecs = (_ftCycle % p[3] === 0 && p[3] > 1 ? p[2] * 2 : p[2]) * 60;
            _ftTotal = breakSecs;
            _ftSecs = breakSecs;
            _ftSetState('');
            showToast('⏸ Ciclo ' + _ftCycle + '/' + p[3] + ' — pausa de ' + Math.round(breakSecs/60) + 'min');
            _ftRenderCycles();
          }
        } else {
          // Break done
          _ftInBreak = false;
          _ftTotal = p[1] * 60;
          _ftSecs = _ftTotal;
          _ftSetState('');
          _ftPlayBell();
          showToast('▶ Pausa concluída — ciclo ' + (_ftCycle+1) + ' iniciando!');
          _ftRenderCycles();
        }
        _ftRenderDisplay();
      } else if (_ftSecs <= 60 && !_ftInBreak) {
        _ftSetState('warning');
      }
    }, 1000);
  }
}

function focusTimerReset() {
  clearInterval(_ftInterval);
  _ftRunning = false;
  _ftInBreak = false;
  const p = _ftPresets[_ftActivePreset];
  _ftTotal = p[1] * 60;
  _ftSecs = _ftTotal;
  _ftCycle = 0;
  ['ft-btn-play','ft-fs-play'].forEach(id => { const b=document.getElementById(id); if(b) b.textContent='▶'; });
  _ftSetState('');
  _ftRenderDisplay();
  _ftRenderCycles();
}

function _ftRenderDisplay() {
  const m = String(Math.floor(_ftSecs / 60)).padStart(2, '0');
  const s = String(_ftSecs % 60).padStart(2, '0');
  const timeStr = m + ':' + s;
  const el = document.getElementById('focus-timer-display');
  const elFs = document.getElementById('ft-fs-display');
  if (el) el.textContent = timeStr;
  if (elFs) elFs.textContent = timeStr;
  const miniTime = document.getElementById('ft-mini-time');
  if (miniTime) miniTime.textContent = _ftSecs < 3600 ? timeStr : m + 'm';
  const pct = _ftSecs / _ftTotal;
  const C_main = 163.4, C_fs = 552.9, C_mini = 94.2;
  const offset = v => String(v * (1 - pct));
  const ring = document.getElementById('ft-ring-fill');
  if (ring) ring.style.strokeDashoffset = offset(C_main);
  const ringFs = document.getElementById('ft-fs-ring-fill');
  if (ringFs) ringFs.style.strokeDashoffset = offset(C_fs);
  const mini = document.getElementById('ft-mini-fill');
  if (mini) mini.style.strokeDashoffset = offset(C_mini);
}

function _ftSetState(state) {
  const s = state === 'break' ? 'running' : state;
  ['focus-timer-display','ft-fs-display'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = el.id === 'focus-timer-display' ? 'focus-timer-display' : 'ft-fs-display'; if (s) el.classList.add(s); }
  });
  ['ft-ring-fill','ft-fs-ring-fill'].forEach(id => {
    const ring = document.getElementById(id);
    if (ring) { ring.className = 'ft-ring-fill'; if (s) ring.classList.add(s); }
  });
  const mini = document.getElementById('ft-mini-fill');
  if (mini) { mini.className = 'ft-mini-fill'; if (s) mini.classList.add(s); }
  const lbl = document.getElementById('ft-fs-label');
  if (lbl) lbl.textContent = state === 'break' ? 'PAUSA' : state === 'done' ? 'CONCLUÍDO' : _ftInBreak ? 'PAUSA' : 'FOCO';
}

function _ftRenderSessions() {
  const el = document.getElementById('dash-sidebar-stats');
  if (!el) return;
  if (_ftSessions.length === 0) return;
  const today_ = today();
  const todaySess = _ftSessions.filter(s => s.ts === today_);
  const totalMins = _ftSessions.reduce((a, s) => a + s.mins, 0);
  const todayMins = todaySess.reduce((a, s) => a + s.mins, 0);
  el.innerHTML = `
    <div class="dash-sec">
      <div class="dash-sec-hdr">Sessões de foco</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div class="kpi-card green" style="flex:1;padding:10px 8px">
          <div class="kpi-val" style="font-size:20px">${todaySess.length}</div>
          <div class="kpi-lbl">Hoje</div>
          <div class="kpi-sub">${todayMins}min</div>
        </div>
        <div class="kpi-card gold" style="flex:1;padding:10px 8px">
          <div class="kpi-val" style="font-size:20px">${_ftSessions.length}</div>
          <div class="kpi-lbl">Total</div>
          <div class="kpi-sub">${totalMins}min</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--t3);font-family:Georgia,serif">
        ${_ftSessions.slice(-5).reverse().map(s =>
          `<div class="session-log-entry"><span>${s.ts}</span><span>${s.mins}min ✓</span></div>`
        ).join('')}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════════ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const modal = document.querySelector('.mbg[style*="flex"]');
    const inInput = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);

    // Esc — fechar modal
    if (e.key === 'Escape' && modal) {
      e.preventDefault();
      const closeBtn = modal.querySelector('.m-close');
      if (closeBtn) closeBtn.click();
      return;
    }
    if (inInput) return;

    // Alt + 1-4 — trocar abas
    if (e.altKey) {
      const tabMap = {'1':'rotina','2':'caderno','3':'predio','4':'dash'};
      const tab = tabMap[e.key];
      if (tab) {
        e.preventDefault();
        const btn = document.getElementById('tab-' + tab);
        if (btn) btn.click();
        return;
      }
    }

    // N — nova entrada no inbox (qualquer aba, foca no campo)
    if (e.key === 'n' || e.key === 'N') {
      const inp = document.getElementById('inp-inbox');
      if (inp) {
        e.preventDefault();
        const cadBtn = document.getElementById('tab-caderno');
        if (cadBtn) cadBtn.click();
        setTimeout(() => inp.focus(), 80);
        return;
      }
    }

    // F — toggle focus timer
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      focusTimerToggle();
      return;
    }

    // R — reset focus timer
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      focusTimerReset();
    }
  });
}

let dashPeriod = 'month';

function buildDeleteZone() {
  const habAtivos  = S.habitos || [];
  const habArq     = S.habitosArquivados || [];
  const vicios     = S.vicios || [];
  const hist       = S.historico || [];
  const tarefas    = (S.tarefas||[]).filter(t=>t.coluna==='feito');
  const descarte   = S.descarte || [];
  const pilArq     = S.pilares_arquivados || [];
  const propHist   = (S.fundacao||{}).historico || [];
  const total      = habAtivos.length + habArq.length + vicios.length +
                     hist.length + tarefas.length + descarte.length +
                     pilArq.length + propHist.length;

  if (total === 0) {
    return `<div style="font-size:12px;color:var(--t3);font-family:Georgia,serif;padding:8px 0">Nenhum item para excluir.</div>`;
  }

  let items = '';

  habAtivos.forEach(h => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(h.nome)}</span>
      <span class="dash-delete-meta">hábito ativo</span>
      <button class="dash-delete-btn" onclick="deleteHabitoHard('${h.id}')">Excluir</button>
    </div>`;
  });
  habArq.forEach(h => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(h.nome)}</span>
      <span class="dash-delete-meta">hábito arquivado</span>
      <button class="dash-delete-btn" onclick="deleteHabitoArqHard('${h.id}')">Excluir</button>
    </div>`;
  });
  vicios.forEach(v => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(v.nome)}</span>
      <span class="dash-delete-meta">vício</span>
      <button class="dash-delete-btn" onclick="deleteVicioHard('${v.id}')">Excluir</button>
    </div>`;
  });
  hist.forEach(h => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(h.nome.slice(0,30))}</span>
      <span class="dash-delete-meta">${{frentes:'Ação',ciclos:'Trimestre',horizontes:'Metas de Longo Prazo',pilares:'Área de foco'}[h.tipo]||h.tipo} · ${h.statusFinal}</span>
      <button class="dash-delete-btn" onclick="deleteHistHard('${h.id}')">Excluir</button>
    </div>`;
  });
  tarefas.forEach(t => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(t.texto.slice(0,30))}</span>
      <span class="dash-delete-meta">tarefa concluída</span>
      <button class="dash-delete-btn" onclick="deleteTaskHard('${t.id}')">Excluir</button>
    </div>`;
  });
  pilArq.forEach(p => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc((p.texto||p.nome||'').slice(0,30))}</span>
      <span class="dash-delete-meta">área de foco arquivada</span>
      <button class="dash-delete-btn" onclick="deletePilarArqHard('${p.id}')">Excluir</button>
    </div>`;
  });
  propHist.forEach((p, i) => {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${esc(p.texto.slice(0,30))}</span>
      <span class="dash-delete-meta">propósito arquivado · ${fmtDate(p.arquivadoEm)}</span>
      <button class="dash-delete-btn" onclick="deletePropHistHard(${i})">Excluir</button>
    </div>`;
  });
  if (descarte.length) {
    items += `<div class="dash-delete-item">
      <span class="dash-delete-name">${descarte.length} itens no descarte</span>
      <span class="dash-delete-meta">descarte</span>
      <button class="dash-delete-btn" onclick="clearDescarte()">Limpar tudo</button>
    </div>`;
  }
  items += `<div style="padding-top:10px;border-top:1px solid rgba(200,75,75,.2);margin-top:4px">
    <button class="btn btn-red btn-sm" style="width:100%" onclick="zerarTudoConfirm()">⚠ Zerar TODOS os dados do app</button>
  </div>`;

  return `<div class="dash-delete-zone" style="border:none;padding:0;background:none">${items}</div>`;
}



// ── Hard deletes (sem histórico) ─────────────────────────────────
function renderMaintenance() {
  const el = document.getElementById('cfg-manutencao-body');
  if (el) el.innerHTML = buildDeleteZone();
}

function deleteHabitoHard(id) {
  showConfirm('Excluir este hábito e todos os dados permanentemente?', () => {
    S.habitos = (S.habitos||[]).filter(x => x.id !== id);
    persist(); renderMaintenance();
  });
}
function deleteHabitoArqHard(id) {
  showConfirm('Excluir hábito arquivado permanentemente?', () => {
    S.habitosArquivados = (S.habitosArquivados||[]).filter(x => x.id !== id);
    persist(); renderMaintenance();
  });
}
function deleteVicioHard(id) {
  showConfirm('Excluir este vício e todos os dados permanentemente?', () => {
    S.vicios = (S.vicios||[]).filter(x => x.id !== id);
    persist(); renderPorao(); renderMaintenance();
  });
}
function deleteHistHard(id) {
  S.historico = (S.historico||[]).filter(x => x.id !== id);
  persist(); renderMaintenance();
}
function deleteTaskHard(id) {
  S.tarefas = (S.tarefas||[]).filter(x => x.id !== id);
  persist(); renderMaintenance();
}
function deletePilarArqHard(id) {
  showConfirm('Excluir esta área de foco arquivada permanentemente?', () => {
    S.pilares_arquivados = (S.pilares_arquivados||[]).filter(x => x.id !== id);
    persist(); renderMaintenance();
  });
}
function deletePropHistHard(index) {
  showConfirm('Excluir esta versão arquivada do propósito permanentemente?', () => {
    if (S.fundacao.historico) S.fundacao.historico.splice(index, 1);
    persist(); renderMaintenance();
  });
}
function clearDescarte() {
  showConfirm('Limpar todos os itens do descarte?', () => {
    S.descarte = [];
    persist(); renderMaintenance();
  });
}
function zerarTudoConfirm() {
  showConfirm('Zerar TODOS os dados? Esta ação não pode ser desfeita.', () => {
    showConfirm('Tem certeza absoluta? Tudo será apagado, inclusive na nuvem.', async () => {
      const settings = S.settings;
      S = blank();
      S.settings = settings;
      // Timestamp recente garante que a nuvem não vai "vencer" no próximo pull
      S.meta.ultimaSync = new Date().toISOString();
      // Marca no localStorage que o usuário zerou intencionalmente
      localStorage.setItem('canteiro_zeroed', S.meta.ultimaSync);
      localStorage.setItem(KEY, JSON.stringify(S));
      // Envia estado vazio para a nuvem (bypassa proteção anti-vazio)
      const url = settings.scriptUrl;
      if (url && navigator.onLine) {
        try {
          await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ data: S, forceEmpty: true })
          });
        } catch(e) {}
      }
      location.reload();
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   TOAST — Feedback visual "Salvo ✓"
═══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg || 'Salvo ✓';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration || 1800);
}

/* ═══════════════════════════════════════════════════════════
   DETECÇÃO DE NOVO DISPOSITIVO
═══════════════════════════════════════════════════════════ */
function checkNewDevice() {
  const hasUrl = S.settings.scriptUrl;
  const empty  = isStateEmpty(S);
  // Só mostra se: tem URL, app está vazio E nunca decidiu neste dispositivo
  const jaDecidiu = localStorage.getItem('canteiro_device_checked');
  // Se app não está vazio, marca como "já decidiu" para não mostrar nunca mais
  if (!empty) {
    localStorage.setItem('canteiro_device_checked', '1');
    return false;
  }
  if (hasUrl && empty && navigator.onLine && !jaDecidiu) {
    openM('mbg-new-device');
    return true;
  }
  return false;
}

function deviceChoiceLocal() {
  localStorage.setItem('canteiro_device_checked', '1');
  closeM('mbg-new-device');
}

async function deviceChoiceRestore() {
  localStorage.setItem('canteiro_device_checked', '1');
  closeM('mbg-new-device');
  await syncGetFromCloud();
}





/* ═══════════════════════════════════════════════════════════