// Para donos, o "nome" é o nome da academia (é ele que aparece na busca dos alunos)
document.querySelectorAll('input[name="tipoConta"]').forEach((opcao) => {
  opcao.addEventListener('change', () => {
    document.getElementById('rotulo-nome').innerText =
      opcao.value === 'DONO' ? 'Nome da academia' : 'Nome completo';
  });
});

document.getElementById('formCadastro').addEventListener('submit', async (evento) => {
  evento.preventDefault(); // Evita que a página recarregue

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('senha').value;
  const tipoConta = document.querySelector('input[name="tipoConta"]:checked').value;
  const divMensagem = document.getElementById('mensagem');
  const botao = evento.target.querySelector('button[type="submit"]');

  botao.disabled = true;
  botao.innerText = 'Cadastrando...';
  divMensagem.className = 'form-msg';
  divMensagem.innerText = '';

  try {
    // Envia os dados para o seu Backend
    const resposta = await fetch('http://localhost:3000/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email, password, role: tipoConta })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      divMensagem.className = 'form-msg ok';
      divMensagem.innerText = 'Cadastro realizado com sucesso!';

      // Aguarda um instante e redireciona para a página de login
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
      return;
    }

    divMensagem.className = 'form-msg erro';
    divMensagem.innerText = dados.error || 'Erro ao cadastrar';
  } catch (erro) {
    divMensagem.className = 'form-msg erro';
    divMensagem.innerText = 'Erro de conexão com o servidor.';
  }

  botao.disabled = false;
  botao.innerText = 'Cadastrar';
});
