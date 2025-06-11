#!/bin/bash

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "Por favor, execute como root (sudo)"
    exit 1
fi

# Diretório de instalação
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="nodefetch"

# Copiar o executável
cp "nodefetch-linux-x64" "$INSTALL_DIR/$BINARY_NAME"

# Configurar permissões
chmod +x "$INSTALL_DIR/$BINARY_NAME"

echo "Instalação concluída! Você pode usar o comando 'nodefetch' de qualquer lugar." 