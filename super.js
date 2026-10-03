// SEGURANÇA: Verifica o cargo
exigirLogin('SUPER');

const tbody = document.getElementById('tabela-usuarios');
const filtro = document.getElementById('filtro-usuarios');
let usuarios = [];

document.getElementById('saudacao').textContent = `Bem-vindo, ${sessao.nome || 'Administrador'}`;

function renderizarUsuarios() {
  const termo = filtro.value.trim().toLowerCase();
  const visiveis = usuarios.filter((user) =>
    `${user.name || ''} ${user.email}`.toLowerCase().includes(termo)
  );

  if (visiveis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${termo ? 'Nenhuma conta corresponde ao filtro.' : 'Nenhuma conta cadastrada.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = visiveis.map((user) => {
    const nome = user.name || 'Sem nome';
    return `
      <tr>
        <td>
          <div class="who">
            <div class="avatar avatar-sm">${escaparHtml(iniciais(nome))}</div>
            <div><strong>${escaparHtml(nome)}</strong><div class="muted small">${escaparHtml(user.email)}</div></div>
          </div>
        </td>
        <td>${user.is_super_admin ? '<span class="badge badge-ok">SUPER</span>' : '<span class="badge badge-info">DONO</span>'}</td>
        <td>${user.totalPlanos}</td>
        <td>${user.totalMatriculas}</td>
        <td>${dataCurta(user.created_at)}</td>
        <td>${user.is_super_admin ? '—' : `<button class="btn btn-danger btn-sm" data-excluir="${escaparHtml(user.id)}"><i class="fa-solid fa-trash"></i> Excluir</button>`}</td>
      </tr>`;
  }).join('');
}

async function carregarUsuarios() {
  try {
    usuarios = await api('/super/users');

    const donos = usuarios.filter((user) => !user.is_super_admin);
    document.getElementById('stat-donos').textContent = donos.length;
    document.getElementById('stat-planos').textContent = usuarios.reduce((total, user) => total + user.totalPlanos, 0);
    document.getElementById('stat-matriculas').textContent = usuarios.reduce((total, user) => total + user.totalMatriculas, 0);

    renderizarUsuarios();
  } catch (erro) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">${escaparHtml(erro.message)}</td></tr>`;
  }
}

filtro.addEventListener('input', renderizarUsuarios);

tbody.addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-excluir]');
  if (!botao) return;

  const user = usuarios.find((u) => u.id === botao.dataset.excluir);
  const confirmou = await confirmar({
    titulo: `Excluir ${user?.name || 'esta conta'}?`,
    texto: 'A conta e os planos desta academia serão removidos. Esta ação não pode ser desfeita.',
    botao: 'Excluir conta',
    perigo: true,
  });
  if (!confirmou) return;

  try {
    await api(`/super/users/${encodeURIComponent(botao.dataset.excluir)}`, { method: 'DELETE' });
    toast('Conta excluída.');
    carregarUsuarios();
  } catch (erro) {
    toast(erro.message, 'erro');
  }
});

carregarUsuarios();
