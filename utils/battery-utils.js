const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if running on Android
const isAndroid = process.env.ANDROID_ROOT || process.env.ANDROID_DATA;

class BatteryUtils {
  static async getBatteryInfo() {
    try {
      if (isAndroid) {
        return await this.getAndroidBatteryInfo();
      }

      const platform = os.platform();
      switch (platform) {
        case 'linux':
          return await this.getLinuxBatteryInfo();
        case 'darwin':
          return await this.getMacOSBatteryInfo();
        case 'win32':
          return await this.getWindowsBatteryInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting battery information:', error);
      return null;
    }
  }

  static async getLinuxBatteryInfo() {
    try {
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
        
        const capacity = fs.readFileSync(path.join(basePath, 'capacity'), 'utf8').trim();
        const status = fs.readFileSync(path.join(basePath, 'status'), 'utf8').trim();
        const powerNow = fs.readFileSync(path.join(basePath, 'power_now'), 'utf8').trim();
        const energyNow = fs.readFileSync(path.join(basePath, 'energy_now'), 'utf8').trim();
        const energyFull = fs.readFileSync(path.join(basePath, 'energy_full'), 'utf8').trim();
        
        let voltage = 'Unknown';
        let temperature = 'Unknown';
        let current = 'Unknown';
        
        if (fs.existsSync(path.join(basePath, 'voltage_now'))) {
          const voltageValue = parseInt(fs.readFileSync(path.join(basePath, 'voltage_now'), 'utf8').trim());
          voltage = `${(voltageValue / 1000000).toFixed(2)}V`;
        }
        
        if (fs.existsSync(path.join(basePath, 'temp'))) {
          const tempValue = parseInt(fs.readFileSync(path.join(basePath, 'temp'), 'utf8').trim());
          temperature = `${(tempValue / 10).toFixed(1)}°C`;
        }

        if (fs.existsSync(path.join(basePath, 'current_now'))) {
          const currentValue = parseInt(fs.readFileSync(path.join(basePath, 'current_now'), 'utf8').trim());
          current = `${(currentValue / 1000).toFixed(0)}mA`;
        }
        
        let timeRemaining = 'Unknown';
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
          timeRemaining: timeRemaining,
          voltage: voltage,
          temperature: temperature,
          current: current
        });
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Error getting battery information on Linux:', error);
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
      
      const capacityMatch = batteryLine.match(/(\d+)%/);
      const statusMatch = batteryLine.match(/(charging|discharging|AC attached)/i);
      const timeMatch = batteryLine.match(/(\d+):(\d+)/);
      
      let temperature = 'Unknown';
      let voltage = 'Unknown';
      
      try {
        const ioregOutput = execSync('ioreg -l | grep -i "battery"').toString();
        const tempMatch = ioregOutput.match(/"Temperature"=(\d+)/);
        const voltageMatch = ioregOutput.match(/"Voltage"=(\d+)/);
        
        if (tempMatch) {
          temperature = `${(parseInt(tempMatch[1]) / 100).toFixed(1)}°C`;
        }
        if (voltageMatch) {
          voltage = `${(parseInt(voltageMatch[1]) / 1000).toFixed(2)}V`;
        }
      } catch (error) {
        console.error('Error getting detailed battery info on macOS:', error);
      }
      
      if (capacityMatch) {
        const info = {
          name: 'BAT0',
          capacity: `${capacityMatch[1]}%`,
          status: statusMatch ? statusMatch[1] : 'Unknown',
          timeRemaining: timeMatch ? `${timeMatch[1]}h ${timeMatch[2]}m` : 'Unknown',
          temperature: temperature,
          voltage: voltage
        };
        
        batteryInfo.push(info);
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Error getting battery information on macOS:', error);
      return null;
    }
  }

  static async getWindowsBatteryInfo() {
    try {
      const output = execSync('wmic path Win32_Battery get EstimatedChargeRemaining,Status,EstimatedRunTime,DesignVoltage,Voltage /format:list').toString();
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
            currentBattery.timeRemaining = 'Unknown';
          }
        } else if (line.includes('Voltage')) {
          const voltage = parseInt(line.split('=')[1].trim());
          if (!isNaN(voltage)) {
            currentBattery.voltage = `${(voltage / 1000).toFixed(2)}V`;
          }
        }
      }
      
      currentBattery.temperature = 'N/A';
      
      if (Object.keys(currentBattery).length > 0) {
        batteryInfo.push(currentBattery);
      }
      
      return batteryInfo;
    } catch (error) {
      console.error('Error getting battery information on Windows:', error);
      return null;
    }
  }

  static async getAndroidBatteryInfo() {
    try {
      const batteryPath = '/sys/class/power_supply/battery';
      
      if (!fs.existsSync(batteryPath)) {
        return null;
      }
      
      const batteryInfo = [];
      const info = {
        name: 'BAT0',
        capacity: '0%',
        status: 'Unknown',
        temperature: '0°C',
        voltage: '0V',
        current: '0mA',
        power: '0W'
      };

      try {
        // Capacidade
        if (fs.existsSync(path.join(batteryPath, 'capacity'))) {
          const capacity = fs.readFileSync(path.join(batteryPath, 'capacity'), 'utf8').trim();
          info.capacity = `${capacity}%`;
        }
        
        // Status
        if (fs.existsSync(path.join(batteryPath, 'status'))) {
          const status = fs.readFileSync(path.join(batteryPath, 'status'), 'utf8').trim();
          info.status = status;
        }
        
        // Temperatura
        if (fs.existsSync(path.join(batteryPath, 'temp'))) {
          const temp = parseInt(fs.readFileSync(path.join(batteryPath, 'temp'), 'utf8').trim());
          info.temperature = `${(temp / 10).toFixed(1)}°C`;
        }
        
        // Voltagem
        if (fs.existsSync(path.join(batteryPath, 'voltage_now'))) {
          const voltage = parseInt(fs.readFileSync(path.join(batteryPath, 'voltage_now'), 'utf8').trim());
          info.voltage = `${(voltage / 1000000).toFixed(2)}V`;
        }

        // Corrente
        if (fs.existsSync(path.join(batteryPath, 'current_now'))) {
          const current = parseInt(fs.readFileSync(path.join(batteryPath, 'current_now'), 'utf8').trim());
          info.current = `${(current / 1000).toFixed(0)}mA`;
        }

        // Potência
        if (fs.existsSync(path.join(batteryPath, 'power_now'))) {
          const power = parseInt(fs.readFileSync(path.join(batteryPath, 'power_now'), 'utf8').trim());
          info.power = `${(power / 1000000).toFixed(2)}W`;
        }

        batteryInfo.push(info);
        return batteryInfo;
      } catch (error) {
        console.error('Error reading battery files:', error);
        return null;
      }
    } catch (error) {
      console.error('Error getting battery information on Android:', error);
      return null;
    }
  }
}

module.exports = BatteryUtils; 