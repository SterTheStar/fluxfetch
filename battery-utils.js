const { execSync } = require('child_process');
const { exec } = require('child_process');

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

class BatteryUtils {
  static async getBatteryInfo() {
    try {
      if (isAndroid) {
        return await this.getAndroidBatteryInfo();
      }

      const platform = process.platform;
      
      switch (platform) {
        case 'linux':
          return await this.getLinuxBatteryInfo();
        case 'darwin':
          return await this.getMacOSBatteryInfo();
        case 'win32':
          return await this.getWindowsBatteryInfo();
        default:
          return { level: 'Não suportado' };
      }
    } catch (error) {
      console.error('Erro ao obter informações da bateria:', error);
      return { level: 'Erro ao obter informações' };
    }
  }

  static async getAndroidBatteryInfo() {
    try {
      const output = await execCommand('dumpsys battery | grep level | cut -d ":" -f2 || echo "N/A"');
      return {
        level: output === 'N/A' ? 'Não disponível' : `${output.trim()}%`
      };
    } catch (error) {
      return { level: 'Não disponível' };
    }
  }

  static async getLinuxBatteryInfo() {
    try {
      // Tenta primeiro o caminho padrão do Linux
      let output = execSync('cat /sys/class/power_supply/BAT0/capacity 2>/dev/null || echo "N/A"').toString().trim();
      
      // Se não encontrar, tenta outros caminhos comuns
      if (output === 'N/A') {
        const possiblePaths = [
          '/sys/class/power_supply/BAT1/capacity',
          '/sys/class/power_supply/BAT/capacity',
          '/sys/class/power_supply/CMB0/capacity'
        ];
        
        for (const path of possiblePaths) {
          try {
            output = execSync(`cat ${path} 2>/dev/null || echo "N/A"`).toString().trim();
            if (output !== 'N/A') break;
          } catch (e) {
            continue;
          }
        }
      }
      
      return {
        level: output === 'N/A' ? 'Não disponível' : `${output}%`
      };
    } catch (error) {
      return { level: 'Não disponível' };
    }
  }

  static async getMacOSBatteryInfo() {
    try {
      const output = execSync('pmset -g batt').toString();
      const match = output.match(/(\d+)%/);
      return {
        level: match ? `${match[1]}%` : 'Não disponível'
      };
    } catch (error) {
      return { level: 'Não disponível' };
    }
  }

  static async getWindowsBatteryInfo() {
    try {
      const output = execSync('wmic path Win32_Battery get EstimatedChargeRemaining').toString();
      const match = output.match(/(\d+)/);
      return {
        level: match ? `${match[1]}%` : 'Não disponível'
      };
    } catch (error) {
      return { level: 'Não disponível' };
    }
  }
}

module.exports = BatteryUtils; 