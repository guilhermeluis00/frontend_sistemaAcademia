document.getElementById('formLogin').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('senha').value;
  const divMensagem = document.getElementById('mensagem');

  try {
    const resposta = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      divMensagem.style.color = '#00ff64';
      divMensagem.innerText = 'Login aprovado!';
      
      // Guarda o token no navegador para validar que o usuário está logado
      localStorage.setItem('tokenAcademia', dados.token);
      
      // Futuramente, você vai descomentar a linha abaixo para enviar para o painel
      // window.location.href = 'painel.html';
    } else {
      divMensagem.style.color = '#ff4444';
      divMensagem.innerText = dados.error || 'Credenciais inválidas';
    }
  } catch (erro) {
    divMensagem.style.color = '#ff4444';
    divMensagem.innerText = 'Erro de conexão com o servidor.';
  }
});