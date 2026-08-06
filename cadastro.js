document.getElementById('formCadastro').addEventListener('submit', async (evento) => {
  evento.preventDefault(); // Evita que a página recarregue

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('senha').value;
  const tipoConta = document.getElementById('tipoConta').value;
  const divMensagem = document.getElementById('mensagem');

  try {
    // Envia os dados para o seu Backend
    const resposta = await fetch('http://localhost:3000/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email, password, role: tipoConta })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      divMensagem.style.color = '#00ff64';
      divMensagem.innerText = 'Cadastro realizado com sucesso!';
      
      // Aguarda 2 segundos e redireciona para a página de login
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000); 
    } else {
      divMensagem.style.color = '#ff4444';
      divMensagem.innerText = dados.error || 'Erro ao cadastrar';
    }
  } catch (erro) {
    divMensagem.style.color = '#ff4444';
    divMensagem.innerText = 'Erro de conexão com o servidor.';
  }
});