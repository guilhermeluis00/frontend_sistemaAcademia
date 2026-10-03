document.getElementById('formLogin').addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('senha').value;
  const divMensagem = document.getElementById('mensagem');
  const botao = evento.target.querySelector('button[type="submit"]');

  botao.disabled = true;
  botao.innerText = 'Entrando...';
  divMensagem.className = 'form-msg';
  divMensagem.innerText = '';

  try {
    const resposta = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const dados = await resposta.json();

    if (resposta.ok) {
      divMensagem.className = 'form-msg ok';
      divMensagem.innerText = 'Login aprovado! Entrando...';

      // 🌟 Salva o token, o cargo (role) e o nome no navegador
      localStorage.setItem('token', dados.token);
      localStorage.setItem('role', dados.role);
      localStorage.setItem('nomeUsuario', dados.user.name || '');

      // 🌟 Redireciona corretamente com base no cargo (SUPER, DONO ou CLIENTE)
      setTimeout(() => {
        if (dados.role === 'SUPER') {
          window.location.href = 'painel-super.html';
        } else if (dados.role === 'DONO') {
          window.location.href = 'painel-dono.html';
        } else {
          window.location.href = 'painel-cliente.html';
        }
      }, 600);
      return;
    }

    divMensagem.className = 'form-msg erro';
    divMensagem.innerText = dados.error || 'Credenciais inválidas';
  } catch (erro) {
    divMensagem.className = 'form-msg erro';
    divMensagem.innerText = 'Erro de conexão com o servidor.';
  }

  botao.disabled = false;
  botao.innerText = 'Entrar';
});
