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
      divMensagem.innerText = 'Login aprovado! Entrando...';
      
      // Guarda o token e o nome no navegador
      localStorage.setItem('tokenAcademia', dados.token);
      localStorage.setItem('nomeUsuario', dados.user.name);

      // Redireciona com base no cargo (DONO ou CLIENTE)
      setTimeout(() => {
        if (dados.role === 'DONO') {
          window.location.href = 'painel-dono.html';
        } else {
          window.location.href = 'painel-cliente.html';
        }
      }, 1500);

    } else {
      divMensagem.style.color = '#ff4444';
      divMensagem.innerText = dados.error || 'Credenciais inválidas';
    }
  } catch (erro) {
    divMensagem.style.color = '#ff4444';
    divMensagem.innerText = 'Erro de conexão com o servidor.';
  }
});