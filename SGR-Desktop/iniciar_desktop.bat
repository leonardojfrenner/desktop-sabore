@echo off
echo ============================================================
echo 🚀 SGR-Desktop - Aplicação Desktop
echo ============================================================
echo.

REM Verificar se estamos no diretório correto
if not exist "SGR-Desktop\backend\app.py" (
    echo ❌ Arquivo app.py não encontrado!
    echo 💡 Execute este script no diretório raiz do projeto
    pause
    exit /b 1
)

echo 📍 Diretório atual: %CD%
echo.

REM Verificar Node.js
echo 🔍 Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo 💡 Instale Node.js: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js instalado: %NODE_VERSION%
echo.

REM Verificar Python
echo 🔍 Verificando Python...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python não encontrado!
    echo 💡 Instale Python: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('py --version') do set PYTHON_VERSION=%%i
echo ✅ Python instalado: %PYTHON_VERSION%
echo.

REM Verificar ambiente virtual do backend
echo 🔍 Verificando ambiente virtual do backend...
if not exist "SGR-Desktop\backend\venv\Scripts\python.exe" (
    echo ⚠️  Ambiente virtual não encontrado!
    echo 💡 Criando ambiente virtual...
    cd SGR-Desktop\backend
    py -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ Erro ao criar ambiente virtual!
        pause
        exit /b 1
    )
    echo ✅ Ambiente virtual criado!
    cd ..\..
) else (
    echo ✅ Ambiente virtual encontrado!
)
echo.

REM Verificar dependências do backend
echo 🔍 Verificando dependências do backend...
cd SGR-Desktop\backend
call venv\Scripts\activate.bat
pip show flask >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Instalando dependências do backend...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências do backend!
        pause
        exit /b 1
    )
    echo ✅ Dependências do backend instaladas!
) else (
    echo ✅ Dependências do backend já instaladas!
)
deactivate
cd ..\..
echo.

REM Verificar dependências do frontend
echo 🔍 Verificando dependências do frontend...
cd SGR-Desktop\frontend
if not exist "node_modules\electron" (
    echo 📥 Instalando dependências do frontend...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências do frontend!
        pause
        exit /b 1
    )
    echo ✅ Dependências do frontend instaladas!
) else (
    echo ✅ Dependências do frontend já instaladas!
)
echo.

REM Verificar se Flask já está rodando
echo 🔍 Verificando se Flask já está rodando...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  Flask já está rodando na porta 5000
    echo 💡 O Electron vai usar o Flask existente
) else (
    echo ℹ️  Flask não está rodando - Electron vai iniciar automaticamente
)
echo.

echo ============================================================
echo 🖥️  Iniciando aplicação desktop...
echo ============================================================
echo.
echo 📝 O Electron vai:
echo    1. Iniciar o servidor Flask automaticamente
echo    2. Abrir a janela da aplicação desktop
echo    3. Carregar a tela de login
echo.
echo ⏹️  Para fechar, feche a janela do Electron
echo.

REM Iniciar Electron (ele vai iniciar o Flask automaticamente)
npm start

echo.
echo 👋 Aplicação finalizada!
pause

