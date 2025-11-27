@echo off
echo 🚀 SGR-Desktop - Sistema de Gerenciamento de Restaurantes
echo ============================================================
echo.

REM Verificar se estamos no diretório correto
if not exist "app.py" (
    echo ❌ Arquivo app.py não encontrado!
    echo 💡 Execute este script no diretório SGR-Desktop/backend
    pause
    exit /b 1
)

echo 📍 Diretório atual: %CD%
echo.

REM Verificar se o ambiente virtual existe
if not exist "venv" (
    echo 🔧 Criando ambiente virtual...
    py -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Erro ao criar ambiente virtual!
        pause
        exit /b 1
    )
    echo ✅ Ambiente virtual criado!
)

echo 🔧 Ativando ambiente virtual...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ❌ Erro ao ativar ambiente virtual!
    pause
    exit /b 1
)

echo ✅ Ambiente virtual ativado!
echo.

echo 📦 Verificando dependências...
pip show flask >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Instalando dependências do requirements.txt...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências!
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas!
) else (
    echo ✅ Dependências já instaladas!
)

echo.
echo 🏥 Testando conexão com banco de dados...
python -c "import psycopg2; conn = psycopg2.connect(host='localhost', database='sabore', user='postgres', password='157428', port='5432'); print('✅ Conexão com banco OK!'); conn.close()" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Aviso: Não foi possível conectar ao banco de dados
    echo 💡 Verifique se o PostgreSQL está rodando
    echo 💡 Verifique as configurações em config.env
    echo.
    echo 🚀 Iniciando servidor mesmo assim...
) else (
    echo ✅ Banco de dados conectado com sucesso!
)

echo.
echo 🚀 Iniciando servidor Flask...
echo 📊 Dashboard: http://localhost:5000/api/dashboard/{restaurante_id}
echo 🏥 Health Check: http://localhost:5000/api/health
echo 🧪 Teste: Abra frontend/teste_dashboard.html no navegador
echo.
echo ⏹️  Para parar o servidor, pressione Ctrl+C
echo.

python app.py

echo.
echo 👋 Servidor finalizado!
pause
