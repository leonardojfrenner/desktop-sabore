// cardapio.js - Funcionalidades específicas da página de Cardápio

window.API_BASE_URL = 'http://localhost:5000/api';
window.restauranteIdStringCardapio = localStorage.getItem('restaurante_id');
window.restaurante_id = parseInt(window.restauranteIdStringCardapio, 10);

if (!window.restaurante_id || isNaN(window.restaurante_id)) {
    console.error('ID do restaurante inválido no cardápio!');
    alert('Erro: Sessão inválida. Redirecionando para login...');
    window.location.href = '../paginas/login.html';
}

var dishes = [];
var selectedDishes = new Set();
var currentEditId = null;
var imagemSelecionada = null; // Armazena o arquivo de imagem selecionado
var imagemUrlAtual = null; // Armazena a URL da imagem (se for URL ou após upload)

function abrirModal(modo = 'novo', itemId = null) {
    const modal = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('pratoForm');
    
    // Limpar formulário e variáveis de imagem
    form.reset();
    imagemSelecionada = null;
    imagemUrlAtual = null;
    esconderPreview();
    
    if (modo === 'novo') {
        modalTitle.textContent = 'Novo Prato';
        currentEditId = null;
    } else if (modo === 'editar' && itemId) {
        modalTitle.textContent = 'Editar Prato';
        currentEditId = itemId;
        
        // Preencher formulário com dados do item
        const prato = dishes.find(d => d.id == itemId);
        if (prato) {
            document.getElementById('nomePrato').value = prato.nome;
            document.getElementById('descricaoPrato').value = prato.descricao || '';
            document.getElementById('precoPrato').value = prato.preco;
            
            // Normalizar categoria para garantir que o select mostre o valor correto
            const categoriaNormalizada = normalizarCategoriaParaCodigo(prato.categoria || 'OUTROS');
            document.getElementById('categoriaPrato').value = categoriaNormalizada;
            
            // Se tiver imagem, mostrar preview
            if (prato.imagemUrl) {
                imagemUrlAtual = prato.imagemUrl;
                document.getElementById('imagemUrlInput').value = prato.imagemUrl;
                mostrarPreview(prato.imagemUrl);
            }
        }
    }
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

function fecharModal() {
    const modal = document.getElementById('modalForm');
    modal.classList.add('hidden');
    currentEditId = null;
    imagemSelecionada = null;
    imagemUrlAtual = null;
    esconderPreview();
}

function obterDadosFormulario() {
    // Priorizar URL se houver, senão usar imagem selecionada
    const imagemUrl = document.getElementById('imagemUrlInput').value.trim();
    
    // Normalizar categoria para garantir que está em UPPERCASE_SNAKE_CASE
    const categoriaRaw = document.getElementById('categoriaPrato').value.trim();
    const categoriaNormalizada = normalizarCategoriaParaCodigo(categoriaRaw);
    
    return {
        nome: document.getElementById('nomePrato').value.trim(),
        descricao: document.getElementById('descricaoPrato').value.trim(),
        preco: parseFloat(document.getElementById('precoPrato').value),
        categoria: categoriaNormalizada, // Sempre salvar em UPPERCASE_SNAKE_CASE
        imagemUrl: imagemUrl || imagemUrlAtual || null
    };
}

function validarFormulario(dados) {
    if (!dados.nome) {
        showStatus('Nome do prato é obrigatório', 'error');
        return false;
    }
    
    if (!dados.categoria) {
        showStatus('Categoria é obrigatória', 'error');
        return false;
    }
    
    if (isNaN(dados.preco) || dados.preco <= 0) {
        showStatus('Preço deve ser um valor válido maior que zero', 'error');
        return false;
    }
    
    return true;
}

function getSelectedItemId() {
    // Retorna o ID do item que está com a checkbox marcada
    const checkedBoxes = document.querySelectorAll('input[name="item_select"]:checked');
    
    if (checkedBoxes.length === 1) {
        return checkedBoxes[0].value; // Retorna o ID (que deve ser o valor da checkbox)
    }
    return null; 
}

function updateButtonStates() {
    const selectedCount = document.querySelectorAll('input[name="item_select"]:checked').length;
    const btnEditar = document.getElementById('btnEditar');
    const btnRemover = document.getElementById('btnRemover');
    
    // Regra: Editar SÓ pode se houver 1 item selecionado
    btnEditar.disabled = (selectedCount !== 1);
    btnEditar.className = `btn-edit bg-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center space-x-2 ${btnEditar.disabled ? 'opacity-50 cursor-not-allowed' : 'transition-colors hover:bg-blue-600'}`;
    
    // Regra: Deletar pode se houver 1 ou mais itens selecionados
    btnRemover.disabled = (selectedCount === 0);
    btnRemover.className = `btn-remove border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg flex items-center space-x-2 ${btnRemover.disabled ? 'opacity-50 cursor-not-allowed' : 'transition-colors hover:bg-red-50'}`;
}

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

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}

// 4. CARREGAR TABELA (Conexão ao GET do Flask)
async function carregarTabela() {
    try {
        showStatus('Carregando cardápio...', 'loading');
        
        const response = await fetch(`${window.API_BASE_URL}/cardapio/${window.restaurante_id}`);
        const cardapioData = await response.json();
        
        if (cardapioData.status === 'success') {
            const dadosCardapio = cardapioData.data || [];
            
            if (dadosCardapio.length === 0) {
                showStatus('Cardápio carregado. Adicione seu primeiro prato!', 'info');
                dishes = [];
                renderTable([]);
            } else {
                dishes = dadosCardapio.filter(item => {
                    if (!item || !item.id || !item.nome) {
                        return false;
                    }
                    const itemRestId = item.restaurante_id || (item.restaurante && item.restaurante.id);
                    if (itemRestId && itemRestId !== window.restaurante_id) {
                        return false;
                    }
                    return true;
                });
                
                renderTable(dishes);
                showStatus(`Cardápio carregado: ${dishes.length} pratos`, 'success');
            }
            
            
        } else {
            throw new Error(cardapioData.message || 'Erro ao carregar cardápio');
        }
        
    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        showStatus(`Erro ao carregar cardápio: ${error.message}`, 'error');
        dishes = [];
        renderTable([]);
        updateButtonStates();
        atualizarKPIs();
    }
    
    updateButtonStates(); // Atualiza o estado dos botões após carregar a tabela
}

// Função para renderizar a tabela com nova estrutura
function renderTable(filteredDishes = dishes) {
    const tbody = document.getElementById('dishesTable');
    
    // Verificar se elemento existe
    if (!tbody) {
        console.error('ERRO: Elemento dishesTable não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Se não há pratos, mostrar mensagem de estado vazio
    if (!filteredDishes || filteredDishes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <svg class="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                        <h3 class="text-lg font-semibold text-gray-700 mb-2">Cardápio Vazio</h3>
                        <p class="text-sm text-gray-500 mb-4">Seu restaurante ainda não possui pratos cadastrados.</p>
                        <button onclick="abrirModalAdicionar()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            Adicionar Primeiro Prato
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filteredDishes.forEach(dish => {
        const isSelected = selectedDishes.has(dish.id);
        
        // Emoji baseado no nome do prato
        const emoji = obterEmojiPrato(dish.nome);
        
        // Formatar categoria para exibição
        const categoriaFormatada = formatarCategoria(dish.categoria || 'Outros');

        const row = document.createElement('tr');
        row.className = isSelected ? 'bg-blue-50' : 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="checkbox" name="item_select" class="dish-checkbox rounded border-gray-300" 
                       value="${dish.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">${dish.id}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${emoji} ${dish.nome}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${categoriaFormatada}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-500 descricao-cell" title="${(dish.descricao || '-').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">${dish.descricao || '-'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-medium text-gray-900">R$ ${dish.preco.toFixed(2).replace('.', ',')}</span>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Adicionar event listeners para checkboxes
    document.querySelectorAll('input[name="item_select"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const dishId = parseInt(this.value);
            if (this.checked) {
                selectedDishes.add(dishId);
            } else {
                selectedDishes.delete(dishId);
            }
            updateButtonStates();
            renderTable(filteredDishes);
        });
    });
}

// Função auxiliar para converter para Title Case (primeira letra de cada palavra maiúscula)
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(palavra => 
        palavra.charAt(0).toUpperCase() + palavra.slice(1)
    ).join(' ');
}

// Função para formatar categoria para exibição (Title Case -> Formato Amigável)
function formatarCategoria(categoria) {
    if (!categoria) return 'Outros';
    
    // Mapeamento: valor salvo (Title Case) -> formato de exibição
    const categorias = {
        'Entrada': 'Entrada',
        'Prato Principal': 'Prato Principal',
        'Sobremesa': 'Sobremesa',
        'Bebida': 'Bebida',
        'Lanche': 'Lanche',
        'Salada': 'Salada',
        'Acompanhamento': 'Acompanhamento',
        'Outros': 'Outros',
        // Compatibilidade com formato antigo (minúsculas)
        'entrada': 'Entrada',
        'prato principal': 'Prato Principal',
        'sobremesa': 'Sobremesa',
        'bebida': 'Bebida',
        'lanche': 'Lanche',
        'salada': 'Salada',
        'acompanhamento': 'Acompanhamento',
        'outros': 'Outros',
        // Compatibilidade com formato antigo (UPPERCASE_SNAKE_CASE)
        'ENTRADA': 'Entrada',
        'PRATO_PRINCIPAL': 'Prato Principal',
        'SOBREMESA': 'Sobremesa',
        'BEBIDA': 'Bebida',
        'LANCHE': 'Lanche',
        'SALADA': 'Salada',
        'ACOMPANHAMENTO': 'Acompanhamento',
        'OUTROS': 'Outros'
    };
    
    // Tenta encontrar no mapeamento
    if (categorias[categoria]) {
        return categorias[categoria];
    }
    
    // Se não encontrou, tenta normalizar primeiro
    const categoriaNormalizada = normalizarCategoriaParaCodigo(categoria);
    if (categorias[categoriaNormalizada]) {
        return categorias[categoriaNormalizada];
    }
    
    // Se ainda não encontrou, capitaliza a primeira letra de cada palavra
    return toTitleCase(categoria);
}

// Função para normalizar categoria para código (qualquer formato -> Title Case sem snake case)
function normalizarCategoriaParaCodigo(categoria) {
    if (!categoria) return 'Outros';
    
    const categoriaLower = categoria.toLowerCase().trim();
    
    // Mapeamento: aceita vários formatos e converte para Title Case
    const mapeamento = {
        'entrada': 'Entrada',
        'prato principal': 'Prato Principal',
        'prato_principal': 'Prato Principal', // Compatibilidade com snake case
        'sobremesa': 'Sobremesa',
        'bebida': 'Bebida',
        'lanche': 'Lanche',
        'salada': 'Salada',
        'acompanhamento': 'Acompanhamento',
        'outros': 'Outros'
    };
    
    // Se já está no formato correto (Title Case), verifica se é válido
    const categoriaTitleCase = toTitleCase(categoria);
    if (categoria === categoriaTitleCase && !categoria.includes('_')) {
        if (mapeamento[categoriaLower]) {
            return mapeamento[categoriaLower];
        }
        // Se não está no mapeamento mas está em Title Case, retorna como está
        return categoriaTitleCase;
    }
    
    // Se está em UPPERCASE_SNAKE_CASE, converte para Title Case
    if (categoria === categoria.toUpperCase() && categoria.includes('_')) {
        const convertido = toTitleCase(categoriaLower.replace(/_/g, ' '));
        if (mapeamento[categoriaLower]) {
            return mapeamento[categoriaLower];
        }
        return convertido; // Retorna convertido mesmo se não estiver no mapeamento
    }
    
    // Se tem underscore, remove e converte para Title Case
    if (categoriaLower.includes('_')) {
        const convertido = toTitleCase(categoriaLower.replace(/_/g, ' '));
        if (mapeamento[categoriaLower]) {
            return mapeamento[categoriaLower];
        }
        return convertido;
    }
    
    // Tenta encontrar no mapeamento
    if (mapeamento[categoriaLower]) {
        return mapeamento[categoriaLower];
    }
    
    // Se não encontrou, retorna em Title Case como padrão
    return toTitleCase(categoriaLower) || 'Outros';
}

// Função para obter emoji baseado no nome do prato
function obterEmojiPrato(nome) {
    const nomeLower = nome.toLowerCase();
    
    if (nomeLower.includes('hambúrguer') || nomeLower.includes('burger')) return '🍔';
    if (nomeLower.includes('pizza')) return '🍕';
    if (nomeLower.includes('sushi') || nomeLower.includes('salmão')) return '🍣';
    if (nomeLower.includes('lasanha') || nomeLower.includes('massa')) return '🍝';
    if (nomeLower.includes('risotto')) return '🍄';
    if (nomeLower.includes('bruschetta') || nomeLower.includes('entrada')) return '🥖';
    if (nomeLower.includes('tiramisu') || nomeLower.includes('sobremesa')) return '🍰';
    if (nomeLower.includes('vinho') || nomeLower.includes('bebida')) return '🍷';
    if (nomeLower.includes('batata') || nomeLower.includes('frita')) return '🍟';
    if (nomeLower.includes('frango')) return '🍗';
    if (nomeLower.includes('peixe') || nomeLower.includes('pescado')) return '🐟';
    if (nomeLower.includes('carne')) return '🥩';
    if (nomeLower.includes('salada')) return '🥗';
    if (nomeLower.includes('sopa')) return '🍲';
    
    return '🍽️'; // Emoji padrão
}

// Função para filtrar pratos
function filterDishes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    const filtered = dishes.filter(dish => {
        const dishIdString = String(dish.id); // Converte o ID numérico para string
        const categoriaFormatada = formatarCategoria(dish.categoria || 'Outros').toLowerCase();
        
        const matchesSearch = 
            dish.nome.toLowerCase().includes(searchTerm) || // Busca por nome
            dishIdString.includes(searchTerm) ||           // Busca por ID
            categoriaFormatada.includes(searchTerm) ||     // Busca por categoria formatada
            (dish.categoria && dish.categoria.toLowerCase().includes(searchTerm)); // Busca por código da categoria
        
        return matchesSearch;
    });

    renderTable(filtered);
}

// 1. ADICIONAR NOVO ITEM (Abre o Modal)
function handleNovoPrato() {
    console.log("Abrindo modal para Adicionar Novo Prato.");
    abrirModal('novo');
}

// 2. MODIFICAR (LIGADO ao botão 'Editar')
function handleEditarPrato() {
    const itemId = getSelectedItemId();
    if (!itemId) return; 

    const prato = dishes.find(d => d.id == itemId);
    if (!prato) {
        showStatus('Prato não encontrado', 'error');
        return;
    }
    
    console.log(`Abrindo modal para Editar Item ID: ${itemId}`);
    abrirModal('editar', itemId);
}

// Funções para gerenciar preview de imagem
function mostrarPreview(url) {
    const previewContainer = document.getElementById('imagemPreview');
    const previewImg = document.getElementById('imagemPreviewImg');
    if (previewContainer && previewImg) {
        previewImg.src = url;
        previewContainer.style.display = 'block';
    }
}

function esconderPreview() {
    const previewContainer = document.getElementById('imagemPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

// Função para fazer upload da imagem
async function fazerUploadImagem(arquivo) {
    if (!arquivo) {
        return null;
    }
    
    try {
        showStatus('Fazendo upload da imagem...', 'loading');
        
        const formData = new FormData();
        // API Java espera 'file', mas Flask aceita tanto 'imagem' quanto 'file'
        formData.append('imagem', arquivo);
        
        const response = await fetch(`${window.API_BASE_URL}/upload/imagem`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
            throw new Error(errorData.message || `Erro no upload: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.url) {
            showStatus('Imagem enviada com sucesso!', 'success');
            return data.url;
        } else {
            throw new Error(data.message || 'Erro ao fazer upload da imagem');
        }
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        showStatus(`Erro ao fazer upload: ${error.message}`, 'error');
        throw error;
    }
}

// 3. SALVAR PRATO (Chamado pelo botão Salvar do modal)
async function salvarPrato() {
    const dados = obterDadosFormulario();
    
    if (!validarFormulario(dados)) {
        return;
    }
    
    try {
        // Se houver arquivo selecionado, fazer upload primeiro
        if (imagemSelecionada) {
            const urlImagem = await fazerUploadImagem(imagemSelecionada);
            dados.imagemUrl = urlImagem;
        }
        
        if (currentEditId) {
            // EDITAR item existente
            await editarPratoAPI(currentEditId, dados);
        } else {
            // ADICIONAR novo item
            await adicionarPratoAPI(dados);
        }
        
        fecharModal();
        carregarTabela(); // Recarrega a tabela
        
    } catch (error) {
        console.error('Erro ao salvar prato:', error);
        showStatus(`Erro ao salvar prato: ${error.message}`, 'error');
    }
}

// Função para adicionar prato via API
async function adicionarPratoAPI(dados) {
    // Validar restaurante_id
    if (!window.restaurante_id || isNaN(window.restaurante_id)) {
        throw new Error('ID do restaurante inválido. Faça login novamente.');
    }
    
    // Validar dados antes de enviar
    if (!dados.nome || !dados.nome.trim()) {
        throw new Error('Nome do prato é obrigatório');
    }
    
    if (!dados.preco || isNaN(dados.preco) || dados.preco <= 0) {
        throw new Error('Preço deve ser um valor válido maior que zero');
    }
    
    // Preparar dados para envio
    // Garantir que categoria está em UPPERCASE_SNAKE_CASE
    const categoriaNormalizada = normalizarCategoriaParaCodigo(dados.categoria || 'OUTROS');
    
    const novoPrato = {
        restaurante_id: window.restaurante_id,
        nome: dados.nome.trim(),
        descricao: (dados.descricao || '').trim() || 'Sem descrição',
        preco: parseFloat(dados.preco),
        categoria: categoriaNormalizada, // Sempre em UPPERCASE_SNAKE_CASE
        imagemUrl: (dados.imagemUrl || '').trim() || null
    };
    
    // Remover imagemUrl se vazio
    if (!novoPrato.imagemUrl) {
        delete novoPrato.imagemUrl;
    }
    
    console.log('[CARDAPIO] Enviando novo prato:', novoPrato);
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/cardapio/add`, { 
            method: 'POST', 
            body: JSON.stringify(novoPrato), 
            headers: { 
                'Content-Type': 'application/json' 
            } 
        });
        
        console.log('[CARDAPIO] Resposta recebida:', response.status, response.statusText);
        
        // Verificar status HTTP
        if (response.status === 400) {
            const errorData = await response.json();
            const errorMsg = errorData.message || 'Erro ao adicionar prato. Verifique os dados.';
            console.error('[CARDAPIO] Erro 400:', errorMsg);
            throw new Error(errorMsg);
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[CARDAPIO] Erro HTTP:', response.status, errorText);
            throw new Error(`Erro HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log('[CARDAPIO] Dados recebidos:', data);
        
        if (data.status === 'success') {
            showStatus('Prato adicionado com sucesso!', 'success');
        } else {
            throw new Error(data.message || 'Erro ao adicionar prato');
        }
    } catch (error) {
        console.error('[CARDAPIO] Erro completo:', error);
        throw error;
    }
}

// Função para editar prato via API
async function editarPratoAPI(itemId, dados) {
    // Validar restaurante_id
    if (!window.restaurante_id || isNaN(window.restaurante_id)) {
        throw new Error('ID do restaurante inválido. Faça login novamente.');
    }
    
    // Garantir que categoria está em UPPERCASE_SNAKE_CASE
    const categoriaNormalizada = normalizarCategoriaParaCodigo(dados.categoria || 'OUTROS');
    
    const novosDados = {
        nome: dados.nome.trim(),
        descricao: (dados.descricao || '').trim() || '',
        preco: parseFloat(dados.preco),
        categoria: categoriaNormalizada, // Sempre em UPPERCASE_SNAKE_CASE
        imagemUrl: (dados.imagemUrl || '').trim() || '',
        restaurante_id: window.restaurante_id  // IMPORTANTE: Adicionar restaurante_id
    };
    
    console.log('[CARDAPIO] Editando prato:', itemId, novosDados);
    
    try {
        const response = await fetch(`${window.API_BASE_URL}/cardapio/edit/${itemId}`, { 
            method: 'PUT', 
            body: JSON.stringify(novosDados), 
            headers: { 'Content-Type': 'application/json' } 
        });
        
        console.log('[CARDAPIO] Resposta (editar):', response.status, response.statusText);
        
        if (response.status === 400) {
            const errorData = await response.json();
            const errorMsg = errorData.message || 'Erro ao editar prato. Verifique os dados.';
            console.error('[CARDAPIO] Erro 400:', errorMsg);
            throw new Error(errorMsg);
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[CARDAPIO] Erro HTTP:', response.status, errorText);
            throw new Error(`Erro HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const data = await response.json();
        console.log('[CARDAPIO] Dados recebidos (editar):', data);
        
        if (data.status === 'success') {
            showStatus('Prato editado com sucesso!', 'success');
        } else {
            throw new Error(data.message || 'Erro ao editar prato');
        }
    } catch (error) {
        console.error('[CARDAPIO] Erro completo (editar):', error);
        throw error;
    }
}

// 3. DELETAR (LIGADO ao botão 'Remover')
async function handleRemoverPrato() {
    const itemIds = Array.from(document.querySelectorAll('input[name="item_select"]:checked')).map(cb => cb.value);
    
    if (itemIds.length === 0) {
        showStatus('Selecione pelo menos um item para remover', 'error');
        return;
    }
    
    const confirmMessage = itemIds.length === 1 
        ? `Tem certeza que deseja remover este item?`
        : `Tem certeza que deseja remover ${itemIds.length} itens?`;
    
    if (!confirm(confirmMessage)) return;

    try {
        showStatus(`Removendo ${itemIds.length} item(s)...`, 'loading');
        
        let sucessos = 0;
        let erros = 0;
        let itens_protegidos = [];
        
        for (const itemId of itemIds) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/cardapio/delete/${itemId}`, { method: 'DELETE' });
                
                if (response.status === 409) {
                    const data = await response.json();
                    erros++;
                    itens_protegidos.push(itemId);
                    continue;
                }
                
                const data = await response.json();
                
                if (response.ok && data.status === 'success') {
                    sucessos++;
                } else {
                    erros++;
                }
            } catch (error) {
                erros++;
                console.error(`Erro ao deletar item ${itemId}:`, error);
            }
        }
        
        // Mostrar resultado com mensagem apropriada
        if (sucessos > 0 && erros === 0) {
            showStatus(`${sucessos} item(s) removido(s) com sucesso!`, 'success');
        } else if (sucessos > 0 && erros > 0) {
            if (itens_protegidos.length > 0) {
                showStatus(
                    `${sucessos} item(s) removido(s). ${itens_protegidos.length} item(s) não podem ser excluídos pois já foram vendidos em pedidos.`, 
                    'error'
                );
            } else {
                showStatus(`${sucessos} item(s) removido(s), ${erros} falharam`, 'error');
            }
        } else {
            if (itens_protegidos.length > 0) {
                showStatus(
                    'Não foi possível excluir os itens selecionados pois eles já foram vendidos em pedidos. Estes itens precisam permanecer no sistema para manter a integridade dos históricos.', 
                    'error'
                );
            } else {
                showStatus('Falha ao remover todos os itens', 'error');
            }
        }
        
        carregarTabela(); // Recarrega a tabela após a deleção
        
    } catch (error) {
        console.error('Erro ao remover pratos:', error);
        showStatus(`Erro ao remover pratos: ${error.message}`, 'error');
    }
}


// Função para inicializar a página de cardápio
function inicializarCardapio() {
    
    const novoPratoBtn = document.getElementById('novoPratoBtn');
    const btnEditar = document.getElementById('btnEditar');
    const btnRemover = document.getElementById('btnRemover');
    const searchInput = document.getElementById('searchInput');
    const selectAll = document.getElementById('selectAll');
    
    if (novoPratoBtn) {
        novoPratoBtn.addEventListener('click', handleNovoPrato);
    }
    
    if (btnEditar) {
        btnEditar.addEventListener('click', handleEditarPrato);
    }
    
    if (btnRemover) {
        btnRemover.addEventListener('click', handleRemoverPrato);
    }

    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalSave = document.getElementById('modalSave');
    const modalForm = document.getElementById('modalForm');
    
    if (modalClose) {
        modalClose.addEventListener('click', fecharModal);
    }
    
    if (modalCancel) {
        modalCancel.addEventListener('click', fecharModal);
    }
    
    if (modalSave) {
        modalSave.addEventListener('click', salvarPrato);
    }
    
    if (modalForm) {
        modalForm.addEventListener('click', (e) => {
            if (e.target === modalForm) {
                fecharModal();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterDishes);
    }
    
    // Event listeners para upload de imagem
    const imagemInput = document.getElementById('imagemPrato');
    const removerImagemBtn = document.getElementById('removerImagem');
    const imagemUrlInput = document.getElementById('imagemUrlInput');
    
    if (imagemInput) {
        imagemInput.addEventListener('change', function(e) {
            const arquivo = e.target.files[0];
            if (arquivo) {
                // Validar tipo de arquivo
                if (!arquivo.type.startsWith('image/')) {
                    showStatus('Por favor, selecione um arquivo de imagem válido', 'error');
                    e.target.value = '';
                    return;
                }
                
                // Validar tamanho (máximo 5MB)
                if (arquivo.size > 5 * 1024 * 1024) {
                    showStatus('A imagem deve ter no máximo 5MB', 'error');
                    e.target.value = '';
                    return;
                }
                
                imagemSelecionada = arquivo;
                imagemUrlAtual = null; // Limpar URL se houver arquivo
                document.getElementById('imagemUrlInput').value = ''; // Limpar campo URL
                
                // Mostrar preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    mostrarPreview(e.target.result);
                };
                reader.readAsDataURL(arquivo);
            }
        });
    }
    
    if (removerImagemBtn) {
        removerImagemBtn.addEventListener('click', function() {
            imagemSelecionada = null;
            imagemUrlAtual = null;
            if (imagemInput) imagemInput.value = '';
            if (imagemUrlInput) imagemUrlInput.value = '';
            esconderPreview();
        });
    }
    
    if (imagemUrlInput) {
        imagemUrlInput.addEventListener('input', function(e) {
            const url = e.target.value.trim();
            if (url) {
                imagemUrlAtual = url;
                imagemSelecionada = null; // Limpar arquivo se houver URL
                if (imagemInput) imagemInput.value = ''; // Limpar input de arquivo
                mostrarPreview(url);
            } else {
                imagemUrlAtual = null;
                esconderPreview();
            }
        });
    }

    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('input[name="item_select"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                const dishId = parseInt(checkbox.value);
                if (this.checked) {
                    selectedDishes.add(dishId);
                } else {
                    selectedDishes.delete(dishId);
                }
            });
            updateButtonStates();
            renderTable();
        });
    }

    const table = document.querySelector('.chart-section table');
    if (table) {
        table.addEventListener('change', (e) => {
            if (e.target.name === 'item_select') {
                updateButtonStates();
            }
        });
    }

    carregarTabela();
}

window.inicializarCardapio = inicializarCardapio;