// SEGURANÇA: Verifica o cargo
exigirLogin('CLIENTE');

const estado = {
  matriculas: [],     // matrículas do aluno logado (vindas do banco)
  academia: null,     // academia aberta na tela de planos
  plano: null,        // plano escolhido no modal de compra
  forma: 'PIX',
};

const el = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Navegação entre as telas
// ---------------------------------------------------------------------------

function mostrarView(nome) {
  ['explorar', 'academia', 'matriculas'].forEach((view) => {
    el(`view-${view}`).hidden = view !== nome;
  });
  document.querySelectorAll('.topbar-nav button').forEach((botao) => {
    const alvo = nome === 'academia' ? 'explorar' : nome;
    botao.classList.toggle('ativo', botao.dataset.view === alvo);
  });
  window.scrollTo(0, 0);
}

document.querySelectorAll('.topbar-nav button').forEach((botao) => {
  botao.addEventListener('click', () => {
    mostrarView(botao.dataset.view);
    if (botao.dataset.view === 'matriculas') carregarMatriculas();
  });
});

el('voltar-busca').addEventListener('click', () => mostrarView('explorar'));

// ---------------------------------------------------------------------------
// Busca de academias (dados reais do banco)
// ---------------------------------------------------------------------------

const inputBusca = el('input-busca-academia');
let buscaEmAndamento = null;
let esperaDigitacao = null;

function matriculaAtivaNa(academiaId) {
  return estado.matriculas.find((m) => m.donoId === academiaId && m.situacao === 'ATIVO');
}

// Destaca no texto as palavras que o aluno digitou
function destacar(texto, termo) {
  const palavras = termo.trim().split(/\s+/).filter(Boolean).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!palavras.length) return escaparHtml(texto);
  // Com o grupo de captura, o split devolve os trechos encontrados nas posições ímpares
  return String(texto ?? '').split(new RegExp(`(${palavras.join('|')})`, 'gi'))
    .map((trecho, i) => (i % 2 ? `<mark>${escaparHtml(trecho)}</mark>` : escaparHtml(trecho)))
    .join('');
}

function renderizarCardsAcademias(academias, termo) {
  const div = el('resultados-academias');
  const contagem = el('contagem-academias');

  if (academias.length === 0) {
    contagem.textContent = '';
    div.innerHTML = termo
      ? `<div class="empty">
           <i class="fa-solid fa-magnifying-glass"></i>
           <h3>Nenhum resultado para "${escaparHtml(termo)}"</h3>
           <p>Confira a grafia ou tente o nome de um plano.</p>
           <button class="btn btn-ghost btn-sm" data-acao="limpar">Ver todas as academias</button>
         </div>`
      : `<div class="empty">
           <i class="fa-solid fa-building"></i>
           <h3>Nenhuma academia cadastrada ainda</h3>
           <p>Assim que uma academia se cadastrar, ela aparece aqui.</p>
         </div>`;
    return;
  }

  const plural = academias.length === 1 ? 'academia' : 'academias';
  contagem.textContent = termo
    ? `${academias.length} ${plural} para "${termo}"`
    : `${academias.length} ${plural} cadastrada${academias.length === 1 ? '' : 's'}`;

  div.innerHTML = academias.map((acad) => {
    const nome = acad.name || 'Academia sem nome';
    const chips = acad.planos.slice(0, 3)
      .map((plano) => `<span class="badge">${destacar(plano.nome, termo)}</span>`).join('');
    const extras = acad.planos.length > 3 ? `<span class="badge">+${acad.planos.length - 3}</span>` : '';

    return `
      <article class="gym-card" data-academia="${escaparHtml(acad.id)}" tabindex="0" role="button" aria-label="Ver planos de ${escaparHtml(nome)}">
        <div class="gym-head">
          <div class="avatar">${escaparHtml(iniciais(nome))}</div>
          <div>
            <h3>${destacar(nome, termo)}</h3>
            <p>${destacar(acad.email, termo)}</p>
          </div>
          ${matriculaAtivaNa(acad.id) ? '<span class="badge badge-ok"><i class="fa-solid fa-check"></i> Matriculado</span>' : ''}
        </div>
        <div class="chips">${chips}${extras || (chips ? '' : '<span class="muted small">Ainda sem planos publicados</span>')}</div>
        <div class="gym-foot">
          <div>
            ${acad.menorPreco === null
              ? '<span>Planos</span><strong class="muted">—</strong>'
              : `<span>A partir de</span><strong>${moeda(acad.menorPreco)}</strong>`}
          </div>
          <span class="btn btn-primary btn-sm">Ver planos <i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </article>`;
  }).join('');
}

// Função que dispara quando o cliente digita na busca ou a página abre
async function carregarAcademias(termo = '') {
  const div = el('resultados-academias');

  // Cancela a busca anterior para a resposta antiga não sobrescrever a nova
  if (buscaEmAndamento) buscaEmAndamento.abort();
  buscaEmAndamento = new AbortController();

  el('contagem-academias').textContent = 'Buscando...';
  div.innerHTML = '<div class="skeleton gym"></div>'.repeat(3);

  try {
    const academiasDoBanco = await api(`/academias?busca=${encodeURIComponent(termo)}`, {
      signal: buscaEmAndamento.signal,
    });
    renderizarCardsAcademias(academiasDoBanco, termo);
  } catch (erro) {
    if (erro.name === 'AbortError') return;
    el('contagem-academias').textContent = '';
    div.innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-plug-circle-xmark"></i>
        <h3>Não foi possível carregar as academias</h3>
        <p>${escaparHtml(erro.message)}</p>
        <button class="btn btn-ghost btn-sm" data-acao="tentar">Tentar novamente</button>
      </div>`;
  }
}

// Vincula ao input de pesquisa do cliente em tempo real (espera o aluno parar de digitar)
inputBusca.addEventListener('input', () => {
  el('limpar-busca').hidden = !inputBusca.value;
  clearTimeout(esperaDigitacao);
  esperaDigitacao = setTimeout(() => carregarAcademias(inputBusca.value.trim()), 250);
});

function limparBusca() {
  inputBusca.value = '';
  el('limpar-busca').hidden = true;
  carregarAcademias();
  inputBusca.focus();
}

el('limpar-busca').addEventListener('click', limparBusca);

el('resultados-academias').addEventListener('click', (e) => {
  const acao = e.target.closest('[data-acao]');
  if (acao) {
    if (acao.dataset.acao === 'limpar') limparBusca();
    else carregarAcademias(inputBusca.value.trim());
    return;
  }
  const card = e.target.closest('[data-academia]');
  if (card) verPlanos(card.dataset.academia);
});

el('resultados-academias').addEventListener('keydown', (e) => {
  const card = e.target.closest('[data-academia]');
  if (card && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    verPlanos(card.dataset.academia);
  }
});

// ---------------------------------------------------------------------------
// Planos de uma academia
// ---------------------------------------------------------------------------

async function verPlanos(idAcademia) {
  mostrarView('academia');
  el('cabecalho-academia').innerHTML = '<div class="skeleton row" style="margin: 14px 0 28px;"></div>';
  el('aviso-matricula').innerHTML = '';
  el('grid-planos').innerHTML = '<div class="skeleton plan"></div>'.repeat(3);

  try {
    estado.academia = await api(`/academias/${encodeURIComponent(idAcademia)}`);
    renderizarAcademia();
  } catch (erro) {
    el('cabecalho-academia').innerHTML = '';
    el('grid-planos').innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Não foi possível carregar os planos</h3>
        <p>${escaparHtml(erro.message)}</p>
      </div>`;
  }
}

function renderizarAcademia() {
  const acad = estado.academia;
  const nome = acad.name || 'Academia sem nome';
  const matricula = matriculaAtivaNa(acad.id);

  el('cabecalho-academia').innerHTML = `
    <div class="gym-banner">
      <div class="avatar avatar-lg">${escaparHtml(iniciais(nome))}</div>
      <div>
        <h1>${escaparHtml(nome)}</h1>
        <div class="meta">
          <span><i class="fa-regular fa-envelope"></i>${escaparHtml(acad.email)}</span>
          <span><i class="fa-solid fa-tags"></i>${acad.totalPlanos} ${acad.totalPlanos === 1 ? 'plano' : 'planos'}</span>
          <span><i class="fa-solid fa-users"></i>${acad.alunosAtivos} ${acad.alunosAtivos === 1 ? 'aluno ativo' : 'alunos ativos'}</span>
        </div>
      </div>
    </div>`;

  el('aviso-matricula').innerHTML = matricula
    ? `<div class="notice">
         <i class="fa-solid fa-circle-check"></i>
         <span>Você já é aluno desta academia no plano <strong>${escaparHtml(matricula.plano.nome)}</strong>, válido até ${dataCurta(matricula.validade)}. Para trocar de plano, cancele a matrícula atual em "Minhas matrículas".</span>
       </div>`
    : '';

  if (acad.planos.length === 0) {
    el('grid-planos').innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-tags"></i>
        <h3>Esta academia ainda não publicou planos</h3>
        <p>Volte mais tarde ou escolha outra academia.</p>
      </div>`;
    return;
  }

  // O plano com menor custo por mês ganha destaque (só quando há o que comparar)
  const custoMensal = (plano) => plano.preco / plano.duracaoMeses;
  const menorCusto = Math.min(...acad.planos.map(custoMensal));
  const candidatos = acad.planos.filter((plano) => custoMensal(plano) === menorCusto);
  const destaqueId = acad.planos.length > 1 && candidatos.length === 1 ? candidatos[0].id : null;

  el('grid-planos').innerHTML = acad.planos.map((plano) => {
    const beneficios = listarBeneficios(plano.descricao);
    const ehAtual = matricula && matricula.planoId === plano.id;

    let botao = `<button class="btn btn-primary btn-block" data-assinar="${escaparHtml(plano.id)}">Assinar plano</button>`;
    if (ehAtual) botao = '<button class="btn btn-ghost btn-block" disabled><i class="fa-solid fa-check"></i> Seu plano atual</button>';
    else if (matricula) botao = '<button class="btn btn-ghost btn-block" disabled>Você já tem matrícula aqui</button>';

    return `
      <article class="plan-card ${plano.id === destaqueId ? 'destaque' : ''}">
        ${plano.id === destaqueId ? '<span class="plan-flag">Melhor custo por mês</span>' : ''}
        <div><span class="badge badge-info">${escaparHtml(rotuloDuracao(plano.duracaoMeses))}</span></div>
        <h3>${escaparHtml(plano.nome)}</h3>
        <div class="price"><strong>${moeda(plano.preco)}</strong><span>${sufixoPeriodo(plano.duracaoMeses)}</span></div>
        ${plano.duracaoMeses > 1 ? `<p class="muted small">equivale a ${moeda(custoMensal(plano))} por mês</p>` : ''}
        <ul class="benefits">
          ${beneficios.length
            ? beneficios.map((b) => `<li><i class="fa-solid fa-check"></i><span>${escaparHtml(b)}</span></li>`).join('')
            : '<li class="muted">Sem descrição informada.</li>'}
        </ul>
        ${botao}
      </article>`;
  }).join('');
}

el('grid-planos').addEventListener('click', (e) => {
  const botao = e.target.closest('[data-assinar]');
  if (!botao) return;
  const plano = estado.academia.planos.find((p) => p.id === botao.dataset.assinar);
  if (plano) abrirModal(plano);
});

// ---------------------------------------------------------------------------
// Compra do plano
// ---------------------------------------------------------------------------

function mostrarEtapa(etapa) {
  ['formulario', 'processando', 'sucesso'].forEach((nome) => {
    el(`etapa-${nome}`).hidden = nome !== etapa;
  });
}

function selecionarForma(forma) {
  estado.forma = forma;
  document.querySelectorAll('#formas-pagamento button').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.forma === forma);
  });
  ['PIX', 'CARTAO', 'BOLETO'].forEach((nome) => { el(`painel-${nome}`).hidden = nome !== forma; });
  el('erro-pagamento').textContent = '';
}

function abrirModal(plano) {
  estado.plano = plano;

  const validade = new Date();
  validade.setMonth(validade.getMonth() + plano.duracaoMeses);

  el('resumo-compra').innerHTML = `
    <div class="summary-row"><span>Academia</span><strong>${escaparHtml(estado.academia.name || 'Academia sem nome')}</strong></div>
    <div class="summary-row"><span>Plano</span><strong>${escaparHtml(plano.nome)} · ${escaparHtml(rotuloDuracao(plano.duracaoMeses))}</strong></div>
    <div class="summary-row"><span>Válido até</span><strong>${dataCurta(validade)}</strong></div>
    <div class="summary-row total"><span>Total</span><strong>${moeda(plano.preco)}</strong></div>`;

  el('form-pagamento').reset();
  selecionarForma('PIX');
  mostrarEtapa('formulario');
  el('modal-pagamento').hidden = false;
}

function fecharModal() {
  // Não deixa fechar no meio do processamento
  if (!el('etapa-processando').hidden) return;
  el('modal-pagamento').hidden = true;
  el('form-pagamento').reset();
}

el('formas-pagamento').addEventListener('click', (e) => {
  const botao = e.target.closest('[data-forma]');
  if (botao) selecionarForma(botao.dataset.forma);
});

el('fechar-modal').addEventListener('click', fecharModal);
el('sucesso-fechar').addEventListener('click', fecharModal);
el('sucesso-ver').addEventListener('click', () => {
  fecharModal();
  mostrarView('matriculas');
  carregarMatriculas();
});
el('modal-pagamento').addEventListener('click', (e) => { if (e.target === el('modal-pagamento')) fecharModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el('modal-pagamento').hidden) fecharModal(); });

// Máscaras dos campos do cartão
el('cartao-numero').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
});
el('cartao-validade').addEventListener('input', (e) => {
  const digitos = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
});
el('cartao-cvv').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});

// Confere o preenchimento do cartão. Retorna a mensagem de erro ou '' se estiver tudo certo.
function validarCartao() {
  if (el('cartao-nome').value.trim().length < 3) return 'Informe o nome impresso no cartão.';
  if (el('cartao-numero').value.replace(/\D/g, '').length < 13) return 'Número do cartão incompleto.';

  const [mes, ano] = el('cartao-validade').value.split('/').map(Number);
  if (!mes || mes > 12 || ano === undefined || el('cartao-validade').value.length < 5) return 'Validade inválida. Use MM/AA.';
  const fimDoMes = new Date(2000 + ano, mes, 1);
  if (fimDoMes <= new Date()) return 'Este cartão está vencido.';

  if (el('cartao-cvv').value.length < 3) return 'CVV inválido.';
  return '';
}

el('form-pagamento').addEventListener('submit', async (e) => {
  e.preventDefault();

  const erroCartao = estado.forma === 'CARTAO' ? validarCartao() : '';
  if (erroCartao) {
    el('erro-pagamento').textContent = erroCartao;
    return;
  }

  mostrarEtapa('processando');

  try {
    // Só o plano e a forma de pagamento vão para o servidor: os dados do cartão ficam no navegador
    const [{ matricula }] = await Promise.all([
      api('/matriculas', { method: 'POST', body: { planoId: estado.plano.id, formaPagamento: estado.forma } }),
      new Promise((resolver) => setTimeout(resolver, 1200)),
    ]);

    estado.matriculas.unshift(matricula);
    el('texto-sucesso').textContent =
      `Você está matriculado em ${matricula.dono.name || 'sua academia'} no plano ${matricula.plano.nome}, válido até ${dataCurta(matricula.validade)}.`;
    mostrarEtapa('sucesso');
    estado.academia.alunosAtivos += 1;
    renderizarAcademia();
    carregarAcademias(inputBusca.value.trim());
  } catch (erro) {
    mostrarEtapa('formulario');
    el('erro-pagamento').textContent = erro.message;
  }
});

// ---------------------------------------------------------------------------
// Minhas matrículas
// ---------------------------------------------------------------------------

async function buscarMatriculas() {
  estado.matriculas = await api('/matriculas/minhas');
}

function renderizarMatriculas() {
  const lista = el('lista-matriculas');

  if (estado.matriculas.length === 0) {
    lista.innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-id-card"></i>
        <h3>Você ainda não tem matrículas</h3>
        <p>Encontre uma academia e assine um plano para começar.</p>
        <button class="btn btn-primary btn-sm" data-acao="explorar">Explorar academias</button>
      </div>`;
    return;
  }

  lista.innerHTML = estado.matriculas.map((m) => {
    const academia = m.dono.name || 'Academia sem nome';
    const acao = m.situacao === 'ATIVO'
      ? `<button class="btn btn-danger btn-sm" data-cancelar="${escaparHtml(m.id)}">Cancelar</button>`
      : `<button class="btn btn-ghost btn-sm" data-abrir="${escaparHtml(m.dono.id)}">Ver planos</button>`;

    return `
      <article class="list-item">
        <div class="avatar">${escaparHtml(iniciais(academia))}</div>
        <div class="info">
          <h3>${escaparHtml(academia)} · ${escaparHtml(m.plano.nome)}</h3>
          <div class="meta">
            <span><i class="fa-regular fa-calendar"></i>Início ${dataCurta(m.data)}</span>
            <span><i class="fa-regular fa-calendar-check"></i>Válida até ${dataCurta(m.validade)}</span>
            ${m.valor != null ? `<span><i class="fa-solid fa-receipt"></i>${moeda(m.valor)}${m.formaPagamento ? ` via ${escaparHtml(FORMAS_PAGAMENTO[m.formaPagamento] || m.formaPagamento)}` : ''}</span>` : ''}
          </div>
        </div>
        <div class="actions">${seloSituacao(m.situacao)}${acao}</div>
      </article>`;
  }).join('');
}

async function carregarMatriculas() {
  el('lista-matriculas').innerHTML = '<div class="skeleton row"></div>'.repeat(2);
  try {
    await buscarMatriculas();
    renderizarMatriculas();
  } catch (erro) {
    el('lista-matriculas').innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Não foi possível carregar suas matrículas</h3>
        <p>${escaparHtml(erro.message)}</p>
      </div>`;
  }
}

el('lista-matriculas').addEventListener('click', async (e) => {
  if (e.target.closest('[data-acao="explorar"]')) {
    mostrarView('explorar');
    return;
  }

  const abrir = e.target.closest('[data-abrir]');
  if (abrir) {
    verPlanos(abrir.dataset.abrir);
    return;
  }

  const cancelar = e.target.closest('[data-cancelar]');
  if (!cancelar) return;

  const confirmou = await confirmar({
    titulo: 'Cancelar matrícula?',
    texto: 'Você perde o acesso a esta academia. Esta ação não pode ser desfeita.',
    botao: 'Cancelar matrícula',
    perigo: true,
  });
  if (!confirmou) return;

  try {
    await api(`/matriculas/${encodeURIComponent(cancelar.dataset.cancelar)}/cancelar`, { method: 'PATCH' });
    toast('Matrícula cancelada.');
    carregarMatriculas();
    carregarAcademias(inputBusca.value.trim());
  } catch (erro) {
    toast(erro.message, 'erro');
  }
});

// ---------------------------------------------------------------------------
// Início: carrega as matrículas (para marcar onde o aluno já está) e as academias do banco
// ---------------------------------------------------------------------------

buscarMatriculas()
  .catch(() => { /* a busca funciona mesmo sem as matrículas */ })
  .finally(() => carregarAcademias());
