# NodeFetch

Um clone do neofetch/fastfetch em Node.js com suporte para Android. Este aplicativo exibe informações do sistema junto com arte ASCII personalizada.

## Características

- Exibe informações detalhadas do sistema (CPU, memória, disco, etc.)
- Mostra arte ASCII personalizada baseada no sistema operacional
- Suporte para ambientes Linux, Windows, macOS e Android
- Interface colorida no terminal

## Requisitos

- Node.js 12 ou superior
- Para uso em Android: Termux ou ambiente similar com Node.js instalado

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/node-fetch.git
cd node-fetch

# Instale as dependências
npm install
```

## Uso

```bash
# Execute o aplicativo
node index.js

# Ou use o comando npm
npm start
```

### Uso no Android (via Termux)

1. Instale o Termux da Google Play Store ou F-Droid
2. Abra o Termux e instale Node.js:

```bash
pkg update
pkg install nodejs
```

3. Clone o repositório e instale as dependências:

```bash
pkg install git
git clone https://github.com/seu-usuario/node-fetch.git
cd node-fetch
npm install
```

4. Execute o aplicativo:

```bash
node index.js
```

## Personalização

Você pode personalizar as artes ASCII editando o arquivo `index.js` e modificando o objeto `asciiArts`.

## Licença

MIT