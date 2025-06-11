@echo off
setlocal enabledelayedexpansion

:: Verificar se está rodando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Por favor, execute como administrador
    exit /b 1
)

:: Diretório de instalação (Program Files)
set "INSTALL_DIR=%ProgramFiles%\nodefetch"
set "BINARY_NAME=nodefetch.exe"

:: Criar diretório se não existir
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copiar o executável
copy "dist\nodefetch-windows-x64.exe" "%INSTALL_DIR%\%BINARY_NAME%"

:: Adicionar ao PATH se não estiver
setx PATH "%PATH%;%INSTALL_DIR%" /M

echo Instalação concluída! Você pode usar o comando 'nodefetch' de qualquer lugar.
echo Reinicie o terminal para que as alterações no PATH tenham efeito. 