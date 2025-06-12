const os = require('os');
const { execSync } = require('child_process');
const si = require('systeminformation');
const fs = require('fs');

class GpuUtils {
  static async getGpuInfo() {
    const platform = os.platform();
    
    try {
      // Verificar se está rodando no Android
      if (process.env.ANDROID_ROOT || process.env.ANDROID_DATA) {
        return await this.getAndroidGpuInfo();
      }

      switch (platform) {
        case 'linux':
          return await this.getLinuxGpuInfo();
        case 'darwin':
          return await this.getMacOSGpuInfo();
        case 'win32':
          return await this.getWindowsGpuInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting GPU information:', error);
      return null;
    }
  }

  static async getAndroidGpuInfo() {
    try {
      const gpuInfo = [];
      
      // Tentar obter informações via systeminformation
      try {
        const graphics = await si.graphics();
        if (graphics.controllers && graphics.controllers.length > 0) {
          for (const controller of graphics.controllers) {
            if (controller.model) {
              // Remover duplicação de nomes
              const model = controller.model.replace(/(Adreno|Mali|PowerVR)\s+\1/i, '$1');
              gpuInfo.push(model);
            }
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via systeminformation:', error);
      }

      // Tentar obter informações via arquivos do sistema
      try {
        // Verificar GPU Mali
        if (fs.existsSync('/sys/class/misc/mali0/device/gpuinfo')) {
          const maliInfo = fs.readFileSync('/sys/class/misc/mali0/device/gpuinfo', 'utf8').trim();
          if (maliInfo) {
            // Tentar obter o clock da GPU Mali
            let clock = '';
            try {
              if (fs.existsSync('/sys/class/misc/mali0/device/clock')) {
                const clockInfo = fs.readFileSync('/sys/class/misc/mali0/device/clock', 'utf8').trim();
                if (clockInfo) {
                  clock = ` @ ${clockInfo} MHz`;
                }
              }
            } catch (error) {
              // Ignorar erro silenciosamente
            }
            gpuInfo.push(`Mali ${maliInfo}${clock}`);
          }
        }

        // Verificar GPU Adreno
        if (fs.existsSync('/sys/class/kgsl/kgsl-3d0/gpu_model')) {
          const adrenoInfo = fs.readFileSync('/sys/class/kgsl/kgsl-3d0/gpu_model', 'utf8').trim();
          if (adrenoInfo) {
            // Remover "Adreno" se já estiver no início
            const model = adrenoInfo.replace(/^Adreno\s*/i, '');
            // Tentar obter o clock da GPU Adreno
            let clock = '';
            try {
              if (fs.existsSync('/sys/class/kgsl/kgsl-3d0/gpuclk')) {
                const clockInfo = fs.readFileSync('/sys/class/kgsl/kgsl-3d0/gpuclk', 'utf8').trim();
                if (clockInfo) {
                  // Converter para MHz
                  const clockMHz = Math.round(parseInt(clockInfo) / 1000000);
                  clock = ` @ ${clockMHz} MHz`;
                }
              }
            } catch (error) {
              // Ignorar erro silenciosamente
            }
            gpuInfo.push(`Adreno ${model}${clock}`);
          }
        }

        // Verificar GPU PowerVR
        if (fs.existsSync('/sys/class/pvr_sync/gpuinfo')) {
          const powervrInfo = fs.readFileSync('/sys/class/pvr_sync/gpuinfo', 'utf8').trim();
          if (powervrInfo) {
            // Tentar obter o clock da GPU PowerVR
            let clock = '';
            try {
              if (fs.existsSync('/sys/class/pvr_sync/gpuclk')) {
                const clockInfo = fs.readFileSync('/sys/class/pvr_sync/gpuclk', 'utf8').trim();
                if (clockInfo) {
                  // Converter para MHz
                  const clockMHz = Math.round(parseInt(clockInfo) / 1000000);
                  clock = ` @ ${clockMHz} MHz`;
                }
              }
            } catch (error) {
              // Ignorar erro silenciosamente
            }
            gpuInfo.push(`PowerVR ${powervrInfo}${clock}`);
          }
        }

        // Verificar GPU via /proc/gpuinfo
        if (fs.existsSync('/proc/gpuinfo')) {
          const gpuInfoContent = fs.readFileSync('/proc/gpuinfo', 'utf8');
          const maliMatch = gpuInfoContent.match(/Mali-(\w+)/);
          const adrenoMatch = gpuInfoContent.match(/Adreno\s*(\d+)/);
          const powervrMatch = gpuInfoContent.match(/PowerVR\s*(\w+)/);
          
          if (maliMatch) {
            gpuInfo.push(`Mali-${maliMatch[1]}`);
          }
          if (adrenoMatch) {
            gpuInfo.push(`Adreno ${adrenoMatch[1]}`);
          }
          if (powervrMatch) {
            gpuInfo.push(`PowerVR ${powervrMatch[1]}`);
          }
        }

        // Verificar GPU via /sys/devices
        try {
          const devices = fs.readdirSync('/sys/devices');
          for (const device of devices) {
            if (device.includes('gpu') || device.includes('mali') || device.includes('adreno')) {
              const devicePath = `/sys/devices/${device}`;
              if (fs.existsSync(`${devicePath}/name`)) {
                const name = fs.readFileSync(`${devicePath}/name`, 'utf8').trim();
                if (name) {
                  // Remover duplicação de nomes
                  const model = name.replace(/(Adreno|Mali|PowerVR)\s+\1/i, '$1');
                  gpuInfo.push(model);
                }
              }
            }
          }
        } catch (error) {
          // Ignorar erro silenciosamente
        }

        // Verificar GPU via /sys/class/drm
        try {
          const drmDevices = fs.readdirSync('/sys/class/drm').filter(device => 
            device.startsWith('card') && !device.includes('-')
          );
          
          for (const device of drmDevices) {
            try {
              const devicePath = `/sys/class/drm/${device}/device`;
              if (fs.existsSync(`${devicePath}/name`)) {
                const name = fs.readFileSync(`${devicePath}/name`, 'utf8').trim();
                if (name) {
                  // Remover duplicação de nomes
                  const model = name.replace(/(Adreno|Mali|PowerVR)\s+\1/i, '$1');
                  gpuInfo.push(model);
                }
              }
            } catch (error) {
              // Ignorar erro silenciosamente
            }
          }
        } catch (error) {
          // Ignorar erro silenciosamente
        }
      } catch (error) {
        console.error('Error reading GPU system files:', error);
      }

      // Remover duplicatas e retornar
      const uniqueGpuInfo = [...new Set(gpuInfo)];
      // Se houver múltiplas entradas, tentar encontrar a mais específica
      if (uniqueGpuInfo.length > 1) {
        // Priorizar entradas que contêm números (geralmente mais específicas)
        const specificEntry = uniqueGpuInfo.find(entry => /\d/.test(entry));
        if (specificEntry) {
          return specificEntry;
        }
      }
      return uniqueGpuInfo.join(', ') || null;
    } catch (error) {
      console.error('Error getting GPU information on Android:', error);
      return null;
    }
  }

  static async getLinuxGpuInfo() {
    try {
      const gpuInfo = new Set();
      let gpuClock = null;
      
      // Tentar obter informações via glxinfo primeiro (prioridade)
      try {
        const glxOutput = execSync('glxinfo 2>/dev/null | grep "OpenGL renderer"').toString();
        const rendererMatch = glxOutput.match(/OpenGL renderer string: (.*)/);
        if (rendererMatch) {
          const renderer = rendererMatch[1].trim();
          // Extrair apenas o modelo principal
          const modelMatch = renderer.match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
          if (modelMatch) {
            gpuInfo.add(modelMatch[1]);
          } else {
            gpuInfo.add(renderer);
          }
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
      
      // Tentar obter o clock da GPU
      try {
        // Para NVIDIA
        if (fs.existsSync('/sys/class/drm/card0/device/hwmon/hwmon0/device/gpu_busy_percent')) {
          const nvidiaClock = execSync('nvidia-smi --query-gpu=clocks.current.graphics --format=csv,noheader,nounits 2>/dev/null').toString().trim();
          if (nvidiaClock) {
            gpuClock = `${nvidiaClock} MHz`;
          }
        }
        // Para AMD
        else if (fs.existsSync('/sys/class/drm/card0/device/hwmon/hwmon0/device/gpu_busy_percent')) {
          const amdClock = fs.readFileSync('/sys/class/drm/card0/device/hwmon/hwmon0/device/gpu_busy_percent', 'utf8').trim();
          if (amdClock) {
            gpuClock = `${amdClock} MHz`;
          }
        }
        // Para Intel
        else if (fs.existsSync('/sys/class/drm/card0/device/hwmon/hwmon0/device/gpu_busy_percent')) {
          const intelClock = fs.readFileSync('/sys/class/drm/card0/device/hwmon/hwmon0/device/gpu_busy_percent', 'utf8').trim();
          if (intelClock) {
            gpuClock = `${intelClock} MHz`;
          }
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
      
      // Tentar obter informações via systeminformation
      try {
        const graphics = await si.graphics();
        if (graphics.controllers && graphics.controllers.length > 0) {
          for (const controller of graphics.controllers) {
            if (controller.model) {
              // Extrair apenas o modelo principal
              const modelMatch = controller.model.match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
              if (modelMatch) {
                gpuInfo.add(modelMatch[1]);
              } else {
                gpuInfo.add(controller.model);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via systeminformation:', error);
      }
      
      // Tentar via lspci
      try {
        const lspciOutput = execSync('lspci -v 2>/dev/null | grep -i "vga\\|3d"').toString();
        const gpuLines = lspciOutput.split('\n').filter(line => line.trim());
        
        for (const line of gpuLines) {
          const match = line.match(/(?:VGA|3D).*:\s*(.*)/i);
          if (match) {
            const gpuName = match[1].trim();
            // Extrair apenas o modelo principal
            const modelMatch = gpuName.match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
            if (modelMatch) {
              gpuInfo.add(modelMatch[1]);
            } else {
              gpuInfo.add(gpuName);
            }
          }
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
      
      // Tentar via /sys/class/drm
      try {
        const drmDevices = fs.readdirSync('/sys/class/drm').filter(device => 
          device.startsWith('card') && !device.includes('-')
        );
        
        for (const device of drmDevices) {
          try {
            const devicePath = `/sys/class/drm/${device}/device/vendor`;
            if (fs.existsSync(devicePath)) {
              const vendor = fs.readFileSync(devicePath, 'utf8').trim();
              if (vendor === '0x10de') {
                gpuInfo.add('NVIDIA GPU');
              } else if (vendor === '0x1002') {
                gpuInfo.add('AMD GPU');
              } else if (vendor === '0x8086') {
                gpuInfo.add('Intel GPU');
              }
            }
          } catch (error) {
            // Ignorar erro silenciosamente
          }
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
      
      // Converter Set para Array e remover duplicatas
      const uniqueGpuInfo = [...gpuInfo];
      
      // Se tivermos múltiplas entradas, priorizar a mais específica
      if (uniqueGpuInfo.length > 1) {
        // Procurar por entradas que contêm "AMD Radeon RX"
        const amdEntry = uniqueGpuInfo.find(entry => entry.includes('AMD Radeon RX'));
        if (amdEntry) {
          return amdEntry;
        }
        // Se não encontrar, retornar a primeira entrada
        return uniqueGpuInfo[0];
      }
      
      return uniqueGpuInfo.length > 0 ? uniqueGpuInfo[0] : null;
    } catch (error) {
      console.error('Error getting GPU information on Linux:', error);
      return null;
    }
  }

  static async getMacOSGpuInfo() {
    try {
      const gpuInfo = [];
      let gpuClock = null;
      
      // Tentar obter informações via system_profiler
      try {
        const output = execSync('system_profiler SPDisplaysDataType').toString();
        const gpuMatch = output.match(/Chipset Model: (.*)/);
        if (gpuMatch) {
          gpuInfo.push(gpuMatch[1].trim());
        }
        
        // Tentar obter o clock da GPU
        const clockMatch = output.match(/Core Clock: (.*)/);
        if (clockMatch) {
          gpuClock = clockMatch[1].trim();
        }
      } catch (error) {
        console.error('Error getting GPU info via system_profiler:', error);
      }
      
      // Tentar obter informações via systeminformation
      try {
        const graphics = await si.graphics();
        if (graphics.controllers && graphics.controllers.length > 0) {
          for (const controller of graphics.controllers) {
            if (controller.model) {
              gpuInfo.push(controller.model);
            }
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via systeminformation:', error);
      }
      
      // Remover duplicatas e retornar
      const uniqueGpuInfo = [...new Set(gpuInfo)];
      return uniqueGpuInfo.length > 0 ? `${uniqueGpuInfo[0]}${gpuClock ? ` @ ${gpuClock}` : ''}` : null;
    } catch (error) {
      console.error('Error getting GPU information on macOS:', error);
      return null;
    }
  }

  static async getWindowsGpuInfo() {
    try {
      const gpuInfo = [];
      let gpuClock = null;
      
      // Tentar obter informações via PowerShell
      try {
        const output = execSync('powershell -Command "Get-WmiObject -Class Win32_VideoController | Select-Object Name,CurrentClockSpeed | ConvertTo-Json"').toString();
        const gpus = JSON.parse(output);
        const gpuArray = Array.isArray(gpus) ? gpus : [gpus];
        
        for (const gpu of gpuArray) {
          if (gpu.Name) {
            gpuInfo.push(gpu.Name);
            if (gpu.CurrentClockSpeed && !isNaN(parseInt(gpu.CurrentClockSpeed))) {
              gpuClock = `${gpu.CurrentClockSpeed} MHz`;
            }
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via PowerShell:', error);
      }
      
      // Tentar obter informações via systeminformation
      try {
        const graphics = await si.graphics();
        if (graphics.controllers && graphics.controllers.length > 0) {
          for (const controller of graphics.controllers) {
            if (controller.model) {
              gpuInfo.push(controller.model);
            }
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via systeminformation:', error);
      }
      
      // Remover duplicatas e retornar todas as GPUs
      const uniqueGpuInfo = [...new Set(gpuInfo)];
      return uniqueGpuInfo.length > 0 ? uniqueGpuInfo.join(', ') : null;
    } catch (error) {
      console.error('Error getting GPU information on Windows:', error);
      return null;
    }
  }
}

module.exports = GpuUtils; 