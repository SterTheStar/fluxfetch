#!/usr/bin/env node

const os = require('os');
const si = require('systeminformation');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { program } = require('commander');
const config = require('./config');
const androidUtils = require('./android-utils');
const asciiLoader = require('./ascii-loader');
const BatteryUtils = require('./battery-utils');
const SystemUtils = require('./system-utils');
const GpuUtils = require('./gpu-utils');

// Configurar opções de linha de comando
program
  .option('--name <name>', 'Custom name to display')
  .option('--system <system>', 'Force specific operating system')
  .option('--list-systems', 'List all available systems')
  .parse(process.argv);

const options = program.opts();

// Se a opção --list-systems for usada, listar sistemas e sair
if (options.listSystems) {
  console.log('Sistemas disponíveis:');
  console.log(asciiLoader.listAvailableSystems().join('\n'));
  process.exit(0);
}

// Função para obter resolução da tela
async function getScreenResolution() {
  try {
    // Tentar obter informações do display
    const displayInfo = await si.graphics();
    
    // Verificar diferentes propriedades que podem conter a resolução
    if (displayInfo.displays && displayInfo.displays.length > 0) {
      const display = displayInfo.displays[0];
      
      // Tentar diferentes propriedades que podem conter a resolução
      if (display.resolutionX && display.resolutionY) {
        return `${display.resolutionX}x${display.resolutionY}`;
      }
      if (display.currentResX && display.currentResY) {
        return `${display.currentResX}x${display.currentResY}`;
      }
      if (display.resolution) {
        return display.resolution;
      }
    }
    
    // Fallback: Tentar obter resolução usando o módulo os
    if (process.platform === 'win32') {
      // No Windows, podemos tentar usar o comando wmic
      try {
        const output = execSync('wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution').toString();
        const match = output.match(/(\d+)\s+(\d+)/);
        if (match) {
          return `${match[1]}x${match[2]}`;
        }
      } catch (error) {
        console.error('Erro ao obter resolução via wmic:', error);
      }
    } else if (process.platform === 'linux') {
      // No Linux, podemos tentar usar xrandr
      try {
        const output = execSync('xrandr --current').toString();
        const match = output.match(/(\d+)x(\d+)/);
        if (match) {
          return `${match[1]}x${match[2]}`;
        }
      } catch (error) {
        console.error('Erro ao obter resolução via xrandr:', error);
      }
    }
    
    // Se não conseguir obter a resolução, retornar desconhecido
    return 'Unknown';
  } catch (error) {
    console.error('Error getting screen resolution:', error);
    return 'Unknown';
  }
}

// Detectar se está rodando em ambiente Android
const isAndroid = androidUtils.isAndroid;

// Função para obter o caminho do terminal
function getTerminalPath() {
  // No Linux, tentar usar o comando tty primeiro
  if (process.platform === 'linux') {
    try {
      const ttyOutput = execSync('tty', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (ttyOutput && ttyOutput !== 'not a tty') {
        return ttyOutput;
      }
    } catch (error) {
      // Ignorar erro silenciosamente e tentar outros métodos
    }
  }

  // Tentar obter o terminal atual usando ps
  try {
    const psOutput = execSync('ps -p $$ -o tty=', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (psOutput && psOutput !== '?') {
      return '/dev/' + psOutput;
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }

  // Tentar usar who para obter o terminal atual
  try {
    const whoOutput = execSync('who am i', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const ttyMatch = whoOutput.match(/pts\/\d+/);
    if (ttyMatch) {
      return '/dev/' + ttyMatch[0];
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }
  
  // Tentar usar w para obter o terminal atual
  try {
    const wOutput = execSync('w', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const ttyMatch = wOutput.match(/pts\/\d+/);
    if (ttyMatch) {
      return '/dev/' + ttyMatch[0];
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }
  
  // Fallback para variáveis de ambiente
  if (process.env.TTY) {
    return process.env.TTY;
  }
  
  if (process.env.TERMINAL_EMULATOR) {
    return process.env.TERMINAL_EMULATOR;
  }
  
  if (process.env.TERM_PROGRAM) {
    return process.env.TERM_PROGRAM;
  }

  // Se estiver rodando em um ambiente gráfico, tentar detectar o terminal
  if (process.env.DISPLAY) {
    try {
      const xpropOutput = execSync('xprop -root _NET_WM_PID', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const pidMatch = xpropOutput.match(/_NET_WM_PID\(CARDINAL\) = (\d+)/);
      if (pidMatch) {
        const pid = pidMatch[1];
        const psOutput = execSync(`ps -p ${pid} -o tty=`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (psOutput && psOutput !== '?') {
          return '/dev/' + psOutput;
        }
      }
    } catch (error) {
      // Ignorar erro silenciosamente
    }
  }
  
  return 'Unknown';
}

// Função para obter informações do sistema
async function getSystemInfo() {
  try {
    // Informações básicas
    const cpu = await si.cpu();
    const mem = await si.mem();
    const os_info = await si.osInfo();
    const graphics = await si.graphics();
    const disk = await si.fsSize();
    const net = await si.networkInterfaces();
    const system = await si.system();
    
    // Obter resolução da tela
    const resolution = await getScreenResolution();
    
    // Calcular uso de memória
    const totalMem = (mem.total / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = ((mem.total - mem.available) / 1024 / 1024 / 1024).toFixed(2);
    const memPercentage = (((mem.total - mem.available) / mem.total) * 100).toFixed(1);
    
    // Calcular uso de disco
    const totalDisk = disk.reduce((acc, item) => acc + item.size, 0) / 1024 / 1024 / 1024;
    const usedDisk = disk.reduce((acc, item) => acc + item.used, 0) / 1024 / 1024 / 1024;
    
    // Informações específicas para Android
    let androidInfo = {};
    if (isAndroid) {
      try {
        // Obter informações detalhadas do Android usando o módulo androidUtils
        const detailedAndroidInfo = await androidUtils.getAndroidInfo();
        const androidHardwareInfo = await androidUtils.getAndroidHardwareInfo();
        
        androidInfo = {
          device: detailedAndroidInfo.model || 'Unknown',
          manufacturer: detailedAndroidInfo.manufacturer || 'Unknown',
          sdk: detailedAndroidInfo.sdkVersion || 'Unknown',
          build: detailedAndroidInfo.buildId || 'Unknown',
          version: detailedAndroidInfo.androidVersion || 'Unknown',
          batteryLevel: detailedAndroidInfo.batteryLevel || 'Unknown',
          wifiInfo: detailedAndroidInfo.wifiInfo || 'Unknown',
          cpuModel: androidHardwareInfo.cpu?.model || 'Unknown',
          cpuCores: androidHardwareInfo.cpu?.cores || 'Unknown',
          storageTotal: androidHardwareInfo.storage?.total || 'Unknown',
          storageUsed: androidHardwareInfo.storage?.used || 'Unknown'
        };
      } catch (error) {
        console.error('Erro ao obter informações do Android:', error);
      }
    }
    
    // Obter informações da bateria
    const batteryInfo = await BatteryUtils.getBatteryInfo();
    
    // Obter informações adicionais do sistema
    const additionalInfo = await SystemUtils.getAdditionalInfo();
    
    // Obter versão do shell
    let shellVersion = 'Unknown';
    try {
      if (process.env.SHELL) {
        const shellPath = process.env.SHELL;
        const shellName = path.basename(shellPath);
        const versionOutput = execSync(`${shellName} --version`).toString();
        const versionMatch = versionOutput.match(/\d+\.\d+\.\d+/);
        if (versionMatch) {
          shellVersion = versionMatch[0];
        }
      }
    } catch (error) {
      console.error('Erro ao obter versão do shell:', error);
    }

    // Obter informações da GPU
    const gpuInfo = await GpuUtils.getGpuInfo();
    
    return {
      hostname: os.hostname(),
      platform: isAndroid ? 'Android' : os_info.platform,
      distro: isAndroid ? androidInfo.device : os_info.distro,
      release: isAndroid ? androidInfo.build : os_info.release,
      kernel: os_info.kernel,
      arch: os.arch(),
      cpu: {
        model: cpu.manufacturer + ' ' + cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed + ' GHz'
      },
      gpu: gpuInfo,
      memory: {
        total: totalMem + ' GB',
        used: usedMem + ' GB',
        percentage: memPercentage + '%'
      },
      disk: {
        total: totalDisk.toFixed(2) + ' GB',
        used: usedDisk.toFixed(2) + ' GB',
        percentage: ((usedDisk / totalDisk) * 100).toFixed(1) + '%'
      },
      uptime: formatUptime(os.uptime()),
      shell: process.env.SHELL ? `${path.basename(process.env.SHELL)} ${shellVersion}` : 'Unknown',
      terminal: process.env.TERM || process.env.TERMINAL || 'Unknown',
      terminalPath: getTerminalPath(),
      resolution: resolution,
      de: process.env.DESKTOP_SESSION || process.env.XDG_CURRENT_DESKTOP || 'Unknown',
      wm: process.env.WINDOWMANAGER || 'Unknown',
      androidInfo: isAndroid ? androidInfo : null,
      battery: batteryInfo,
      packages: additionalInfo.packages,
      display: additionalInfo.display,
      theme: additionalInfo.theme,
      locale: additionalInfo.locale,
      network: additionalInfo.network,
      swap: additionalInfo.swap
    };
  } catch (error) {
    console.error('Error getting system information:', error);
    return {};
  }
}

// Formatar tempo de atividade
function formatUptime(uptime) {
  const days = Math.floor(uptime / (60 * 60 * 24));
  const hours = Math.floor((uptime % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  result += `${minutes}m`;
  
  return result;
}

// Gerar arte ASCII para diferentes sistemas
function getAsciiArt(system) {
  if (options.system) {
    return asciiLoader.getAsciiArt(options.system);
  }
  
  // Detecção automática do sistema
  if (isAndroid) {
    return asciiLoader.getAsciiArt('android');
  } else if (system.platform.toLowerCase().includes('linux')) {
    return asciiLoader.getAsciiArt(system.distro);
  } else if (system.platform.toLowerCase().includes('win')) {
    return asciiLoader.getAsciiArt('windows');
  } else if (system.platform.toLowerCase().includes('darwin')) {
    return asciiLoader.getAsciiArt('macos');
  }
  
  return asciiLoader.getAsciiArt('unknown');
}

// Exibir informações do sistema com arte ASCII
async function displaySystemInfo() {
  const info = await getSystemInfo();
  const asciiArt = config.display.showAsciiArt ? getAsciiArt(info) : [];
  
  // Linha separadora
  console.log(config.colors.title(config.display.separator.repeat(config.display.separatorLength)));
  
  // Adicionar linha em branco antes da arte ASCII
  console.log('');
  
  // Preparar linhas de informação com base nas configurações
  const infoLines = [];
  
  // Adicionar informações com base nas configurações
  if (config.showInfo.distro) {
    infoLines.push(`${config.colors.labels(chalk.bold('Hostname'))}: ${info.hostname}`);
  }
  
  if (config.showInfo.os) {
    const osName = isAndroid ? 'Android' : 
                  info.distro ? info.distro : 
                  info.platform;
    infoLines.push(`${config.colors.labels(chalk.bold('OS'))}: ${osName} ${info.release} ${info.arch}`);
  }
  
  if (config.showInfo.kernel) {
    infoLines.push(`${config.colors.labels(chalk.bold('Kernel'))}: ${info.kernel}`);
  }
  
  if (config.showInfo.uptime) {
    infoLines.push(`${config.colors.labels(chalk.bold('Uptime'))}: ${info.uptime}`);
  }
  
  if (config.showInfo.shell) {
    infoLines.push(`${config.colors.labels(chalk.bold('Shell'))}: ${info.shell}`);
  }
  
  if (config.showInfo.terminal) {
    const terminalEmulator = process.env.TERMINAL_EMULATOR || process.env.TERM_PROGRAM || 'Unknown';
    const terminalInfo = `${info.terminalPath} (${terminalEmulator} - ${info.terminal})`;
    infoLines.push(`${config.colors.labels(chalk.bold('Terminal'))}: ${terminalInfo}`);
  }
  
  if (config.showInfo.cpu) {
    infoLines.push(`${config.colors.labels(chalk.bold('CPU'))}: ${info.cpu.model} (${info.cpu.cores} cores @ ${info.cpu.speed})`);
  }
  
  if (config.showInfo.gpu && info.gpu) {
    infoLines.push(`${config.colors.labels(chalk.bold('GPU'))}: ${info.gpu}`);
  }
  
  if (config.showInfo.memory) {
    infoLines.push(`${config.colors.labels(chalk.bold('Memory'))}: ${info.memory.used} / ${info.memory.total} (${info.memory.percentage})`);
    // Add swap information right after memory
    if (info.swap && Object.keys(info.swap).length > 0) {
      infoLines.push(`${config.colors.labels(chalk.bold('Swap'))}: ${info.swap.used} / ${info.swap.total} (${info.swap.percentage})`);
    }
  }
  
  if (config.showInfo.disk) {
    infoLines.push(`${config.colors.labels(chalk.bold('Disk'))}: ${info.disk.used} / ${info.disk.total} (${info.disk.percentage})`);
  }
  
  if (config.showInfo.resolution) {
    infoLines.push(`${config.colors.labels(chalk.bold('Resolution'))}: ${info.resolution}`);
  }
  
  // Add package information if available
  if (info.packages) {
    infoLines.push(`${config.colors.labels(chalk.bold('Packages'))}: ${info.packages}`);
  }
  
  // Adicionar informações de display se disponíveis
  if (info.display && info.display.length > 0) {
    const displayInfo = info.display.map(display => {
      const parts = [];
      if (display.resolution) parts.push(display.resolution);
      if (display.refresh) parts.push(display.refresh);
      if (display.size) parts.push(display.size);
      if (display.name) parts.push(`(${display.name})`);
      return parts.join(' ');
    }).join(', ');
    
    if (displayInfo) {
      infoLines.push(`${config.colors.labels(chalk.bold('Display'))}: ${displayInfo}`);
    }
  } else if (info.resolution) {
    // Fallback para a resolução obtida via getScreenResolution
    infoLines.push(`${config.colors.labels(chalk.bold('Display'))}: ${info.resolution}`);
  }
  
  // Adicionar informações de tema se disponíveis
  if (info.theme && Object.keys(info.theme).length > 0) {
    Object.entries(info.theme).forEach(([key, value]) => {
      if (value && value !== 'Unknown') {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        infoLines.push(`${config.colors.labels(chalk.bold(label))}: ${value}`);
      }
    });
  }
  
  // Adicionar informações de localização se disponíveis
  if (info.locale && Object.keys(info.locale).length > 0) {
    Object.entries(info.locale).forEach(([key, value]) => {
      if (value && value !== 'Unknown') {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        infoLines.push(`${config.colors.labels(chalk.bold(label))}: ${value}`);
      }
    });
  }
  
  // Calcular o comprimento máximo da arte ASCII
  const asciiWidth = Math.max(...asciiArt.map(line => line.length));
  
  // Calcular o número de linhas vazias necessárias para centralizar
  const totalLines = Math.max(asciiArt.length, infoLines.length);
  const emptyLinesBefore = Math.floor((asciiArt.length - infoLines.length) / 2);
  const emptyLinesAfter = asciiArt.length - infoLines.length - emptyLinesBefore;
  
  // Exibir arte ASCII e informações lado a lado
  for (let i = 0; i < totalLines; i++) {
    let line = '';
    
    // Adicionar linha da arte ASCII se disponível e configurada para exibir
    if (config.display.showAsciiArt && i < asciiArt.length) {
      // Adicionar espaço à esquerda
      line += ' '.repeat(8);
      line += config.colors.ascii(asciiArt[i]);
      // Preencher com espaços para alinhar
      line += ' '.repeat(asciiWidth - asciiArt[i].length + 8);
    } else if (config.display.showAsciiArt) {
      // Se não houver mais linhas de arte ASCII, adicionar espaços
      line += ' '.repeat(asciiWidth + 19);
    }
    
    // Adicionar linha de informação se disponível
    const infoIndex = i - emptyLinesBefore;
    if (infoIndex >= 0 && infoIndex < infoLines.length) {
      line += infoLines[infoIndex].replace(/\s+:/, ':');
    }
    
    console.log(line);
  }
  
  // Exibir cores se configurado
  if (config.display.showColorBlocks) {
    console.log('\n');
    for (let i = 0; i < 8; i++) {
      let colorLine = '';
      for (let j = 0; j < 2; j++) {
        const colorCode = j * 8 + i;
        colorLine += chalk.bgAnsi(colorCode)('   ');
      }
      console.log(colorLine);
    }
  }
}

// Executar o programa
displaySystemInfo().catch(error => {
  console.error('Erro ao exibir informações do sistema:', error);
});