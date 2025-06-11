const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BatteryUtils {
  static async getBatteryInfo() {
    const platform = os.platform();
    
    try {
      switch (platform) {
        case 'linux':
          return await this.getLinuxBatteryInfo();
        case 'darwin':
          return await this.getMacOSBatteryInfo();
        case 'win32':
          return await this.getWindowsBatteryInfo();
        case 'android':
          return await this.getAndroidBatteryInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Erro ao obter informações da bateria:', error);
      return null;
    }
  }

  static async getLinuxBatteryInfo() {
    try {
      // Verificar se o diretório /sys/class/power_supply existe
      if (!fs.existsSync('/sys/class/power_supply')) {
        return null;
      }

      const batteryDirs = fs.readdirSync('/sys/class/power_supply')
        .filter(dir => dir.startsWith('BAT'));

      if (batteryDirs.length === 0) {
        return null;
      }

      const batteryInfo = [];
      
      for (const bat of batteryDirs) {
        const basePath = `/sys/class/power_supply/${bat}`;
        
        // Ler informações da bateria
        const capacity = fs.readFileSync(path.join(basePath, 'capacity'), 'utf8').trim();
        const status = fs.readFileSync(path.join(basePath, 'status'), 'utf8').trim();
        const powerNow = fs.readFileSync(path.join(basePath, 'power_now'), 'utf8').trim();
        const energyNow = fs.readFileSync(path.join(basePath, 'energy_now'), 'utf8').trim();
        const energyFull = fs.readFileSync(path.join(basePath, 'energy_full'), 'utf8').trim();
        
        // Calcular tempo restante (se possível)
        let timeRemaining = 'Desconhecido';
        if (status === 'Discharging' && powerNow !== '0') {
          const hours = Math.floor(energyNow / powerNow);
          const minutes = Math.floor((energyNow % powerNow) / (powerNow / 60));
          timeRemaining = `${hours}h ${minutes}m`;
        }
        
        batteryInfo.push({
          name: bat,
          capacity: `${capacity}%`,
          status: status,
          power: `${(parseInt(powerNow) / 1000000).toFixed(2)}W`,
          energy: `${(parseInt(energyNow) / 1000000).toFixed(2)}Wh`,
          fullEnergy: `${(parseInt(energyFull) / 1000000).toFixed(2)}Wh`,
          timeRemaining: timeRemaining
        });
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Erro ao obter informações da bateria no Linux:', error);
      return null;
    }
  }

  static async getMacOSBatteryInfo() {
    try {
      const output = execSync('pmset -g batt').toString();
      const lines = output.split('\n');
      
      if (lines.length < 2) {
        return null;
      }
      
      const batteryInfo = [];
      const batteryLine = lines[1];
      
      // Extrair informações da bateria
      const capacityMatch = batteryLine.match(/(\d+)%/);
      const statusMatch = batteryLine.match(/(charging|discharging|AC attached)/i);
      const timeMatch = batteryLine.match(/(\d+):(\d+)/);
      
      if (capacityMatch) {
        const info = {
          name: 'BAT0',
          capacity: `${capacityMatch[1]}%`,
          status: statusMatch ? statusMatch[1] : 'Desconhecido',
          timeRemaining: timeMatch ? `${timeMatch[1]}h ${timeMatch[2]}m` : 'Desconhecido'
        };
        
        batteryInfo.push(info);
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Erro ao obter informações da bateria no macOS:', error);
      return null;
    }
  }

  static async getWindowsBatteryInfo() {
    try {
      const output = execSync('wmic path Win32_Battery get EstimatedChargeRemaining,Status,EstimatedRunTime /format:list').toString();
      const lines = output.split('\n');
      
      if (lines.length < 2) {
        return null;
      }
      
      const batteryInfo = [];
      let currentBattery = {};
      
      for (const line of lines) {
        if (line.includes('EstimatedChargeRemaining')) {
          if (Object.keys(currentBattery).length > 0) {
            batteryInfo.push(currentBattery);
          }
          currentBattery = {
            name: `BAT${batteryInfo.length}`,
            capacity: `${line.split('=')[1].trim()}%`
          };
        } else if (line.includes('Status')) {
          currentBattery.status = line.split('=')[1].trim();
        } else if (line.includes('EstimatedRunTime')) {
          const minutes = parseInt(line.split('=')[1].trim());
          if (!isNaN(minutes)) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            currentBattery.timeRemaining = `${hours}h ${remainingMinutes}m`;
          } else {
            currentBattery.timeRemaining = 'Desconhecido';
          }
        }
      }
      
      if (Object.keys(currentBattery).length > 0) {
        batteryInfo.push(currentBattery);
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Erro ao obter informações da bateria no Windows:', error);
      return null;
    }
  }

  static async getAndroidBatteryInfo() {
    try {
      // No Android, usamos o módulo android-utils existente
      const androidUtils = require('./android-utils');
      const androidInfo = await androidUtils.getAndroidInfo();
      
      if (!androidInfo || !androidInfo.batteryLevel) {
        return null;
      }
      
      return [{
        name: 'BAT0',
        capacity: androidInfo.batteryLevel,
        status: androidInfo.batteryStatus || 'Desconhecido',
        timeRemaining: androidInfo.batteryTimeRemaining || 'Desconhecido'
      }];
    } catch (error) {
      console.error('Erro ao obter informações da bateria no Android:', error);
      return null;
    }
  }
}

module.exports = BatteryUtils; 