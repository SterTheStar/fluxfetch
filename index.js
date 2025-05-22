#!/usr/bin/env node

const os = require('os');
const si = require('systeminformation');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const androidUtils = require('./android-utils');

// Detectar se está rodando em ambiente Android
const isAndroid = androidUtils.isAndroid;

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
          device: detailedAndroidInfo.model || 'Dispositivo Android',
          manufacturer: detailedAndroidInfo.manufacturer || 'Desconhecido',
          sdk: detailedAndroidInfo.sdkVersion || 'Desconhecido',
          build: detailedAndroidInfo.buildId || 'Desconhecido',
          version: detailedAndroidInfo.androidVersion || 'Desconhecido',
          batteryLevel: detailedAndroidInfo.batteryLevel || 'Desconhecido',
          wifiInfo: detailedAndroidInfo.wifiInfo || 'Desconhecido',
          cpuModel: androidHardwareInfo.cpu?.model || 'Desconhecido',
          cpuCores: androidHardwareInfo.cpu?.cores || 'Desconhecido',
          storageTotal: androidHardwareInfo.storage?.total || 'Desconhecido',
          storageUsed: androidHardwareInfo.storage?.used || 'Desconhecido'
        };
      } catch (error) {
        console.error('Erro ao obter informações do Android:', error);
      }
    }
    
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
      shell: process.env.SHELL || 'Desconhecido',
      resolution: graphics.displays.length > 0 ? 
        `${graphics.displays[0].resolutionX}x${graphics.displays[0].resolutionY}` : 'Desconhecido',
      de: process.env.DESKTOP_SESSION || process.env.XDG_CURRENT_DESKTOP || 'Desconhecido',
      wm: process.env.WINDOWMANAGER || 'Desconhecido',
      terminal: process.env.TERM || process.env.TERMINAL || 'Desconhecido',
      androidInfo: isAndroid ? androidInfo : null
    };
  } catch (error) {
    console.error('Erro ao obter informações do sistema:', error);
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
  // Usar arte ASCII do arquivo de configuração
  const asciiArts = config.asciiArt;
  
  // Selecionar arte ASCII com base no sistema
  let art;
  if (isAndroid) {
    art = asciiArts.android;
  } else if (system.platform.toLowerCase().includes('linux')) {
    art = asciiArts.linux;
  } else if (system.platform.toLowerCase().includes('win')) {
    art = asciiArts.windows;
  } else if (system.platform.toLowerCase().includes('darwin')) {
    art = asciiArts.macos;
  } else {
    art = asciiArts.default;
  }
  
  return art;
}

// Exibir informações do sistema com arte ASCII
async function displaySystemInfo() {
  const info = await getSystemInfo();
  const asciiArt = config.display.showAsciiArt ? getAsciiArt(info) : [];
  
  // Título com figlet
  console.log(config.colors.title(figlet.textSync('NodeFetch', {
    font: config.display.titleFont,
    horizontalLayout: 'default',
    verticalLayout: 'default'
  })));
  
  // Linha separadora
  console.log(config.colors.title(config.display.separator.repeat(config.display.separatorLength)));
  
  // Preparar linhas de informação com base nas configurações
  const infoLines = [];
  
  // Adicionar informações com base nas configurações
  if (config.showInfo.distro) {
    infoLines.push(`${config.colors.labels('Sistema')}     : ${info.distro} ${info.release} (${info.arch})`);
  }
  
  if (config.showInfo.kernel) {
    infoLines.push(`${config.colors.labels('Kernel')}      : ${info.kernel}`);
  }
  
  if (config.showInfo.hostname) {
    infoLines.push(`${config.colors.labels('Hostname')}    : ${info.hostname}`);
  }
  
  if (config.showInfo.uptime) {
    infoLines.push(`${config.colors.labels('Uptime')}      : ${info.uptime}`);
  }
  
  if (config.showInfo.shell) {
    infoLines.push(`${config.colors.labels('Shell')}       : ${info.shell}`);
  }
  
  if (config.showInfo.cpu) {
    infoLines.push(`${config.colors.labels('CPU')}         : ${info.cpu.model} (${info.cpu.cores} cores @ ${info.cpu.speed})`);
  }
  
  if (config.showInfo.memory) {
    infoLines.push(`${config.colors.labels('Memória')}     : ${info.memory.used} / ${info.memory.total} (${info.memory.percentage})`);
  }
  
  if (config.showInfo.disk) {
    infoLines.push(`${config.colors.labels('Disco')}       : ${info.disk.used} / ${info.disk.total} (${info.disk.percentage})`);
  }
  
  if (config.showInfo.resolution) {
    infoLines.push(`${config.colors.labels('Resolução')}   : ${info.resolution}`);
  }
  
  // Adicionar informações específicas do Android se disponíveis
  if (isAndroid && info.androidInfo) {
    if (config.showInfo.device) {
      infoLines.push(`${config.colors.labels('Dispositivo')}  : ${info.androidInfo.manufacturer} ${info.androidInfo.device}`);
    }
    
    if (config.showInfo.androidVersion) {
      infoLines.push(`${config.colors.labels('Android')}     : ${info.androidInfo.version} (SDK ${info.androidInfo.sdk})`);
      infoLines.push(`${config.colors.labels('Build')}       : ${info.androidInfo.build}`);
    }
    
    if (config.showInfo.batteryLevel) {
      infoLines.push(`${config.colors.labels('Bateria')}     : ${info.androidInfo.batteryLevel}`);
    }
    
    if (config.showInfo.wifiInfo) {
      infoLines.push(`${config.colors.labels('WiFi')}        : ${info.androidInfo.wifiInfo}`);
    }
  }
  
  // Adicionar informações de ambiente desktop se não for Android
  if (!isAndroid) {
    if (config.showInfo.de) {
      infoLines.push(`${config.colors.labels('DE/WM')}        : ${info.de} / ${info.wm}`);
    }
    
    if (config.showInfo.terminal) {
      infoLines.push(`${config.colors.labels('Terminal')}    : ${info.terminal}`);
    }
  }
  
  // Calcular o comprimento máximo da arte ASCII
  const asciiWidth = Math.max(...asciiArt.map(line => line.length));
  
  // Exibir arte ASCII e informações lado a lado
  const maxLines = Math.max(asciiArt.length, infoLines.length);
  for (let i = 0; i < maxLines; i++) {
    let line = '';
    
    // Adicionar linha da arte ASCII se disponível e configurada para exibir
    if (config.display.showAsciiArt && i < asciiArt.length) {
      line += config.colors.ascii(asciiArt[i]);
      // Preencher com espaços para alinhar
      line += ' '.repeat(asciiWidth - asciiArt[i].length + 5);
    } else if (config.display.showAsciiArt) {
      // Se não houver mais linhas de arte ASCII, adicionar espaços
      line += ' '.repeat(asciiWidth + 5);
    }
    
    // Adicionar linha de informação se disponível
    if (i < infoLines.length) {
      line += infoLines[i];
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