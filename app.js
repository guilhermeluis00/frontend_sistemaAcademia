// Funções compartilhadas por todos os painéis (sessão, chamadas à API, formatação e avisos)

const API_URL = 'http://localhost:3000';

const sessao = {
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  nome: localStorage.getItem('nomeUsuario') || '',
};

function sair() {
  localStorage.clear();
  window.location.replace('index.html');
}

// SEGURANÇA: só deixa a página abrir para os cargos informados
function exigirLogin(...cargos) {
  const tokenValido = sessao.token && sessao.token !== 'null' && sessao.token !== 'undefined';

  if (!tokenValido || !cargos.includes(sessao.role)) {
    localStorage.clear();
    window.location.replace('index.html');
    throw new Error('Acesso negado.');
  }
}

// Chamada à API já com o token. Lança um Error com a mensagem vinda do servidor.
async function api(caminho, { method = 'GET', body, signal } = {}) {
  let resposta;

  try {
    resposta = await fetch(API_URL + caminho, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(sessao.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') throw erro;
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }

  const dados = await resposta.json().catch(() => ({}));

  if (resposta.status === 401 && sessao.token) {
    sair();
  }
  if (!resposta.ok) {
    throw new Error(dados.error || 'Algo deu errado. Tente novamente.');
  }

  return dados;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function moeda(valor) {
  return formatoMoeda.format(Number(valor) || 0);
}

function dataCurta(data) {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '—';
}

function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '?') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

const DURACOES = { 1: 'Mensal', 3: 'Trimestral', 6: 'Semestral', 12: 'Anual' };

function rotuloDuracao(meses) {
  return DURACOES[meses] || `${meses} meses`;
}

function sufixoPeriodo(meses) {
  if (meses === 1) return '/ mês';
  if (meses === 12) return '/ ano';
  return `/ ${meses} meses`;
}

// A descrição do plano vira lista de benefícios (um por linha ou separados por ;)
function listarBeneficios(descricao) {
  return String(descricao || '').split(/[\n;]+/).map((item) => item.trim()).filter(Boolean);
}

const SITUACOES = {
  ATIVO: { rotulo: 'Ativa', classe: 'badge-ok' },
  PENDENTE: { rotulo: 'Pendente', classe: 'badge-warn' },
  EXPIRADO: { rotulo: 'Expirada', classe: 'badge-warn' },
  CANCELADO: { rotulo: 'Cancelada', classe: 'badge-danger' },
};

function seloSituacao(situacao) {
  const { rotulo, classe } = SITUACOES[situacao] || { rotulo: situacao, classe: '' };
  return `<span class="badge ${classe}">${escaparHtml(rotulo)}</span>`;
}

const FORMAS_PAGAMENTO = { PIX: 'Pix', CARTAO: 'Cartão de crédito', BOLETO: 'Boleto' };

function toast(mensagem, tipo = 'ok') {
  let area = document.querySelector('.toasts');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toasts';
    area.setAttribute('role', 'status');
    document.body.appendChild(area);
  }

  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo === 'erro' ? 'erro' : ''}`;
  aviso.innerHTML = `<i class="fa-solid ${tipo === 'erro' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${escaparHtml(mensagem)}</span>`;
  area.appendChild(aviso);
  setTimeout(() => aviso.remove(), 4500);
}

// Substitui o confirm() do navegador. Resolve true se o usuário confirmar.
function confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${escaparHtml(titulo)}</h3></div>
        <p class="muted">${escaparHtml(texto)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-resposta="nao">Voltar</button>
          <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-resposta="sim">${escaparHtml(botao)}</button>
        </div>
      </div>`;

    const fechar = (resposta) => {
      document.removeEventListener('keydown', aoTeclar);
      modal.remove();
      resolver(resposta);
    };
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar(false); };

    modal.addEventListener('click', (e) => {
      const botaoClicado = e.target.closest('[data-resposta]');
      if (botaoClicado) fechar(botaoClicado.dataset.resposta === 'sim');
      else if (e.target === modal) fechar(false);
    });
    document.addEventListener('keydown', aoTeclar);

    document.body.appendChild(modal);
    modal.querySelector('[data-resposta="sim"]').focus();
  });
}

// Preenche o nome do usuário e liga o botão "Sair" da barra superior
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-usuario-nome]').forEach((el) => { el.textContent = sessao.nome; });
  document.querySelectorAll('[data-usuario-iniciais]').forEach((el) => { el.textContent = iniciais(sessao.nome); });
  document.querySelectorAll('[data-sair]').forEach((el) => el.addEventListener('click', sair));
});
