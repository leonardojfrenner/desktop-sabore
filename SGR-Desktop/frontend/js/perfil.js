// perfil.js - Funcionalidades específicas da página de Perfil

window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';
window.restaurante_id = parseInt(localStorage.getItem('restaurante_id'), 10);

var restauranteData = null;
var logoSelecionada = null;
var bannerSelecionado = null;
var cardapioSelecionado = null;
var logoUrlAtual = null;
var bannerUrlAtual = null;
var cardapioUrlAtual = null;

// Função para mostrar mensagens de status
function showStatus(message, type = 'success') {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message status-${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Função para carregar dados do restaurante
async function carregarDadosRestaurante() {
    try {
        if (!window.restaurante_id || isNaN(window.restaurante_id)) {
            throw new Error('ID do restaurante inválido. Faça login novamente.');
        }
        
        showStatus('Carregando dados do perfil...', 'loading');
        
        // Tentar buscar pelo endpoint de perfil primeiro
        let response = await fetch(`${window.API_BASE_URL}/restaurantes/perfil`, {
            method: 'GET',
            credentials: 'include', // Envia cookies de sessão
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Se perfil não funcionar, buscar por ID
            console.log('⚠️ Perfil não disponível, buscando por ID...');
            response = await fetch(`${window.API_BASE_URL}/restaurantes/${window.restaurante_id}`, {
                method: 'GET',
                credentials: 'include', // Envia cookies de sessão
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extrair dados do restaurante
        if (data.status === 'success' && data.data) {
            restauranteData = data.data;
        } else if (data.id) {
            restauranteData = data;
        } else {
            throw new Error('Formato de resposta inválido');
        }
        
        preencherFormulario(restauranteData);
        showStatus('Dados carregados com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao carregar dados do restaurante:', error);
        showStatus(`Erro ao carregar dados: ${error.message}`, 'error');
    }
}

// Função para preencher o formulário com os dados
function preencherFormulario(dados) {
    // Informações básicas
    document.getElementById('nomeRestaurante').value = dados.nome || '';
    document.getElementById('cnpjRestaurante').value = dados.cnpj || '';
    document.getElementById('telefoneRestaurante').value = dados.telefone || '';
    document.getElementById('emailRestaurante').value = dados.email || '';
    
    // Endereço
    document.getElementById('ruaRestaurante').value = dados.rua || '';
    document.getElementById('numeroRestaurante').value = dados.numero || '';
    document.getElementById('bairroRestaurante').value = dados.bairro || '';
    document.getElementById('cidadeRestaurante').value = dados.cidade || '';
    document.getElementById('estadoRestaurante').value = dados.estado || '';
    document.getElementById('cepRestaurante').value = dados.cep || '';
    
    // Descrição e informações
    document.getElementById('descricaoRestaurante').value = dados.descricao || '';
    document.getElementById('horarioRestaurante').value = dados.horario || '';
    document.getElementById('lotacaoRestaurante').value = dados.lotacao || '';
    
    // Redes sociais
    document.getElementById('siteRestaurante').value = dados.site || '';
    document.getElementById('facebookRestaurante').value = dados.facebook || '';
    document.getElementById('instagramRestaurante').value = dados.instagram || '';
    document.getElementById('whatsappRestaurante').value = dados.whatsapp || '';
    
    // Imagens
    if (dados.logoUrl) {
        logoUrlAtual = dados.logoUrl;
        document.getElementById('logoUrlInput').value = dados.logoUrl;
        mostrarPreview('logoPreview', dados.logoUrl);
    }
    
    if (dados.bannerUrl) {
        bannerUrlAtual = dados.bannerUrl;
        document.getElementById('bannerUrlInput').value = dados.bannerUrl;
        mostrarPreview('bannerPreview', dados.bannerUrl);
    }
    
    // Cardápio PDF
    if (dados.cardapioUrl) {
        cardapioUrlAtual = dados.cardapioUrl;
        document.getElementById('cardapioUrlInput').value = dados.cardapioUrl;
        mostrarPreviewCardapio(dados.cardapioUrl);
    }
    
    // Termos de aceite (somente leitura)
    document.getElementById('aceitaComunicacao').checked = dados.aceitaComunicacao || false;
    document.getElementById('aceitaMarketing').checked = dados.aceitaMarketing || false;
    document.getElementById('aceitaProtecaoDados').checked = dados.aceitaProtecaoDados || false;
}

// Função para obter dados do formulário
function obterDadosFormulario() {
    const dados = {
        nome: document.getElementById('nomeRestaurante').value.trim(),
        telefone: document.getElementById('telefoneRestaurante').value.trim() || null,
        email: document.getElementById('emailRestaurante').value.trim(),
        rua: document.getElementById('ruaRestaurante').value.trim() || null,
        numero: document.getElementById('numeroRestaurante').value ? parseInt(document.getElementById('numeroRestaurante').value) : null,
        bairro: document.getElementById('bairroRestaurante').value.trim() || null,
        cidade: document.getElementById('cidadeRestaurante').value.trim() || null,
        estado: document.getElementById('estadoRestaurante').value.trim() || null,
        cep: document.getElementById('cepRestaurante').value.trim() || null,
        descricao: document.getElementById('descricaoRestaurante').value.trim() || null,
        horario: document.getElementById('horarioRestaurante').value.trim() || null,
        lotacao: document.getElementById('lotacaoRestaurante').value ? parseInt(document.getElementById('lotacaoRestaurante').value) : null,
        site: document.getElementById('siteRestaurante').value.trim() || null,
        facebook: document.getElementById('facebookRestaurante').value.trim() || null,
        instagram: document.getElementById('instagramRestaurante').value.trim() || null,
        whatsapp: document.getElementById('whatsappRestaurante').value.trim() || null,
    };
    
    // Adicionar URLs de imagem se houver
    const logoUrl = document.getElementById('logoUrlInput').value.trim();
    const bannerUrl = document.getElementById('bannerUrlInput').value.trim();
    const cardapioUrl = document.getElementById('cardapioUrlInput').value.trim();
    
    if (logoUrl) {
        dados.logoUrl = logoUrl;
    } else if (logoUrlAtual) {
        dados.logoUrl = logoUrlAtual;
    }
    
    if (bannerUrl) {
        dados.bannerUrl = bannerUrl;
    } else if (bannerUrlAtual) {
        dados.bannerUrl = bannerUrlAtual;
    }
    
    if (cardapioUrl) {
        dados.cardapioUrl = cardapioUrl;
    } else if (cardapioUrlAtual) {
        dados.cardapioUrl = cardapioUrlAtual;
    }
    
    // Verificar se deseja alterar senha
    const senhaAtual = document.getElementById('senhaAtual').value.trim();
    const novaSenha = document.getElementById('novaSenha').value.trim();
    const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
    
    if (novaSenha) {
        if (!senhaAtual) {
            throw new Error('É necessário informar a senha atual para alterar a senha');
        }
        if (novaSenha !== confirmarSenha) {
            throw new Error('As senhas não coincidem');
        }
        if (novaSenha.length < 6) {
            throw new Error('A nova senha deve ter pelo menos 6 caracteres');
        }
        dados.senha = novaSenha;
    }
    
    return dados;
}

// Função para validar formulário
function validarFormulario(dados) {
    if (!dados.nome || dados.nome.trim() === '') {
        showStatus('Nome do restaurante é obrigatório', 'error');
        return false;
    }
    
    if (!dados.email || dados.email.trim() === '') {
        showStatus('E-mail é obrigatório', 'error');
        return false;
    }
    
    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dados.email)) {
        showStatus('E-mail inválido', 'error');
        return false;
    }
    
    return true;
}

// Função para fazer upload de imagem ou PDF
async function fazerUploadImagem(arquivo, tipo) {
    if (!arquivo) {
        return null;
    }
    
    try {
        const tipoArquivo = arquivo.type === 'application/pdf' ? 'PDF' : tipo;
        showStatus(`Fazendo upload do ${tipoArquivo}...`, 'loading');
        
        const formData = new FormData();
        formData.append('file', arquivo);
        
        const response = await fetch(`${window.API_BASE_URL}/restaurantes/upload/${tipo}`, {
            method: 'POST',
            credentials: 'include', // Importante: envia cookies de sessão para autenticação
            body: formData
            // Não definir Content-Type manualmente - o browser define automaticamente com boundary para FormData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
            throw new Error(errorData.message || `Erro no upload: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.url) {
            showStatus(`${tipoArquivo} enviado com sucesso!`, 'success');
            return data.url;
        } else {
            throw new Error('Erro ao fazer upload do arquivo');
        }
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        showStatus(`Erro ao fazer upload: ${error.message}`, 'error');
        throw error;
    }
}

// Função para salvar alterações
async function salvarAlteracoes() {
    try {
        const dados = obterDadosFormulario();
        
        if (!validarFormulario(dados)) {
            return;
        }
        
        // Se houver arquivos selecionados, fazer upload primeiro
        if (logoSelecionada) {
            const urlLogo = await fazerUploadImagem(logoSelecionada, 'logo');
            dados.logoUrl = urlLogo;
        }
        
        if (bannerSelecionado) {
            const urlBanner = await fazerUploadImagem(bannerSelecionado, 'banner');
            dados.bannerUrl = urlBanner;
        }
        
        if (cardapioSelecionado) {
            const urlCardapio = await fazerUploadImagem(cardapioSelecionado, 'cardapio');
            dados.cardapioUrl = urlCardapio;
        }
        
        showStatus('Salvando alterações...', 'loading');
        
        const response = await fetch(`${window.API_BASE_URL}/restaurantes/${window.restaurante_id}`, {
            method: 'PUT',
            credentials: 'include', // Envia cookies de sessão
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
            throw new Error(errorData.message || `Erro ao salvar: ${response.status}`);
        }
        
        const data = await response.json();
        
        showStatus('Perfil atualizado com sucesso!', 'success');
        
        // Atualizar nome do restaurante na sidebar se foi alterado
        if (dados.nome) {
            const nomeElement = document.getElementById('restauranteNome');
            if (nomeElement) {
                nomeElement.textContent = dados.nome;
            }
            localStorage.setItem('restaurante_nome', dados.nome);
        }
        
        // Recarregar dados para garantir sincronização
        setTimeout(() => {
            carregarDadosRestaurante();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        showStatus(`Erro ao salvar: ${error.message}`, 'error');
    }
}

// Funções para gerenciar preview de imagens
function mostrarPreview(previewId, url) {
    const previewContainer = document.getElementById(previewId);
    const previewImg = document.getElementById(previewId + 'Img');
    if (previewContainer && previewImg) {
        previewImg.src = url;
        previewContainer.style.display = 'block';
    }
}

function esconderPreview(previewId) {
    const previewContainer = document.getElementById(previewId);
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

// Função para mostrar preview do PDF do cardápio
function mostrarPreviewCardapio(url) {
    const previewContainer = document.getElementById('cardapioPreview');
    const previewLink = document.getElementById('cardapioPreviewLink');
    if (previewContainer && previewLink) {
        previewLink.href = url;
        previewLink.target = '_blank';
        previewLink.rel = 'noopener noreferrer';
        previewContainer.style.display = 'block';
    }
}

function esconderPreviewCardapio() {
    const previewContainer = document.getElementById('cardapioPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

// Função para inicializar a página de perfil
function inicializarPerfil() {
    console.log('[PERFIL] Inicializando página de perfil...');
    
    // Event listeners para upload de imagens
    const logoInput = document.getElementById('logoRestaurante');
    const bannerInput = document.getElementById('bannerRestaurante');
    const cardapioInput = document.getElementById('cardapioRestaurante');
    const removerLogoBtn = document.getElementById('removerLogo');
    const removerBannerBtn = document.getElementById('removerBanner');
    const removerCardapioBtn = document.getElementById('removerCardapio');
    const logoUrlInput = document.getElementById('logoUrlInput');
    const bannerUrlInput = document.getElementById('bannerUrlInput');
    const cardapioUrlInput = document.getElementById('cardapioUrlInput');
    
    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                if (!arquivo.type.startsWith('image/')) {
                    showStatus('Por favor, selecione um arquivo de imagem válido', 'error');
                    e.target.value = '';
                    return;
                }
                
                if (arquivo.size > 5 * 1024 * 1024) {
                    showStatus('A imagem deve ter no máximo 5MB', 'error');
                    e.target.value = '';
                    return;
                }
                
                logoSelecionada = arquivo;
                logoUrlAtual = null;
                logoUrlInput.value = '';
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    mostrarPreview('logoPreview', e.target.result);
                };
                reader.readAsDataURL(arquivo);
            }
        });
    }
    
    if (bannerInput) {
        bannerInput.addEventListener('change', function(e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                if (!arquivo.type.startsWith('image/')) {
                    showStatus('Por favor, selecione um arquivo de imagem válido', 'error');
                    e.target.value = '';
                    return;
                }
                
                if (arquivo.size > 5 * 1024 * 1024) {
                    showStatus('A imagem deve ter no máximo 5MB', 'error');
                    e.target.value = '';
                    return;
                }
                
                bannerSelecionado = arquivo;
                bannerUrlAtual = null;
                bannerUrlInput.value = '';
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    mostrarPreview('bannerPreview', e.target.result);
                };
                reader.readAsDataURL(arquivo);
            }
        });
    }
    
    if (removerLogoBtn) {
        removerLogoBtn.addEventListener('click', function() {
            logoSelecionada = null;
            logoUrlAtual = null;
            if (logoInput) logoInput.value = '';
            if (logoUrlInput) logoUrlInput.value = '';
            esconderPreview('logoPreview');
        });
    }
    
    if (removerBannerBtn) {
        removerBannerBtn.addEventListener('click', function() {
            bannerSelecionado = null;
            bannerUrlAtual = null;
            if (bannerInput) bannerInput.value = '';
            if (bannerUrlInput) bannerUrlInput.value = '';
            esconderPreview('bannerPreview');
        });
    }
    
    if (logoUrlInput) {
        logoUrlInput.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                logoUrlAtual = url;
                logoSelecionada = null;
                if (logoInput) logoInput.value = '';
                mostrarPreview('logoPreview', url);
            } else {
                logoUrlAtual = null;
                esconderPreview('logoPreview');
            }
        });
    }
    
    if (bannerUrlInput) {
        bannerUrlInput.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                bannerUrlAtual = url;
                bannerSelecionado = null;
                if (bannerInput) bannerInput.value = '';
                mostrarPreview('bannerPreview', url);
            } else {
                bannerUrlAtual = null;
                esconderPreview('bannerPreview');
            }
        });
    }
    
    // Event listeners para upload de PDF do cardápio
    if (cardapioInput) {
        cardapioInput.addEventListener('change', function(e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                if (arquivo.type !== 'application/pdf') {
                    showStatus('Por favor, selecione um arquivo PDF válido', 'error');
                    e.target.value = '';
                    return;
                }
                
                if (arquivo.size > 10 * 1024 * 1024) {
                    showStatus('O PDF deve ter no máximo 10MB', 'error');
                    e.target.value = '';
                    return;
                }
                
                cardapioSelecionado = arquivo;
                cardapioUrlAtual = null;
                cardapioUrlInput.value = '';
                
                // Mostrar preview com link para download
                const url = URL.createObjectURL(arquivo);
                mostrarPreviewCardapio(url);
            }
        });
    }
    
    if (removerCardapioBtn) {
        removerCardapioBtn.addEventListener('click', function() {
            cardapioSelecionado = null;
            cardapioUrlAtual = null;
            if (cardapioInput) cardapioInput.value = '';
            if (cardapioUrlInput) cardapioUrlInput.value = '';
            esconderPreviewCardapio();
        });
    }
    
    if (cardapioUrlInput) {
        cardapioUrlInput.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                cardapioUrlAtual = url;
                cardapioSelecionado = null;
                if (cardapioInput) cardapioInput.value = '';
                mostrarPreviewCardapio(url);
            } else {
                cardapioUrlAtual = null;
                esconderPreviewCardapio();
            }
        });
    }
    
    // Botões de ação
    const btnSalvar = document.getElementById('btnSalvar');
    const btnCancelar = document.getElementById('btnCancelar');
    
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarAlteracoes);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.')) {
                carregarDadosRestaurante();
            }
        });
    }
    
    // Carregar dados do restaurante
    carregarDadosRestaurante();
}

// Expor função globalmente
window.inicializarPerfil = inicializarPerfil;

