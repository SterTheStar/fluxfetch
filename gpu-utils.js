const os = require('os');
const { execSync } = require('child_process');
const si = require('systeminformation');
const fs = require('fs');

class GpuUtils {
  static async getGpuInfo() {
    const platform = os.platform();
    
    try {
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

  static async getLinuxGpuInfo() {
    try {
      const gpuInfo = new Set();
      let mainGpuInfo = null;
      
      // Tentar obter informações via glxinfo primeiro (prioridade)
      try {
        const glxOutput = execSync('glxinfo 2>/dev/null | grep "OpenGL renderer"').toString();
        const rendererMatch = glxOutput.match(/OpenGL renderer string: (.*)/);
        if (rendererMatch) {
          const renderer = rendererMatch[1].trim();
          // Extrair apenas o modelo principal (AMD Radeon RX XXX / XXX Series)
          const modelMatch = renderer.match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
          if (modelMatch) {
            mainGpuInfo = modelMatch[1];
          }
        }
      } catch (error) {
        // Ignorar erro silenciosamente
      }
      
      // Se não encontrou via glxinfo, tentar outras fontes
      if (!mainGpuInfo) {
        // Tentar obter informações via systeminformation
        try {
          const graphics = await si.graphics();
          if (graphics.controllers && graphics.controllers.length > 0) {
            for (const controller of graphics.controllers) {
              if (controller.model) {
                const modelMatch = controller.model.match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
                if (modelMatch) {
                  mainGpuInfo = modelMatch[1];
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error getting GPU info via systeminformation:', error);
        }
      }
      
      // Se ainda não encontrou, tentar via lspci
      if (!mainGpuInfo) {
        try {
          const lspciOutput = execSync('lspci -v 2>/dev/null | grep -i "vga\\|3d"').toString();
          const gpuLines = lspciOutput.split('\n').filter(line => line.trim());
          
          for (const line of gpuLines) {
            const match = line.match(/(?:VGA|3D).*:\s*(.*)/i);
            if (match) {
              const modelMatch = match[1].match(/(AMD Radeon RX \d+ \/ \d+ Series)/);
              if (modelMatch) {
                mainGpuInfo = modelMatch[1];
                break;
              }
            }
          }
        } catch (error) {
          // Ignorar erro silenciosamente
        }
      }
      
      // Se ainda não encontrou, usar fallback genérico
      if (!mainGpuInfo) {
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
                  mainGpuInfo = 'NVIDIA GPU';
                } else if (vendor === '0x1002') {
                  mainGpuInfo = 'AMD GPU';
                } else if (vendor === '0x8086') {
                  mainGpuInfo = 'Intel GPU';
                }
                break;
              }
            } catch (error) {
              // Ignorar erro silenciosamente
            }
          }
        } catch (error) {
          // Ignorar erro silenciosamente
        }
      }
      
      return mainGpuInfo || null;
    } catch (error) {
      console.error('Error getting GPU information on Linux:', error);
      return null;
    }
  }

  static async getMacOSGpuInfo() {
    try {
      const gpuInfo = [];
      
      // Tentar obter informações via system_profiler
      try {
        const output = execSync('system_profiler SPDisplaysDataType').toString();
        const gpuMatch = output.match(/Chipset Model: (.*)/);
        if (gpuMatch) {
          gpuInfo.push(gpuMatch[1].trim());
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
      return [...new Set(gpuInfo)].join(', ') || null;
    } catch (error) {
      console.error('Error getting GPU information on macOS:', error);
      return null;
    }
  }

  static async getWindowsGpuInfo() {
    try {
      const gpuInfo = [];
      
      // Tentar obter informações via wmic
      try {
        const output = execSync('wmic path win32_VideoController get name').toString();
        const gpuLines = output.split('\n').slice(1).filter(line => line.trim());
        
        for (const line of gpuLines) {
          const gpuName = line.trim();
          if (gpuName) {
            gpuInfo.push(gpuName);
          }
        }
      } catch (error) {
        console.error('Error getting GPU info via wmic:', error);
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
      return [...new Set(gpuInfo)].join(', ') || null;
    } catch (error) {
      console.error('Error getting GPU information on Windows:', error);
      return null;
    }
  }
}

module.exports = GpuUtils; 