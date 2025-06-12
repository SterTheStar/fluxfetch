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
const androidUtils = require('./utils/android-utils');
const asciiLoader = require('./utils/ascii-loader');
const BatteryUtils = require('./utils/battery-utils');
const SystemUtils = require('./utils/system-utils');
const GpuUtils = require('./utils/gpu-utils');

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

// Adicionar função para obter hostname no Windows
function getWindowsHostname() {
  try {
    const output = execSync('hostname', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return output || 'unknown';
  } catch (error) {
    console.error('Erro ao obter hostname no Windows:', error);
    return 'unknown';
  }
}

// Função para obter informações do shell no Windows
function getWindowsShellInfo() {
  try {
    // Tentar obter o shell atual via PowerShell
    const output = execSync('powershell -Command "$env:ComSpec"').toString().trim();
    const shellPath = output.toLowerCase();
    
    let shellName = 'Unknown';
    let shellVersion = 'Unknown';
    
    if (shellPath.includes('cmd.exe')) {
      shellName = 'cmd';
      try {
        const versionOutput = execSync('cmd /c ver').toString();
        const versionMatch = versionOutput.match(/\[Version (\d+\.\d+\.\d+)\]/);
        if (versionMatch) {
          shellVersion = versionMatch[1];
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
    } else if (shellPath.includes('powershell.exe')) {
      shellName = 'powershell';
      try {
        const versionOutput = execSync('powershell -Command "$PSVersionTable.PSVersion"').toString();
        const versionMatch = versionOutput.match(/Major\s+:\s+(\d+)/);
        if (versionMatch) {
          shellVersion = versionMatch[1];
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
    }
    
    return `${shellName} ${shellVersion}`;
  } catch (error) {
    console.error('Erro ao obter informações do shell no Windows:', error);
    return 'Unknown';
  }
}

// Função para obter informações do terminal no Windows
function getWindowsTerminalInfo() {
  try {
    // Verificar se está rodando no Windows Terminal
    const wtProcess = execSync('powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like \'*Windows Terminal*\'}"').toString();
    if (wtProcess) {
      return 'Windows Terminal';
    }
    
    // Verificar se está rodando no ConEmu
    const conemuProcess = execSync('powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like \'*ConEmu*\'}"').toString();
    if (conemuProcess) {
      return 'ConEmu';
    }
    
    // Verificar se está rodando no Cmder
    const cmderProcess = execSync('powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like \'*Cmder*\'}"').toString();
    if (cmderProcess) {
      return 'Cmder';
    }
    
    // Verificar se está rodando no PowerShell
    const psProcess = execSync('powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq \'powershell\'}"').toString();
    if (psProcess) {
      return 'PowerShell';
    }
    
    // Verificar se está rodando no CMD
    const cmdProcess = execSync('powershell -Command "Get-Process | Where-Object {$_.ProcessName -eq \'cmd\'}"').toString();
    if (cmdProcess) {
      return 'Command Prompt';
    }
    
    return 'Windows Console';
  } catch (error) {
    console.error('Erro ao obter informações do terminal no Windows:', error);
    return 'Unknown';
  }
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
    
    // Inicializar variáveis para informações adicionais
    let androidInfo = {};
    let additionalInfo = {};
    
    // Obter informações adicionais do sistema
    try {
      additionalInfo = await SystemUtils.getAdditionalInfo();
    } catch (error) {
      console.error('Erro ao obter informações adicionais:', error);
      additionalInfo = {
        packages: 'Unknown',
        display: [],
        theme: {},
        locale: {},
        network: {},
        swap: {}
      };
    }
    
    // Calcular uso de disco
    let totalDisk = 0;
    let usedDisk = 0;
    
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
        
        // Usar informações de armazenamento do Android
        totalDisk = androidInfo.storageTotal ? parseFloat(androidInfo.storageTotal) : 0;
        usedDisk = androidInfo.storageUsed ? parseFloat(androidInfo.storageUsed) : 0;
      } catch (error) {
        console.error('Erro ao obter informações do Android:', error);
      }
    } else {
      // Usar informações de disco do sistema
      totalDisk = disk.reduce((acc, item) => acc + item.size, 0) / 1024 / 1024 / 1024;
      usedDisk = disk.reduce((acc, item) => acc + item.used, 0) / 1024 / 1024 / 1024;
    }
    
    // Obter informações da bateria
    const batteryInfo = await BatteryUtils.getBatteryInfo();
    
    // Obter versão do shell
    let shellVersion = 'Unknown';
    let shellInfo = 'Unknown';
    let terminalInfo = 'Unknown';
    
    if (process.platform === 'win32') {
      shellInfo = getWindowsShellInfo();
      terminalInfo = getWindowsTerminalInfo();
    } else {
      try {
        if (process.env.SHELL) {
          const shellPath = process.env.SHELL;
          const shellName = path.basename(shellPath);
          const versionOutput = execSync(`${shellName} --version`).toString();
          const versionMatch = versionOutput.match(/\d+\.\d+\.\d+/);
          if (versionMatch) {
            shellVersion = versionMatch[0];
          }
          shellInfo = `${shellName} ${shellVersion}`;
        }
      } catch (error) {
        console.error('Erro ao obter versão do shell:', error);
      }
    }

    // Obter informações da GPU
    const gpuInfo = await GpuUtils.getGpuInfo();
    
    return {
      hostname: process.platform === 'win32' ? getWindowsHostname() : os.hostname(),
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
        total: totalDisk > 0 ? totalDisk.toFixed(2) + ' GB' : 'Unknown',
        used: usedDisk > 0 ? usedDisk.toFixed(2) + ' GB' : 'Unknown',
        percentage: totalDisk > 0 ? ((usedDisk / totalDisk) * 100).toFixed(1) + '%' : 'Unknown'
      },
      uptime: formatUptime(os.uptime()),
      shell: shellInfo,
      terminal: terminalInfo,
      terminalPath: process.platform === 'win32' ? terminalInfo : getTerminalPath(),
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
    return {
      hostname: os.hostname(),
      platform: 'Unknown',
      distro: 'Unknown',
      release: 'Unknown',
      arch: os.arch(),
      kernel: 'Unknown',
      uptime: 'Unknown',
      shell: 'Unknown',
      terminal: 'Unknown',
      terminalPath: 'Unknown',
      cpu: {
        model: 'Unknown',
        cores: 'Unknown',
        speed: 'Unknown'
      },
      gpu: 'Unknown',
      memory: {
        total: 'Unknown',
        used: 'Unknown',
        percentage: 'Unknown'
      },
      disk: {
        total: 'Unknown',
        used: 'Unknown',
        percentage: 'Unknown'
      },
      resolution: 'Unknown',
      battery: null,
      ...additionalInfo
    };
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

// Adicionar função para remover marcadores de cor e códigos ANSI
function stripColorMarkersAndAnsi(str) {
  // Remove marcadores $1, $2, $3, $4
  let clean = str.replace(/\$[1-9]/g, '');
  // Remove códigos ANSI
  clean = clean.replace(/\u001b\[[0-9;]*m/g, '');
  return clean;
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
    const username = process.env.USER || process.env.USERNAME || 'unknown';
    const hostname = info.hostname;
    const fullText = `${username}@${hostname}`;
    infoLines.push(`${config.colors.labels(chalk.bold(username))}${chalk.white.bold('@')}${config.colors.labels(chalk.bold(hostname))}`);
    infoLines.push(`${chalk.white('-'.repeat(fullText.length))}`);
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
  
  // Adicionar informações da bateria se disponíveis
  if (config.showInfo.batteryLevel && info.battery) {
    info.battery.forEach(bat => {
      let batteryInfo = `${bat.capacity}`;
      if (bat.status) batteryInfo += ` (${bat.status})`;
      if (bat.timeRemaining && bat.timeRemaining !== 'Unknown') {
        batteryInfo += ` - ${bat.timeRemaining}`;
      }
      if (bat.voltage && bat.voltage !== 'Unknown') {
        batteryInfo += ` - ${bat.voltage}`;
      }
      if (bat.temperature && bat.temperature !== 'Unknown') {
        batteryInfo += ` - ${bat.temperature}`;
      }
      infoLines.push(`${config.colors.labels(chalk.bold('Battery'))}: ${batteryInfo}`);
    });
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
        const label = key.toUpperCase();
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
  const asciiWidth = Math.max(...asciiArt.map(line => stripColorMarkersAndAnsi(line).length));
  
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
      line += ' '.repeat(asciiWidth - stripColorMarkersAndAnsi(asciiArt[i]).length + 8);
    } else if (config.display.showAsciiArt) {
      // Se não houver mais linhas de arte ASCII, adicionar espaços
      // O padding deve ser igual ao espaço à esquerda + largura da arte + padding extra
      line += ' '.repeat(8 + asciiWidth + 8); // 8 espaços à esquerda + largura da arte + padding extra
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
    let colorLine1 = '';
    let colorLine2 = '';
    for (let i = 0; i < 8; i++) {
      colorLine1 += chalk.bgAnsi(i)('   ');
      colorLine2 += chalk.bgAnsi(i + 8)('   ');
    }
    // Adicionar espaços para alinhar com as informações
    const padding = ' '.repeat(asciiWidth + 19);
    console.log(padding + colorLine1);
    console.log(padding + colorLine2);
  }
}

// Executar o programa
displaySystemInfo().catch(error => {
  console.error('Erro ao exibir informações do sistema:', error);
});