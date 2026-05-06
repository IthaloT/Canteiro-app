/* ── SYNC COM SHEETS ────────────────────────────────────────── */
let syncTimer2 = null;
function scheduleSync() {
  clearTimeout(syncTimer2);
  syncTimer2 = setTimeout(doSync, 4000);
}

function isStateEmpty(state) {
  if (!state) return true;
  const totalItems =
    (state.habitos||[]).length +
    (state.inbox||[]).length +
    (state.tarefas||[]).length +
    (state.vicios||[]).length +
    (state.historico||[]).length +
    (state.pilares||[]).length +
    (state.horizontes||[]).length +
    (state.ciclos||[]).length +
    (state.frentes||[]).length +
    (state.ideias||[]).length;
  const temMissao = (state.fundacao||{}).missao;
  return totalItems === 0 && !temMissao;
}

async function doSync() {
  const url = S.settings.scriptUrl;
  if (!url || !navigator.onLine) return;
  if (isStateEmpty(S)) { setSyncStatus('ok', 'Sync protegida'); return; }
  setSyncStatus('syncing', 'Sincronizando...');
  try {
    S.meta.ultimaSync = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(S));
    // Apps Script: no-cors evita bloqueio de CORS no browser
    // O dado chega normalmente ao servidor mesmo sem ler a resposta
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ data: S })
    });
    setSyncStatus('ok', fmt(S.meta.ultimaSync));
  } catch (e) {
    setSyncStatus('err', 'Erro na sync');
  }
}

async function triggerSync() {
  clearTimeout(syncTimer2);
  await doSync();
}

/* ═══════════════════════════════════════════════════════════
   PULL INTELIGENTE — recebe dados mais recentes da nuvem
   Roda: ao abrir o app + ao voltar para o app
═══════════════════════════════════════════════════════════ */
let lastPullAt = 0;
const PULL_MIN_GAP = 30 * 1000; // mínimo 30s entre pulls

async function pullFromCloud() {
  const url = S.settings.scriptUrl;
  if (!url || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastPullAt < PULL_MIN_GAP) return;
  lastPullAt = now;

  try {
    const res = await fetch(url + '?t=' + now, { mode: 'cors', redirect: 'follow' });
    if (!res.ok) return;
    const remote = await res.json();
    if (!remote.success || !remote.data) return;

    const remoteSync = (remote.data.meta || {}).ultimaSync || '';
    const localSync  = (S.meta || {}).ultimaSync || '';

    // Se o usuário zerou intencionalmente, só aceita dados da nuvem
    // posteriores ao momento do zero (significa que outro dispositivo editou depois)
    const zeroedAt = localStorage.getItem('canteiro_zeroed') || '';
    if (zeroedAt && remoteSync <= zeroedAt) return;

    // Só atualiza se a nuvem tiver dados mais recentes que o local
    if (remoteSync && remoteSync > localSync) {
      const localSettings = S.settings;
      S = { ...blank(), ...remote.data, settings: localSettings };
      if (!S.fundacao.historico) S.fundacao.historico = [];
      if (!S.pilares_arquivados) S.pilares_arquivados = [];
      if (!S.habitosArquivados)  S.habitosArquivados  = [];
      localStorage.setItem(KEY, JSON.stringify(S));
      renderAll();
      setSyncStatus('ok', fmt(S.meta.ultimaSync));
      showToast('↓ Dados atualizados da nuvem', 2500);
    }
  } catch (e) {
    // Pull silencioso — não exibe erro para não incomodar
  }
}

function schedulePull() {
  // Mantido para compatibilidade — pull agora só acontece ao abrir/focar
}

// ↑ Enviar para a nuvem (manual, com feedback visual no botão)
async function syncSendToCloud() {
  const url = S.settings.scriptUrl;
  if (!url) return showToast('Configure a URL da nuvem primeiro.');
  if (!navigator.onLine) return showToast('Sem conexão. Conecte-se à internet e tente novamente.');
  const btn = document.getElementById('btn-send-cloud');
  setSyncBtnState(btn, 'loading', '↑ Enviando...');
  try {
    S.meta.ultimaSync = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(S));
    const res = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ data: S })
    });
    // no-cors retorna opaque response — consideramos sucesso se não lançou exceção
    setSyncBtnState(btn, 'success', '✓ Enviado com sucesso');
    setSyncStatus('ok', fmt(S.meta.ultimaSync));
    setTimeout(() => setSyncBtnState(btn, '', '↑ Enviar para a nuvem'), 3000);
  } catch(e) {
    setSyncBtnState(btn, 'error', '✗ Erro ao enviar');
    setSyncStatus('err', 'Erro na sync');
    setTimeout(() => setSyncBtnState(btn, '', '↑ Enviar para a nuvem'), 3000);
  }
}

// ↓ Baixar da nuvem (manual, com confirmação e feedback visual)
async function syncGetFromCloud() {
  const url = S.settings.scriptUrl;
  if (!url) return showToast('Configure a URL da nuvem primeiro.');
  if (!navigator.onLine) return showToast('Sem conexão. Conecte-se à internet e tente novamente.');
  showConfirm('Baixar dados da nuvem? Os dados atuais deste dispositivo serão substituídos.', async () => {
    const btn = document.getElementById('btn-get-cloud');
    setSyncBtnState(btn, 'loading', '↓ Baixando...');
    try {
      const res = await fetch(url + '?t=' + Date.now(), { mode: 'cors', redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const remote = await res.json();
      if (remote.success && remote.data) {
        const localSettings = S.settings;
        S = { ...blank(), ...remote.data, settings: localSettings };
        if (!S.fundacao.historico) S.fundacao.historico = [];
        if (!S.pilares_arquivados) S.pilares_arquivados = [];
        localStorage.setItem(KEY, JSON.stringify(S));
        renderAll();
        setSyncBtnState(btn, 'success', '✓ Dados carregados');
        setSyncStatus('ok', 'Baixado da nuvem');
        setTimeout(() => setSyncBtnState(btn, '', '↓ Baixar da nuvem'), 3000);
      } else throw new Error('Resposta inválida');
    } catch(e) {
      setSyncBtnState(btn, 'error', '✗ Erro ao baixar');
      setSyncStatus('err', 'Erro ao baixar');
      setTimeout(() => setSyncBtnState(btn, '', '↓ Baixar da nuvem'), 3000);
    }
  });
}

function setSyncBtnState(btn, state, label) {
  if (!btn) return;
  btn.className = 'sync-action-btn' + (state ? ' ' + state : '');
  btn.textContent = label;
  btn.disabled = state === 'loading';
}

// Restaura dados da nuvem — alias para compatibilidade
async function restoreFromSheets() {
  await syncGetFromCloud();
}

function setSyncStatus(state, label) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-lbl');
  if (dot) dot.className = 'sync-dot ' + state;
  if (lbl) lbl.textContent = label || '';
  const si = document.getElementById('sync-info');
  const hasUrl = S.settings.scriptUrl;
  if (si) {
    si.textContent = hasUrl
      ? 'Última sync: ' + (S.meta.ultimaSync ? fmt(S.meta.ultimaSync) : 'Nunca')
      : 'Nuvem não configurada.';
  }
  // Show/hide retry button on error
  const retryBtn = document.getElementById('sync-retry-btn');
  if (retryBtn) retryBtn.style.display = (state === 'err' && hasUrl) ? 'inline-block' : 'none';
  // Atualiza indicador no header da seção nuvem
  const cfgStatus = document.getElementById('cfg-nuvem-status');
  if (cfgStatus) {
    cfgStatus.textContent = hasUrl ? '🟢 Configurada' : '⚪ Não configurada';
    cfgStatus.className = 'cfg-section-status' + (hasUrl ? ' ok' : '');
  }
}

/* ═══════════════════════════════════════════════════════════