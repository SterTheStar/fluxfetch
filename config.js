/**
 * Arquivo de configuração para o NodeFetch
 * Permite personalizar cores, arte ASCII e outras configurações
 */

const chalk = require('chalk');

// Configurações padrão
const defaultConfig = {
  // Cores principais
  colors: {
    title: chalk.cyan,      // Cor do título
    labels: chalk.cyan,     // Cor dos rótulos (CPU, Memória, etc)
    ascii: chalk.green,     // Cor da arte ASCII
    info: chalk.white,      // Cor das informações
    bar: chalk.yellow,      // Cor das barras de progresso
    error: chalk.red        // Cor das mensagens de erro
  },
  
  // Configurações de exibição
  display: {
    showColorBlocks: true,  // Mostrar blocos de cores no final
    showAsciiArt: true,      // Mostrar arte ASCII
    compactMode: false,      // Modo compacto (menos informações)
    titleFont: 'Standard',   // Fonte do título (usando figlet)
    separator: '─',          // Caractere separador
    separatorLength: 50      // Comprimento do separador
  },
  
  // Informações a serem exibidas (true = mostrar, false = ocultar)
  showInfo: {
    hostname: true,
    distro: true,
    kernel: true,
    uptime: true,
    shell: true,
    cpu: true,
    memory: true,
    disk: true,
    resolution: true,
    de: true,
    wm: true,
    terminal: true,
    // Específico para Android
    device: true,
    androidVersion: true,
    batteryLevel: true,
    wifiInfo: true
  },
  
  // Arte ASCII personalizada para diferentes sistemas
  // Você pode adicionar ou modificar as artes aqui
  asciiArt: {
    android: [
      '  \\  /\\  ',
      '   \\/ _\\ ',
      '   / / \\ \\',
      '  / /   \\ \\',
      ' / /_____\\ \\',
      '/___________\\'
    ],
    linux: [
      '    .---.    ',
      '   /     \\   ',
      '   \\.@-@./   ',
      '   /`\\_/`\\   ',
      '  //  _  \\\\  ',
      ' | \\     )|_ ',
      '/`\\_`>  <_/ \\',
      '\\__/---\\__/'
    ],
    windows: [
      '        ###########        ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '       #############       ',
      '        ###########        '
    ],
    macos: [
      '       .:/+oossssoo+/:.       ',
      '    .:+ssssssssssssssssss+:.    ',
      '  -+ssssssssssssssssssyyssss+-  ',
      '.ossssssssssssssssss/...syssso. ',
      '+sssssssssssssssss:.....+yssss+ ',
      'ossssssssssssssso........ossssso',
      'osssssssssssssso.........+ssssso',
      '+sssssssssssssss:......./yssss+ ',
      '.ossssssssssssssss/...syssso. ',
      '  -+sssssssssssssssssyyyssss+-  ',
      '    .:+ssssssssssssssssss+:.    ',
      '       .:/+oossssoo+/:.       '
    ],
    default: [
      '   _____ _    _ ',
      '  / ____| |  | |',
      ' | (___ | |__| |',
      '  \\___ \|  __  |',
      '  ____) | |  | |',
      ' |_____/|_|  |_|'
    ]
  }
};

// Exportar configuração
module.exports = defaultConfig;
