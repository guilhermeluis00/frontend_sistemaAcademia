// SEGURANÇA: Verifica o cargo (Donos e Supers podem acessar)
exigirLogin('DONO', 'SUPER');

const el = (id) => document.getElementById(id);

let planos = [];
let alunos = [];
let planoEmEdicao = null; // id do plano sendo editado (null = criando um novo)

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

function atualizarIndicadores() {
  const ativos = alunos.filter((m) => m.situacao === 'ATIVO');

  el('stat-planos').textContent = planos.filter((p) => p.ativo).length;
  el('stat-alunos').textContent = ativos.length;
  el('stat-receita').textContent = moeda(ativos.reduce((total, m) => total + (m.valor || 0), 0));
}

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

function renderizarPlanos() {
  const lista = el('lista-planos');

  if (planos.length === 0) {
    lista.innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-tags"></i>
        <h3>Nenhum plano cadastrado</h3>
        <p>Crie o primeiro plano ao lado para sua academia aparecer com preço na busca dos alunos.</p>
      </div>`;
    return;
  }

  lista.innerHTML = planos.map((plano) => {
    const beneficios = listarBeneficios(plano.descricao);
    const id = escaparHtml(plano.id);

    return `
      <article class="plan-card ${plano.ativo ? '' : 'inativo'}">
        <div class="chips">
          <span class="badge badge-info">${escaparHtml(rotuloDuracao(plano.duracaoMeses))}</span>
          ${plano.ativo ? '<span class="badge badge-ok">Na vitrine</span>' : '<span class="badge">Desativado</span>'}
        </div>
        <h3>${escaparHtml(plano.nome)}</h3>
        <div class="price"><strong>${moeda(plano.preco)}</strong><span>${sufixoPeriodo(plano.duracaoMeses)}</span></div>
        <p class="muted small"><i class="fa-solid fa-users"></i> ${plano.alunosAtivos} ${plano.alunosAtivos === 1 ? 'aluno ativo' : 'alunos ativos'}</p>
        <ul class="benefits">
          ${beneficios.length
            ? beneficios.map((b) => `<li><i class="fa-solid fa-check"></i><span>${escaparHtml(b)}</span></li>`).join('')
            : '<li class="muted">Sem descrição informada.</li>'}
        </ul>
        <div class="plan-actions">
          <button class="btn btn-ghost btn-sm" data-editar="${id}"><i class="fa-solid fa-pen"></i> Editar</button>
          <button class="btn btn-ghost btn-sm" data-alternar="${id}">${plano.ativo ? 'Desativar' : 'Reativar'}</button>
          <button class="btn btn-danger btn-sm btn-icon" data-excluir="${id}" aria-label="Excluir plano" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`;
  }).join('');
}

async function carregarPlanos() {
  try {
    planos = await api('/planos/meus');
    renderizarPlanos();
    atualizarIndicadores();
  } catch (erro) {
    el('lista-planos').innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Não foi possível carregar os planos</h3>
        <p>${escaparHtml(erro.message)}</p>
      </div>`;
  }
}

function sairDaEdicao() {
  planoEmEdicao = null;
  el('form-plano').reset();
  el('titulo-form').innerHTML = '<i class="fa-solid fa-tag"></i> Criar novo plano';
  el('botao-salvar').textContent = 'Cadastrar plano';
  el('cancelar-edicao').hidden = true;
}

function editarPlano(plano) {
  planoEmEdicao = plano.id;
  el('nome').value = plano.nome;
  el('preco').value = plano.preco;
  el('descricao').value = plano.descricao || '';

  // Duração fora das opções padrão (ex: 2 meses) entra como opção extra
  const seletor = el('duracao');
  if (![...seletor.options].some((opcao) => Number(opcao.value) === plano.duracaoMeses)) {
    seletor.add(new Option(rotuloDuracao(plano.duracaoMeses), plano.duracaoMeses));
  }
  seletor.value = plano.duracaoMeses;

  el('titulo-form').innerHTML = '<i class="fa-solid fa-pen"></i> Editar plano';
  el('botao-salvar').textContent = 'Salvar alterações';
  el('cancelar-edicao').hidden = false;
  el('mensagem').textContent = '';
  el('form-plano').scrollIntoView({ behavior: 'smooth', block: 'center' });
  el('nome').focus({ preventScroll: true });
}

el('cancelar-edicao').addEventListener('click', sairDaEdicao);

el('form-plano').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgDiv = el('mensagem');
  const botao = el('botao-salvar');

  const dados = {
    nome: el('nome').value,
    preco: el('preco').value,
    duracaoMeses: Number(el('duracao').value),
    descricao: el('descricao').value,
  };

  botao.disabled = true;
  msgDiv.className = 'form-msg';
  msgDiv.textContent = '';

  try {
    if (planoEmEdicao) {
      await api(`/planos/${encodeURIComponent(planoEmEdicao)}`, { method: 'PUT', body: dados });
      toast('Plano atualizado com sucesso!');
    } else {
      await api('/planos', { method: 'POST', body: dados });
      toast('Plano cadastrado com sucesso!');
    }
    sairDaEdicao();
    await carregarPlanos();
  } catch (erro) {
    msgDiv.className = 'form-msg erro';
    msgDiv.textContent = erro.message;
  }

  botao.disabled = false;
});

el('lista-planos').addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-editar], [data-alternar], [data-excluir]');
  if (!botao) return;

  const id = botao.dataset.editar || botao.dataset.alternar || botao.dataset.excluir;
  const plano = planos.find((p) => p.id === id);
  if (!plano) return;

  if (botao.dataset.editar) {
    editarPlano(plano);
    return;
  }

  try {
    if (botao.dataset.alternar) {
      await api(`/planos/${encodeURIComponent(id)}`, { method: 'PUT', body: { ativo: !plano.ativo } });
      toast(plano.ativo ? 'Plano desativado: ele saiu da vitrine.' : 'Plano reativado: ele voltou para a vitrine.');
    } else {
      const confirmou = await confirmar({
        titulo: `Excluir "${plano.nome}"?`,
        texto: 'Se o plano já tiver matrículas, ele será apenas desativado para preservar o histórico dos alunos.',
        botao: 'Excluir plano',
        perigo: true,
      });
      if (!confirmou) return;

      const resposta = await api(`/planos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast(resposta.message);
      if (planoEmEdicao === id) sairDaEdicao();
    }
    await carregarPlanos();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
});

// ---------------------------------------------------------------------------
// Alunos matriculados
// ---------------------------------------------------------------------------

function renderizarAlunos() {
  const tbody = el('tabela-alunos');

  if (alunos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum aluno matriculado ainda.</td></tr>';
    return;
  }

  tbody.innerHTML = alunos.map((m) => {
    const nome = m.cliente.nome || 'Sem nome';
    return `
      <tr>
        <td>
          <div class="who">
            <div class="avatar avatar-sm">${escaparHtml(iniciais(nome))}</div>
            <div><strong>${escaparHtml(nome)}</strong><div class="muted small">${escaparHtml(m.cliente.email)}</div></div>
          </div>
        </td>
        <td>${escaparHtml(m.plano.nome)}</td>
        <td>${m.valor != null ? moeda(m.valor) : '—'}</td>
        <td>${escaparHtml(FORMAS_PAGAMENTO[m.formaPagamento] || m.formaPagamento || '—')}</td>
        <td>${dataCurta(m.data)}</td>
        <td>${dataCurta(m.validade)}</td>
        <td>${seloSituacao(m.situacao)}</td>
      </tr>`;
  }).join('');
}

async function carregarAlunos() {
  try {
    alunos = await api('/matriculas/alunos');
    renderizarAlunos();
    atualizarIndicadores();
  } catch (erro) {
    el('tabela-alunos').innerHTML = `<tr><td colspan="7" class="empty">${escaparHtml(erro.message)}</td></tr>`;
  }
}

el('lista-planos').innerHTML = '<div class="skeleton plan"></div>'.repeat(2);
carregarPlanos();
carregarAlunos();
