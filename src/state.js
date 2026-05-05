/* ═══════════════════════════════════════════════════════════
   ESTADO & STORAGE
═══════════════════════════════════════════════════════════ */
const KEY = 'canteiro_v2';

function blank() {
  return {
    meta: { ultimaSync: null },
    settings: { scriptUrl: '' },
    fundacao: { missao: '', historico: [] },
    pilares: [], pilares_arquivados: [],
    horizontes: [], ciclos: [], frentes: [],
    habitos: [], habitosArquivados: [],
    inbox: [], tarefas: [],
    ideias: [], tagIdeias: [],
    vicios: [], descarte: [], historico: [],
    contratos: [], desafios: []
  };
}

let S = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || blank(); } catch { return blank(); } })();

let saveTimer = null;
function debSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 500); }

function persist() {
  localStorage.setItem(KEY, JSON.stringify(S));
  showToast('Salvo ✓');
  scheduleSync();
}

/* ═══════════════════════════════════════════════════════════