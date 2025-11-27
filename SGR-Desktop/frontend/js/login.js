// login.js - Lógica de autenticação e redirecionamento

const API_BASE_URL = 'http://localhost:5000/api';

// Variáveis globais para elementos do DOM (serão inicializadas após DOMContentLoaded)
let loginForm;
let loginBtn;
let btnText;
let loadingSpinner;
let errorMessage;
let errorText;
let emailInput;
let passwordInput;

// Função para exibir erro
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// Função para mostrar/esconder loading
function setLoading(isLoading) {
    if (isLoading) {
        btnText.textContent = 'Entrando...';
        loadingSpinner.classList.remove('hidden');
        loginBtn.disabled = true;
        loginBtn.classList.add('opacity-75');
    } else {
        btnText.textContent = 'Entrar';
        loadingSpinner.classList.add('hidden');
        loginBtn.disabled = false;
        loginBtn.classList.remove('opacity-75');
    }
}

// Função para validar entrada
function validateInput(input) {
    if (input.validity.valid) {
        input.classList.remove('invalid');
        input.classList.add('valid');
    } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
    }
}

// Função de autenticação
async function handleLogin(email, senha) {
    try {
        const response = await fetch(`${API_BASE_URL}/restaurantes/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Armazenar ID do restaurante no localStorage
            const restauranteId = data.data?.restaurante_id;
            const restauranteNome = data.data?.restaurante_nome;
            
            // Extrair imagem do restaurante (tentar diferentes formatos)
            const restauranteImagem = data.data?.imagemUrl || 
                                     data.data?.imagem_url || 
                                     data.data?.logoUrl || 
                                     data.data?.logo_url ||
                                     data.data?.fotoUrl ||
                                     data.data?.foto_url ||
                                     data.imagemUrl ||
                                     data.imagem_url ||
                                     data.logoUrl ||
                                     data.logo_url;
            
            // Se não tem ID, tentar buscar via API adicional
            if (!restauranteId) {
                console.warn('⚠️ restaurante_id não encontrado na resposta, tentando buscar...');
                try {
                    // Tentar buscar informações do restaurante logado
                    const perfilResponse = await fetch(`${API_BASE_URL}/restaurantes/perfil`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (perfilResponse.ok) {
                        const perfilData = await perfilResponse.json();
                        if (perfilData.data?.restaurante_id) {
                            const nome = perfilData.data.restaurante_nome || restauranteNome || 'Restaurante';
                            const imagem = perfilData.data.imagemUrl || 
                                         perfilData.data.imagem_url || 
                                         perfilData.data.logoUrl || 
                                         restauranteImagem;
                            
                            localStorage.setItem('restaurante_id', perfilData.data.restaurante_id);
                            localStorage.setItem('restaurante_nome', nome);
                            if (imagem) {
                                localStorage.setItem('restaurante_imagem', imagem);
                            }
                            localStorage.setItem('authenticated', 'true');
                            setTimeout(() => {
                                window.location.href = '../index.html';
                            }, 100);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Erro ao buscar perfil:', e);
                }
                
                // Se não conseguiu buscar, mostrar erro
                showError('Login realizado, mas não foi possível obter informações do restaurante. Tente novamente.');
                setLoading(false);
                return;
            }
            
            localStorage.setItem('restaurante_id', restauranteId);
            localStorage.setItem('restaurante_nome', restauranteNome || 'Restaurante');
            if (restauranteImagem) {
                localStorage.setItem('restaurante_imagem', restauranteImagem);
            }
            localStorage.setItem('authenticated', 'true');
            
            
            // Aguardar um pouco para garantir que o localStorage foi atualizado
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 100);
        } else {
            showError(data.message || 'Erro ao realizar login. Verifique suas credenciais.');
            setLoading(false);
        }
    } catch (error) {
        showError('Erro de conexão com o servidor. Tente novamente.');
        setLoading(false);
    }
}

// Inicializar todos os elementos e event listeners quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializar elementos do DOM
    loginForm = document.getElementById('loginForm');
    loginBtn = document.getElementById('loginBtn');
    btnText = document.getElementById('btnText');
    loadingSpinner = document.getElementById('loadingSpinner');
    errorMessage = document.getElementById('errorMessage');
    errorText = document.getElementById('errorText');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    
    
    // Configurar event listener do formulário
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = emailInput.value.trim();
            const senha = passwordInput.value;
            
            // Validar campos
            if (!email || !senha) {
                showError('Por favor, preencha todos os campos.');
                return;
            }
            
            
            // Mostrar loading
            setLoading(true);
            
            // Realizar login
            await handleLogin(email, senha);
        });
    } else {
        console.error('❌ Formulário de login não encontrado!');
    }
    
    // Validação em tempo real dos campos
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            validateInput(emailInput);
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            validateInput(passwordInput);
        });
    }
    
    // Auto-focus no primeiro campo
    if (emailInput) {
        emailInput.focus();
        console.log('✅ Auto-focus no campo de email');
    }
    
    console.log('✅ Login inicializado com sucesso!');
});

// Função para lidar com cadastro (redireciona para página de cadastro externo)
function handleSignup() {
    /**
     * 🔥 IMPORTANTE: Altere esta URL para o seu sistema de cadastro!
     * 
     * Opções:
     * 1. Redirecionar para um site externo: window.open('https://seu-site.com/cadastro', '_blank');
     * 2. Redirecionar para uma página local: window.location.href = '../paginas/cadastro.html';
     * 3. Mostrar um modal de cadastro: mostrarModalCadastro();
     * 4. Abrir sistema web: window.open('https://sistema-sabore.com/restaurante/cadastro', '_blank');
     */
    
    // Atualmente: Redireciona para o sistema web de cadastro de restaurantes
    alert('🔗 Redirecionando para o sistema de cadastro...\n\nPor favor, cadastre seu restaurante no sistema web e retorne para fazer login.');
    window.open('https://sistema-sabore.com/restaurante/cadastro', '_blank');
}
