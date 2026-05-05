   PRÉDIO
═══════════════════════════════════════════════════════════ */
const PREDI_CONFIGS = {
  frentes:    { label: 'Nova ação',                lbl: 'Nome da ação',           extras: true,  anoAlvo: false, hasDesc: false },
  ciclos:     { label: 'Nova meta trimestral',     lbl: 'Meta dos 90 dias',       extras: false, anoAlvo: false, hasDesc: true  },
  horizontes: { label: 'Novo grande salto', lbl: 'Metas de Longo Prazo (1-10 anos)', extras: false, anoAlvo: true,  hasDesc: true  },
  pilares:    { label: 'Nova área de foco',        lbl: 'Área de foco',           extras: false, anoAlvo: false, hasDesc: false }
};

// Placeholders para os campos de nome
const PREDI_PLACEHOLDERS = {
  frentes:    'Ex: Fazer o design das embalagens e cadastrar o produto para venda',
  ciclos:     'Ex: Terminar o módulo de SQL e criar o escopo do banco de dados até 31 de julho',
  horizontes: 'Ex: Fazer meu negócio gerar renda suficiente até 2030',
  pilares:    'Ex: Meus Negócios, Minha Saúde, Meus Estudos'
};

/* ── Sidebar collapse ───────────────────────────────────────── */
function initSidebar() {
  if (window.innerWidth < 1024) return;
  const nav = document.getElementById('sidebar');
  if (!nav) return;
  const saved = localStorage.getItem('canteiro_sidebar');
  if (saved === '1') nav.classList.add('collapsed');
}

/* ── Floor preview (live list) ───────────────────────────── */
function renderFloorPreviews() {
  const tipos = ['frentes','ciclos','horizontes','pilares'];
  tipos.forEach(tipo => {
    const el = document.getElementById('preview-' + tipo);
    if (!el) return;
    const items = (S[tipo] || []).filter(x => !x.status || x.status === 'ativo');
    if (items.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = items.slice(0, 5).map(it =>
      `<span class="floor-preview-item">${esc(it.nome || it.texto || '')}</span>`
    ).join('') + (items.length > 5 ? `<span style="color:var(--t3)"> +${items.length - 5} mais</span>` : '');
  });
}

/* ── Hábito dias ativos helper ───────────────────────────── */
function getHabDiasAtivos(h, days) {
  if (!h.diasAtivos) return days;
  return days.filter(d => h.diasAtivos.includes(new Date(d + 'T12:00:00').getDay()));
}

function renderPredio() {
  const m = document.getElementById('inp-missao');
  if (m) m.value = S.fundacao.missao || '';
  ['frentes','ciclos','horizontes','pilares'].forEach(tipo => renderPrediSection(tipo));
  renderFloorPreviews();
  renderMetasInsights();
  initPredioNav();
  const limit = S.ciclos.filter(x => !x.status || x.status === 'ativo').length >= 3;
  document.getElementById('warn-ciclos').style.display = limit ? 'block' : 'none';
  document.getElementById('btn-add-ciclo').style.display = limit ? 'none' : 'inline-flex';
  // Atualiza contadores nos headers
  const contadores = {
    frentes:    S.frentes.filter(x => !x.status || x.status==='ativo').length,
    ciclos:     S.ciclos.filter(x => !x.status || x.status==='ativo').length,
    horizontes: S.horizontes.filter(x => !x.status || x.status==='ativo').length,
    pilares:    S.pilares.filter(x => !x.status || x.status==='ativo').length,
    contratos:  (S.contratos||[]).filter(c => !c.resgatado).length
  };
  Object.entries(contadores).forEach(([tipo, n]) => {
    const el = document.getElementById('fl-' + tipo + '-count');
    if (el) {
      if (tipo === 'ciclos') el.textContent = n > 0 ? `${n}/3` : '';
      else el.textContent = n > 0 ? String(n) : '';
    }
    if (tipo === 'contratos') {
      const btn = document.getElementById('contratos-btn-count');
      if (btn) btn.textContent = n > 0 ? String(n) : '';
    }
  });
  renderContratos();
}

// Helper: calcula badge de prazo
function buildPrazoBadge(prazoStr) {
  if (!prazoStr) return '';
  const hoje = today();
  const diff = Math.round((new Date(prazoStr+'T00:00:00') - new Date(hoje+'T00:00:00')) / 86400000);
  const data = fmtDate(prazoStr);
  let cls = 'prazo-tag';
  let label = '';
  if (diff < 0) { cls += ' vencido'; label = `Prazo: ${data} · Vencido há ${Math.abs(diff)}d`; }
  else if (diff <= 7) { cls += ' urgente'; label = `Prazo: ${data} · Faltam ${diff}d`; }
  else { label = `Prazo: ${data} · Faltam ${diff}d`; }
  return `<span class="${cls}">${label}</span>`;
}

function renderPrediSection(tipo) {
  const list = document.getElementById('list-' + tipo);
  const tutorial = document.getElementById('fl-' + tipo + '-tutorial');
  const items = S[tipo].filter(x => !x.status || x.status === 'ativo');

  // 1.3 — tutorial condicional
  if (tutorial) tutorial.style.display = items.length === 0 ? 'block' : 'none';

  if (items.length === 0) {
    list.innerHTML = '<div class="empty" style="padding:10px 0">Nenhum item ativo.</div>';
    return;
  }

  list.innerHTML = items.map(item => {
    const nome = item.nome || item.texto || '';
    const rodadaTag = item.rodada > 1 ? `<span class="pi-rodada">${item.rodada}ª rodada</span>` : '';

    // Hábitos vinculados
    const habsVinculados = S.habitos.filter(h => h.vinculoId === item.id);
    const week = getWeekDays();
    let habSection = '';
    if (habsVinculados.length > 0) {
      const rows = habsVinculados.map(h => {
        const regs = h.registros || {};
        const feito = week.filter(d => regs[d] === 'feito').length;
        const pct   = Math.round(feito / 7 * 100);
        return `<div class="pi-hab-row">
          <span style="flex:1;font-size:12px;color:var(--t2)">${esc(h.nome)}</span>
          <div class="pi-hab-bar"><div class="pi-hab-fill" style="width:${pct}%"></div></div>
          <span style="font-size:11px;color:var(--t2);min-width:28px;text-align:right">${pct}%</span>
        </div>`;
      }).join('');
      habSection = `<div class="pi-habitos">
        <button class="pi-hab-toggle" onclick="toggleHabSection('${item.id}')">▸ Hábitos vinculados (${habsVinculados.length})</button>
        <div class="pi-hab-list" id="pi-hs-${item.id}">${rows}</div>
      </div>`;
    }

    // 1.2 — badge de prazo para frentes e ciclos; ciclos usa criadoEm+90 se sem prazo
    let metaRow = '';
    if (tipo === 'frentes' && item.prazo) {
      metaRow = `<div style="margin-top:4px">${buildPrazoBadge(item.prazo)}</div>`;
    }
    if (tipo === 'ciclos') {
      let prazo = item.prazo;
      if (!prazo && item.criadoEm) {
        // Calcula 90 dias a partir da criação
        const d = new Date(item.criadoEm + 'T12:00:00');
        d.setDate(d.getDate() + 90);
        prazo = d.toLocaleDateString('sv');
      }
      if (prazo) metaRow = `<div style="margin-top:4px">${buildPrazoBadge(prazo)}</div>`;
    }
    // Show pilarId tag on frentes/ciclos/horizontes
    if (['frentes','ciclos','horizontes'].includes(tipo) && item.pilarId) {
      const pilar = (S.pilares||[]).find(p => p.id === item.pilarId);
      if (pilar) {
        const pNome = esc((pilar.texto||pilar.nome||'').slice(0,25));
        metaRow = (metaRow || '') + `<div style="margin-top:3px"><span style="font-size:9px;color:var(--acc);background:var(--acc-d);border:1px solid var(--acc-g);border-radius:3px;padding:1px 6px;font-family:Georgia,serif">📍 ${pNome}</span></div>`;
      }
    }
    // ÁREAS: show linked habits count
    if (tipo === 'pilares') {
      const habVinc = (S.habitos||[]).filter(h => {
        const ids = h.vinculoIds || (h.vinculoId ? [h.vinculoId] : []);
        return ids.includes(item.id);
      }).length;
      if (habVinc > 0) metaRow = `<div class="area-hab-badge">🧱 ${habVinc} hábito${habVinc>1?'s':''} vinculado${habVinc>1?'s':''}</div>`;
    }
    // LONGO PRAZO: show completed ciclos linked
    if (tipo === 'horizontes') {
      const ciclosR = (S.historico||[]).filter(h=>h.tipo==='ciclos'&&h.statusFinal==='concluido'&&h.horizonteVinculo===item.id).length;
      if (ciclosR > 0) metaRow = `<div class="horizonte-link-badge">📎 ${ciclosR} trimestre${ciclosR>1?'s':''} realizados</div>`;
    }
    if (tipo === 'horizontes' && item.anoAlvo) {
      const anos = item.anoAlvo - new Date().getFullYear();
      const label = anos > 0 ? `Alvo: ${item.anoAlvo} · Faltam ${anos} ano${anos !== 1 ? 's' : ''}` : anos === 0 ? `Alvo: ${item.anoAlvo} · Este ano!` : `Alvo: ${item.anoAlvo} · Prazo passou`;
      metaRow = `<div><span class="countdown-tag">${label}</span></div>`;
    }

    // 1.5 — kebab menu + botão check (concluir/arquivar)
    const kebabId = 'kb-' + item.id;
    let checkBtn = '';
    let kebabItems = '';
    if (tipo === 'pilares') {
      checkBtn = `<button class="pi-check-btn" title="Arquivar área de foco" onclick="arquivarPilar('${item.id}')">✓</button>`;
      kebabItems = `
        <button class="kebab-item" onclick="closeKebab('${kebabId}');openEditPredi('${tipo}','${item.id}')">✎ Editar</button>
        <button class="kebab-item danger" onclick="closeKebab('${kebabId}');removePredi('${tipo}','${item.id}')">✕ Remover</button>`;
    } else {
      checkBtn = `<button class="pi-check-btn" title="Concluir" onclick="quickConcluir('${tipo}','${item.id}')">✓</button>`;
      kebabItems = `
        <button class="kebab-item" onclick="closeKebab('${kebabId}');openEditPredi('${tipo}','${item.id}')">✎ Editar</button>
        <button class="kebab-item" onclick="closeKebab('${kebabId}');quickReiniciar('${tipo}','${item.id}')">↻ Reiniciar ciclo</button>
        <button class="kebab-item danger" onclick="closeKebab('${kebabId}');quickAbandonar('${tipo}','${item.id}')">✕ Abandonar</button>
        <button class="kebab-item danger" onclick="closeKebab('${kebabId}');removePredi('${tipo}','${item.id}')">🗑 Remover</button>`;
    }

    return `<div class="predio-item" onclick="openPrediDetail('${tipo}','${item.id}')" style="cursor:pointer">
      <div class="pi-top" onclick="event.stopPropagation()">
        <div style="flex:1;min-width:0" onclick="openPrediDetail('${tipo}','${item.id}')">
          <span class="pi-txt">${esc(nome)}${rodadaTag}</span>
          ${metaRow}
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
          ${checkBtn}
          <div class="kebab-wrap">
            <button class="kebab-btn" onclick="event.stopPropagation();toggleKebab('${kebabId}',event)">⋮</button>
            <div class="kebab-menu" id="${kebabId}">${kebabItems}</div>
          </div>
        </div>
      </div>
      ${habSection}
      <div onclick="event.stopPropagation()">
        <button class="pi-nota-toggle${item.notas?(' has-nota'):''}" onclick="toggleNota('${item.id}',event)">📝 ${item.notas?'Ver notas':'Notas'}</button>
        <div id="pi-nota-${item.id}" style="display:none">
          <textarea class="pi-nota-area" rows="2"
            placeholder="Anotações internas, contexto, lembretes..."
            onblur="saveNota('${tipo}','${item.id}',this.value)"
          >${esc(item.notas||'')}</textarea>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleHabSection(id) {
  const el = document.getElementById('pi-hs-' + id);
  if (!el) return;
  el.classList.toggle('open');
  const btn = el.previousElementSibling;
  if (btn) btn.textContent = el.classList.contains('open')
    ? btn.textContent.replace('▸','▾')
    : btn.textContent.replace('▾','▸');
}

// ── Kebab helpers ─────────────────────────────────────────────
function toggleKebab(id, e) {
  e.stopPropagation();
  const menu = document.getElementById(id);
  const isOpen = menu.classList.contains('open');
  document.querySelectorAll('.kebab-menu.open').forEach(m => m.classList.remove('open'));
  if (!isOpen) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.classList.add('open');
  }
}
function closeKebab(id) {
  const menu = document.getElementById(id);
  if (menu) menu.classList.remove('open');
}
// Fecha kebab ao clicar fora
document.addEventListener('click', () => {
  document.querySelectorAll('.kebab-menu.open').forEach(m => m.classList.remove('open'));
});

// ── Ações rápidas do card ──────────────────────────────────────
function quickConcluir(tipo, id) {
  const item = S[tipo].find(x => x.id === id); if (!item) return;
  const nome = item.nome || item.texto || '';
  const tipoLabel = {frentes:'ação',ciclos:'meta trimestral',horizontes:'objetivo',pilares:'área'}[tipo] || 'meta';
  showConfirm(`Concluir a ${tipoLabel} "${nome.slice(0,40)}"?`, () => {
    let atrasoDias = 0;
    if (item.prazo) {
      const diff = Math.round((new Date(today()+'T00:00:00') - new Date(item.prazo+'T00:00:00')) / 86400000);
      if (diff > 0) atrasoDias = diff;
    }
    const histId = uid();
    S.historico.push({ id: histId, tipo, nome, statusFinal: 'concluido', rodada: item.rodada||1, criadoEm: item.criadoEm||'', encerradoEm: today(), atrasoDias });
    S[tipo] = S[tipo].filter(x => x.id !== id);
    (S.contratos||[]).forEach(c => { if (c.alvoId === id && !c.desbloqueado) c.desbloqueado = true; });
    persist(); renderPredio(); renderContratos();
    const msg = atrasoDias > 0 ? `✓ Concluída com ${atrasoDias}d de atraso` : '✓ Meta concluída!';
    showToast(msg);
    if (tipo === 'ciclos') {
      const horizs = (S.horizontes||[]).filter(x=>!x.status||x.status==='ativo');
      if (horizs.length > 0) setTimeout(() => offerLinkHorizonte(histId, nome), 400);
    }
  });
}
function quickAbandonar(tipo, id) {
  const item = S[tipo].find(x => x.id === id); if (!item) return;
  const nome = item.nome || item.texto || '';
  showConfirm(`Abandonar "${nome.slice(0,40)}"? Irá para o histórico.`, () => {
    S.historico.push({ id: uid(), tipo, nome, statusFinal: 'abandonado', rodada: item.rodada||1, criadoEm: item.criadoEm||'', encerradoEm: today() });
    S[tipo] = S[tipo].filter(x => x.id !== id);
    persist(); renderPredio();
  });
}
function quickReiniciar(tipo, id) {
  const item = S[tipo].find(x => x.id === id); if (!item) return;
  const nome = item.nome || item.texto || '';
  showConfirm(`Nova rodada para "${nome.slice(0,35)}"? A versão atual vai pro histórico.`, () => {
    S.historico.push({ id: uid(), tipo, nome, statusFinal: 'continua', rodada: item.rodada||1, criadoEm: item.criadoEm||'', encerradoEm: today() });
    const newItem = { ...item, id: uid(), rodada: (item.rodada||1)+1, criadoEm: today(), prazo: '' };
    S[tipo] = S[tipo].filter(x => x.id !== id);
    S[tipo].push(newItem);
    persist(); renderPredio();
  });
}

function openAddPredi(tipo, initialNome) {
  const cfg = PREDI_CONFIGS[tipo];
  document.getElementById('add-predi-title').textContent = cfg.label;
  document.getElementById('add-predi-tipo').value = tipo;
  document.getElementById('add-predi-lbl').textContent = cfg.lbl;
  const nomeEl = document.getElementById('inp-predi-nome');
  nomeEl.value = initialNome || '';
  nomeEl.placeholder = PREDI_PLACEHOLDERS[tipo] || '';
  // desc field for ciclos/horizontes
  const descField = document.getElementById('predi-desc-field');
  descField.style.display = cfg.hasDesc ? 'block' : 'none';
  if (cfg.hasDesc) document.getElementById('inp-predi-desc-generic').value = '';
  document.getElementById('frente-extras').style.display = cfg.extras ? 'block' : 'none';
  document.getElementById('horizonte-extras').style.display = cfg.anoAlvo ? 'block' : 'none';
  if (cfg.extras) {
    document.getElementById('inp-predi-desc').value = '';
    document.getElementById('inp-predi-prazo').value = '';
  }
  if (cfg.anoAlvo) document.getElementById('inp-predi-ano').value = '';
  const pilarField = document.getElementById('predi-pilar-field');
  if (pilarField) {
    const showPilar = ['frentes','ciclos','horizontes'].includes(tipo);
    pilarField.style.display = showPilar ? 'block' : 'none';
    if (showPilar) populatePilarSelect('inp-predi-pilar');
  }
  openM('mbg-add-predi');
}

function removePredi(tipo, id) {
  const item = S[tipo].find(x => x.id === id);
  const nome = item ? (item.nome || item.texto || '') : '';
  showConfirm2(`Remover "${nome.slice(0,40)}"?`, 'Confirma? Esta ação é permanente e não pode ser desfeita.', () => {
    S[tipo] = S[tipo].filter(x => x.id !== id);
    persist(); renderPredio();
  });
}

function arquivarPilar(id) {
  showConfirm2('Arquivar esta área de foco?', 'Confirma? Ela ficará salva no Histórico.', () => {
    const item = S.pilares.find(x => x.id === id); if (!item) return;
    if (!S.pilares_arquivados) S.pilares_arquivados = [];
    S.pilares_arquivados.push({ ...item, arquivadoEm: today() });
    S.pilares = S.pilares.filter(x => x.id !== id);
    persist(); renderPredio();
  });
}

function openPrediDetail(tipo, id) {
  const item = S[tipo].find(x => x.id === id); if (!item) return;
  const nome = item.nome || item.texto || '';
  const tipoNomes = {frentes:'Ação',ciclos:'Trimestre',horizontes:'Metas de Longo Prazo',pilares:'Área de foco'};
  document.getElementById('detail-nome').textContent = nome;
  document.getElementById('detail-tipo-badge').innerHTML =
    `<span style="font-size:10px;color:var(--acc);background:var(--acc-d);border:1px solid var(--acc-g);border-radius:3px;padding:2px 8px;font-family:Georgia,serif">${tipoNomes[tipo]||tipo}</span>`;
  const descWrap = document.getElementById('detail-desc-wrap');
  if (item.descricao) {
    descWrap.style.display = 'block';
    document.getElementById('detail-desc').textContent = item.descricao;
  } else { descWrap.style.display = 'none'; }
  const prazoWrap = document.getElementById('detail-prazo-wrap');
  if ((tipo === 'frentes' || tipo === 'ciclos') && item.prazo) {
    prazoWrap.style.display = 'block';
    prazoWrap.innerHTML = buildPrazoBadge(item.prazo);
  } else if (tipo === 'horizontes' && item.anoAlvo) {
    prazoWrap.style.display = 'block';
    const anos = item.anoAlvo - new Date().getFullYear();
    prazoWrap.innerHTML = `<span class="countdown-tag">Alvo: ${item.anoAlvo} · Faltam ${anos} ano${anos!==1?'s':''}</span>`;
  } else { prazoWrap.style.display = 'none'; }
  document.getElementById('detail-criado').textContent =
    `Criado em ${fmtDate(item.criadoEm || '')}${item.rodada > 1 ? ` · ${item.rodada}ª rodada` : ''}`;
  openM('mbg-predi-detail');
}

function openEditPredi(tipo, id) {
  const item = S[tipo].find(x => x.id === id); if (!item) return;
  document.getElementById('edit-predi-tipo').value = tipo;
  document.getElementById('edit-predi-id').value   = id;
  document.getElementById('edit-predi-nome').value = item.nome || item.texto || '';
  // Descrição — só para frentes, ciclos, horizontes
  const hasDesc = ['frentes','ciclos','horizontes'].includes(tipo);
  const descWrap = document.getElementById('edit-predi-desc-wrap');
  descWrap.style.display = hasDesc ? 'block' : 'none';
  if (hasDesc) document.getElementById('edit-predi-desc').value = item.descricao || '';
  // Prazo — frentes e ciclos
  const prazoWrap = document.getElementById('edit-predi-prazo-wrap');
  prazoWrap.style.display = ['frentes','ciclos'].includes(tipo) ? 'block' : 'none';
  if (['frentes','ciclos'].includes(tipo)) document.getElementById('edit-predi-prazo').value = item.prazo || '';
  // Ano-alvo — horizontes
  const anoWrap = document.getElementById('edit-predi-ano-wrap');
  anoWrap.style.display = tipo === 'horizontes' ? 'block' : 'none';
  if (tipo === 'horizontes') document.getElementById('edit-predi-ano').value = item.anoAlvo || '';
  const ePilarWrap = document.getElementById('edit-predi-pilar-wrap');
  if (ePilarWrap) {
    const showPilar = ['frentes','ciclos','horizontes'].includes(tipo);
    ePilarWrap.style.display = showPilar ? 'block' : 'none';
    if (showPilar) {
      populatePilarSelect('edit-predi-pilar');
      const ePilarSel = document.getElementById('edit-predi-pilar');
      if (ePilarSel) ePilarSel.value = item.pilarId || '';
    }
  }
  openM('mbg-edit-predi');
}

/* ── Fechar meta ─────────────────────────────────────────── */
let cgTipo = null, cgId = null;

function openCloseGoal(tipo, id) {
  cgTipo = tipo; cgId = id;
  const item = S[tipo].find(x => x.id === id);
  const nome = item ? (item.nome || item.texto || '') : '';
  document.getElementById('cg-txt').textContent = nome;
  openM('mbg-close-goal');
}

function closeGoalConfirm(status) {
  const item = S[cgTipo].find(x => x.id === cgId);
  if (!item) return closeM('mbg-close-goal');
  const nome = item.nome || item.texto || '';

  showConfirm(`Marcar "${nome.slice(0,40)}" como ${status}?`, () => {
    // Move to historico
    S.historico.push({
      id: uid(), tipo: cgTipo, nome, statusFinal: status,
      rodada: item.rodada || 1, criadoEm: item.criadoEm || '', encerradoEm: today()
    });

    if (status === 'continua') {
      // Create new item
      const newItem = { ...item, id: uid(), rodada: (item.rodada || 1) + 1, criadoEm: today() };
      S[cgTipo].push(newItem);
    }

    // Remove original
    S[cgTipo] = S[cgTipo].filter(x => x.id !== cgId);
    persist(); closeM('mbg-close-goal'); renderPredio();
  });
  closeM('mbg-close-goal');
}

/* ═══════════════════════════════════════════════════════════