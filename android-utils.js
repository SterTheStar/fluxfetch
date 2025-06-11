/**
 * Utilitários para obter informações específicas do Android
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Verifica se está rodando em ambiente Android
const isAndroid = process.env.ANDROID_ROOT || process.env.ANDROID_DATA;

/**
 * Executa um comando shell e retorna a saída
 * @param {string} command - Comando a ser executado
 * @returns {Promise<string>} - Saída do comando
 */
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Obtém informações detalhadas do dispositivo Android
 * @returns {Promise<Object>} - Objeto com informações do dispositivo
 */
async function getAndroidInfo() {
  if (!isAndroid) {
    return { isAndroid: false };
  }

  try {
    // Tenta obter informações usando comandos do Termux
    const deviceModel = await execCommand('getprop ro.product.model || echo "Desconhecido"');
    const deviceManufacturer = await execCommand('getprop ro.product.manufacturer || echo "Desconhecido"');
    const androidVersion = await execCommand('getprop ro.build.version.release || echo "Desconhecido"');
    const sdkVersion = await execCommand('getprop ro.build.version.sdk || echo "Desconhecido"');
    const buildId = await execCommand('getprop ro.build.id || echo "Desconhecido"');
    const buildFingerprint = await execCommand('getprop ro.build.fingerprint || echo "Desconhecido"');
    
    // Informações de bateria (se disponível)
    let batteryLevel = "Desconhecido";
    try {
      batteryLevel = await execCommand('dumpsys battery | grep level | cut -d ":" -f2 || echo "Desconhecido"');
      batteryLevel = batteryLevel.trim() + "%";
    } catch (e) {
      // Ignora erros ao obter informações da bateria
    }
    
    // Informações de rede
    let wifiInfo = "Desconhecido";
    try {
      const wifiSSID = await execCommand('dumpsys wifi | grep "SSID" | head -n 1 | cut -d \",\" -f1 || echo "Desconhecido"');
      wifiInfo = wifiSSID.replace('SSID: ', '').trim();
    } catch (e) {
      // Ignora erros ao obter informações de WiFi
    }
    
    return {
      isAndroid: true,
      model: deviceModel,
      manufacturer: deviceManufacturer,
      androidVersion,
      sdkVersion,
      buildId,
      buildFingerprint,
      batteryLevel,
      wifiInfo
    };
  } catch (error) {
    console.error('Erro ao obter informações do Android:', error);
    
    // Retorna informações básicas em caso de erro
    return {
      isAndroid: true,
      model: process.env.ANDROID_DEVICE || 'Dispositivo Android',
      manufacturer: 'Desconhecido',
      androidVersion: process.env.ANDROID_VERSION || 'Desconhecido',
      sdkVersion: process.env.ANDROID_SDK_VERSION || 'Desconhecido',
      buildId: process.env.ANDROID_BUILD_ID || 'Desconhecido',
      buildFingerprint: 'Desconhecido',
      batteryLevel: 'Desconhecido',
      wifiInfo: 'Desconhecido'
    };
  }
}

/**
 * Obtém informações de hardware do dispositivo Android
 * @returns {Promise<Object>} - Objeto com informações de hardware
 */
async function getAndroidHardwareInfo() {
  if (!isAndroid) {
    return { isAndroid: false };
  }
  
  try {
    // CPU info
    const cpuInfo = await execCommand('cat /proc/cpuinfo || echo "Desconhecido"');
    const cpuModel = cpuInfo.split('\n')
      .find(line => line.includes('model name') || line.includes('Processor'))
      ?.split(':')[1]?.trim() || 'Desconhecido';
    
    // Número de cores
    const cpuCores = await execCommand('grep -c processor /proc/cpuinfo || echo "1"');
    
    // Memória total
    const memInfo = await execCommand('cat /proc/meminfo || echo "Desconhecido"');
    const memTotal = memInfo.split('\n')
      .find(line => line.includes('MemTotal'))
      ?.split(':')[1]?.trim() || 'Desconhecido';
    
    // Espaço de armazenamento
    const storageInfo = await execCommand('df -h /storage/emulated/0 || df -h /sdcard || echo "Desconhecido"');
    const storageLines = storageInfo.split('\n');
    let storageTotal = 'Desconhecido';
    let storageUsed = 'Desconhecido';
    let storageAvailable = 'Desconhecido';
    
    if (storageLines.length > 1) {
      const storageParts = storageLines[1].split(/\s+/);
      if (storageParts.length >= 6) {
        storageTotal = storageParts[1];
        storageUsed = storageParts[2];
        storageAvailable = storageParts[3];
      }
    }
    
    return {
      isAndroid: true,
      cpu: {
        model: cpuModel,
        cores: parseInt(cpuCores) || 1
      },
      memory: {
        total: memTotal
      },
      storage: {
        total: storageTotal,
        used: storageUsed,
        available: storageAvailable
      }
    };
  } catch (error) {
    console.error('Erro ao obter informações de hardware do Android:', error);
    return {
      isAndroid: true,
      cpu: {
        model: 'Desconhecido',
        cores: 'Desconhecido'
      },
      memory: {
        total: 'Desconhecido'
      },
      storage: {
        total: 'Desconhecido',
        used: 'Desconhecido',
        available: 'Desconhecido'
      }
    };
  }
}

module.exports = {
  isAndroid,
  getAndroidInfo,
  getAndroidHardwareInfo
};