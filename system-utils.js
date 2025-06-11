const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SystemUtils {
  static async getAdditionalInfo() {
    const platform = os.platform();
    
    try {
      const info = {
        packages: await this.getPackageInfo(),
        display: await this.getDisplayInfo(),
        theme: await this.getThemeInfo(),
        locale: this.getLocaleInfo(),
        network: await this.getNetworkInfo(),
        swap: await this.getSwapInfo()
      };

      return info;
    } catch (error) {
      console.error('Error getting additional information:', error);
      return {};
    }
  }

  static async getPackageInfo() {
    const platform = os.platform();
    
    try {
      switch (platform) {
        case 'linux':
          return await this.getLinuxPackageInfo();
        case 'darwin':
          return await this.getMacOSPackageInfo();
        case 'win32':
          return await this.getWindowsPackageInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting package information:', error);
      return null;
    }
  }

  static async getLinuxPackageInfo() {
    try {
      const packageInfo = [];
      
      // Check pacman (Arch Linux)
      if (fs.existsSync('/usr/bin/pacman')) {
        const pacmanCount = execSync('pacman -Qq | wc -l').toString().trim();
        packageInfo.push(`${pacmanCount} (pacman)`);
      }
      
      // Check apt (Debian/Ubuntu)
      if (fs.existsSync('/usr/bin/apt')) {
        const aptCount = execSync('dpkg -l | grep -c "^ii"').toString().trim();
        packageInfo.push(`${aptCount} (apt)`);
      }
      
      // Check dnf (Fedora)
      if (fs.existsSync('/usr/bin/dnf')) {
        const dnfCount = execSync('dnf list installed | wc -l').toString().trim();
        packageInfo.push(`${dnfCount} (dnf)`);
      }
      
      // Check flatpak
      if (fs.existsSync('/usr/bin/flatpak')) {
        const flatpakCount = execSync('flatpak list | wc -l').toString().trim();
        packageInfo.push(`${flatpakCount} (flatpak)`);
      }
      
      // Check snap
      if (fs.existsSync('/usr/bin/snap')) {
        const snapCount = execSync('snap list | wc -l').toString().trim();
        packageInfo.push(`${snapCount} (snap)`);
      }
      
      return packageInfo.join(', ');
    } catch (error) {
      console.error('Error getting package information on Linux:', error);
      return null;
    }
  }

  static async getMacOSPackageInfo() {
    try {
      const packageInfo = [];
      
      // Check Homebrew
      if (fs.existsSync('/usr/local/bin/brew')) {
        const brewCount = execSync('brew list | wc -l').toString().trim();
        packageInfo.push(`${brewCount} (brew)`);
      }
      
      // Check MacPorts
      if (fs.existsSync('/opt/local/bin/port')) {
        const portCount = execSync('port installed | wc -l').toString().trim();
        packageInfo.push(`${portCount} (port)`);
      }
      
      return packageInfo.join(', ');
    } catch (error) {
      console.error('Error getting package information on macOS:', error);
      return null;
    }
  }

  static async getWindowsPackageInfo() {
    try {
      const packageInfo = [];
      
      // Check Chocolatey
      if (fs.existsSync('C:\\ProgramData\\chocolatey\\bin\\choco.exe')) {
        const chocoCount = execSync('choco list --local-only | findstr /c:" packages installed"').toString().trim();
        packageInfo.push(`${chocoCount} (choco)`);
      }
      
      // Check Scoop
      if (fs.existsSync('C:\\Users\\' + os.userInfo().username + '\\scoop\\apps\\scoop\\current\\bin\\scoop.ps1')) {
        const scoopCount = execSync('scoop list | findstr /c:" packages installed"').toString().trim();
        packageInfo.push(`${scoopCount} (scoop)`);
      }
      
      return packageInfo.join(', ');
    } catch (error) {
      console.error('Error getting package information on Windows:', error);
      return null;
    }
  }

  static async getDisplayInfo() {
    try {
      const platform = os.platform();
      
      switch (platform) {
        case 'linux':
          return await this.getLinuxDisplayInfo();
        case 'darwin':
          return await this.getMacOSDisplayInfo();
        case 'win32':
          return await this.getWindowsDisplayInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting display information:', error);
      return null;
    }
  }

  static async getLinuxDisplayInfo() {
    try {
      const output = execSync('xrandr --current').toString();
      const displays = [];
      
      for (const line of output.split('\n')) {
        if (line.includes(' connected ')) {
          const [name, ...rest] = line.split(' ');
          const resolutionMatch = rest.join(' ').match(/(\d+)x(\d+)/);
          const refreshMatch = rest.join(' ').match(/(\d+\.?\d*)Hz/);
          const sizeMatch = rest.join(' ').match(/(\d+)mm x (\d+)mm/);
          
          if (resolutionMatch) {
            const display = {
              name: name,
              resolution: `${resolutionMatch[1]}x${resolutionMatch[2]}`,
              refresh: refreshMatch ? `${refreshMatch[1]} Hz` : null,
              size: sizeMatch ? `${sizeMatch[1]}"` : null
            };
            
            displays.push(display);
          }
        }
      }
      
      return displays;
    } catch (error) {
      console.error('Error getting display information on Linux:', error);
      return null;
    }
  }

  static async getMacOSDisplayInfo() {
    try {
      const output = execSync('system_profiler SPDisplaysDataType').toString();
      const displays = [];
      
      for (const line of output.split('\n')) {
        if (line.includes('Resolution:')) {
          const resolutionMatch = line.match(/(\d+) x (\d+)/);
          const refreshMatch = line.match(/(\d+) Hz/);
          const sizeMatch = line.match(/(\d+) inch/);
          
          if (resolutionMatch) {
            const display = {
              name: 'Display',
              resolution: `${resolutionMatch[1]}x${resolutionMatch[2]}`,
              refresh: refreshMatch ? `${refreshMatch[1]} Hz` : null,
              size: sizeMatch ? `${sizeMatch[1]}"` : null
            };
            
            displays.push(display);
          }
        }
      }
      
      return displays;
    } catch (error) {
      console.error('Error getting display information on macOS:', error);
      return null;
    }
  }

  static async getWindowsDisplayInfo() {
    try {
      const output = execSync('wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate,Name').toString();
      const displays = [];
      
      for (const line of output.split('\n').slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const display = {
            name: parts.slice(3).join(' '),
            resolution: `${parts[0]}x${parts[1]}`,
            refresh: parts[2] !== '0' ? `${parts[2]} Hz` : null
          };
          
          displays.push(display);
        }
      }
      
      return displays;
    } catch (error) {
      console.error('Error getting display information on Windows:', error);
      return null;
    }
  }

  static async getThemeInfo() {
    try {
      const platform = os.platform();
      
      switch (platform) {
        case 'linux':
          return await this.getLinuxThemeInfo();
        case 'darwin':
          return await this.getMacOSThemeInfo();
        case 'win32':
          return await this.getWindowsThemeInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting theme information:', error);
      return null;
    }
  }

  static async getLinuxThemeInfo() {
    try {
      const themeInfo = {};
      
      // Detect desktop environment
      const de = process.env.DESKTOP_SESSION || process.env.XDG_CURRENT_DESKTOP;
      if (de) {
          themeInfo.de = de;
      }

      // Detect window manager
      if (process.env.XDG_SESSION_TYPE) {
        themeInfo.wm = process.env.XDG_SESSION_TYPE.toUpperCase();
      } else if (process.env.WINDOWMANAGER) {
        themeInfo.wm = process.env.WINDOWMANAGER;
      }

      // Mapeamento de ambientes desktop para seus comandos de configuração
      const desktopConfigs = {
        'KDE': {
          theme: 'kreadconfig5 --group Theme --key name',
          icons: 'kreadconfig5 --group Icons --key Theme',
          font: 'kreadconfig5 --group General --key font',
          cursor: 'kreadconfig5 --group Mouse --key cursorTheme',
          wmTheme: 'kreadconfig5 --group WM --key theme'
        },
        'GNOME': {
          theme: 'gsettings get org.gnome.desktop.interface gtk-theme',
          icons: 'gsettings get org.gnome.desktop.interface icon-theme',
          font: 'gsettings get org.gnome.desktop.interface font-name',
          cursor: 'gsettings get org.gnome.desktop.interface cursor-theme'
        },
        'XFCE': {
          theme: 'xfconf-query -c xsettings -p /Net/ThemeName',
          icons: 'xfconf-query -c xsettings -p /Net/IconThemeName',
          font: 'xfconf-query -c xsettings -p /Gtk/FontName',
          cursor: 'xfconf-query -c xsettings -p /Gtk/CursorThemeName'
        },
        'CINNAMON': {
          theme: 'gsettings get org.cinnamon.desktop.interface gtk-theme',
          icons: 'gsettings get org.cinnamon.desktop.interface icon-theme',
          font: 'gsettings get org.cinnamon.desktop.interface font-name',
          cursor: 'gsettings get org.cinnamon.desktop.interface cursor-theme'
        },
        'MATE': {
          theme: 'gsettings get org.mate.interface gtk-theme',
          icons: 'gsettings get org.mate.interface icon-theme',
          font: 'gsettings get org.mate.interface font-name',
          cursor: 'gsettings get org.mate.interface cursor-theme'
        },
        'BUDGIE': {
          theme: 'gsettings get org.gnome.desktop.interface gtk-theme',
          icons: 'gsettings get org.gnome.desktop.interface icon-theme',
          font: 'gsettings get org.gnome.desktop.interface font-name',
          cursor: 'gsettings get org.gnome.desktop.interface cursor-theme'
        },
        'LXDE': {
          theme: 'lxappearance --print-theme',
          icons: 'lxappearance --print-icon-theme',
          font: 'lxappearance --print-font',
          cursor: 'lxappearance --print-cursor-theme'
        },
        'LXQT': {
          theme: 'lxqt-config-appearance --print-theme',
          icons: 'lxqt-config-appearance --print-icon-theme',
          font: 'lxqt-config-appearance --print-font',
          cursor: 'lxqt-config-appearance --print-cursor-theme'
        }
      };

      // Identificar o ambiente desktop atual
      let currentDE = null;
      if (de) {
        const deLower = de.toLowerCase();
        for (const [key, value] of Object.entries(desktopConfigs)) {
          if (deLower.includes(key.toLowerCase())) {
            currentDE = key;
            break;
          }
        }
      }

      // Se encontrou um ambiente desktop suportado, tentar obter suas configurações
      if (currentDE && desktopConfigs[currentDE]) {
        const config = desktopConfigs[currentDE];
        
        // Função auxiliar para executar comandos de forma segura
        const safeExec = (command) => {
          try {
            return execSync(command).toString().trim().replace(/^'|'$/g, '');
          } catch (error) {
            return null;
          }
        };

        // Obter configurações do tema
        if (config.theme) {
          const theme = safeExec(config.theme);
          if (theme) themeInfo.theme = theme;
        }

        // Obter configurações de ícones
        if (config.icons) {
          const icons = safeExec(config.icons);
          if (icons) themeInfo.icons = icons;
        }

        // Obter configurações de fonte
        if (config.font) {
          const font = safeExec(config.font);
          if (font) themeInfo.font = font;
        }

        // Obter configurações de cursor
        if (config.cursor) {
          const cursor = safeExec(config.cursor);
          if (cursor) themeInfo.cursor = cursor;
        }

        // Obter configurações do WM (se disponível)
        if (config.wmTheme) {
          const wmTheme = safeExec(config.wmTheme);
          if (wmTheme) themeInfo.wmTheme = wmTheme;
        }
      }

      // Fallback para variáveis de ambiente
      if (!themeInfo.theme && process.env.GTK_THEME) {
        themeInfo.theme = process.env.GTK_THEME;
      }
      if (!themeInfo.icons && process.env.ICON_THEME) {
        themeInfo.icons = process.env.ICON_THEME;
      }
      if (!themeInfo.font && process.env.GTK_FONT) {
        themeInfo.font = process.env.GTK_FONT;
      }
      if (!themeInfo.cursor && process.env.XCURSOR_THEME) {
        themeInfo.cursor = process.env.XCURSOR_THEME;
      }

      return Object.keys(themeInfo).length > 0 ? themeInfo : null;
    } catch (error) {
      console.error('Error getting theme information on Linux:', error);
      return null;
    }
  }

  static async getMacOSThemeInfo() {
    try {
      const output = execSync('defaults read -g AppleInterfaceStyle').toString().trim();
      const theme = {
        de: 'Aqua',
        wm: 'Quartz Compositor',
        theme: output === 'Dark' ? 'Dark' : 'Light',
        font: execSync('defaults read -g AppleSystemUIFont').toString().trim()
      };
      
      return theme;
    } catch (error) {
      console.error('Error getting theme information on macOS:', error);
      return null;
    }
  }

  static async getWindowsThemeInfo() {
    try {
      const output = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme').toString();
      const theme = {
        de: 'Windows',
        wm: 'DWM',
        theme: output.includes('0x0') ? 'Dark' : 'Light'
      };
      
      return theme;
    } catch (error) {
      console.error('Error getting theme information on Windows:', error);
      return null;
    }
  }

  static getLocaleInfo() {
    try {
      return {
        locale: process.env.LANG || process.env.LC_ALL || 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch (error) {
      console.error('Error getting locale information:', error);
      return null;
    }
  }

  static async getNetworkInfo() {
    try {
      const platform = os.platform();
      
      switch (platform) {
        case 'linux':
          return await this.getLinuxNetworkInfo();
        case 'darwin':
          return await this.getMacOSNetworkInfo();
        case 'win32':
          return await this.getWindowsNetworkInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting network information:', error);
      return null;
    }
  }

  static async getLinuxNetworkInfo() {
    try {
      const output = execSync('ip addr').toString();
      const interfaces = [];
      
      for (const line of output.split('\n')) {
        if (line.includes('inet ')) {
          const [name, ...rest] = line.split(':');
          const ipMatch = rest.join(' ').match(/inet (\d+\.\d+\.\d+\.\d+)/);
          
          if (ipMatch) {
            interfaces.push({
              name: name.trim(),
              ip: ipMatch[1]
            });
          }
        }
      }
      
      return interfaces;
    } catch (error) {
      console.error('Error getting network information on Linux:', error);
      return null;
    }
  }

  static async getMacOSNetworkInfo() {
    try {
      const output = execSync('ifconfig').toString();
      const interfaces = [];
      
      for (const line of output.split('\n')) {
        if (line.includes('inet ')) {
          const [name, ...rest] = line.split(':');
          const ipMatch = rest.join(' ').match(/inet (\d+\.\d+\.\d+\.\d+)/);
          
          if (ipMatch) {
            interfaces.push({
              name: name.trim(),
              ip: ipMatch[1]
            });
          }
        }
      }
      
      return interfaces;
    } catch (error) {
      console.error('Error getting network information on macOS:', error);
      return null;
    }
  }

  static async getWindowsNetworkInfo() {
    try {
      const output = execSync('ipconfig').toString();
      const interfaces = [];
      
      for (const line of output.split('\n')) {
        if (line.includes('IPv4')) {
          const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
          const nameMatch = line.match(/^([^:]+):/);
          
          if (ipMatch && nameMatch) {
            interfaces.push({
              name: nameMatch[1].trim(),
              ip: ipMatch[1]
            });
          }
        }
      }
      
      return interfaces;
    } catch (error) {
      console.error('Error getting network information on Windows:', error);
      return null;
    }
  }

  static async getSwapInfo() {
    try {
      const platform = os.platform();
      
      switch (platform) {
        case 'linux':
          return await this.getLinuxSwapInfo();
        case 'darwin':
          return await this.getMacOSSwapInfo();
        case 'win32':
          return await this.getWindowsSwapInfo();
        default:
          return null;
      }
    } catch (error) {
      console.error('Error getting swap information:', error);
      return null;
    }
  }

  static async getLinuxSwapInfo() {
    try {
      const output = execSync('free -h').toString();
      const swapLine = output.split('\n').find(line => line.includes('Swap:'));
      
      if (swapLine) {
        const [total, used, free] = swapLine.split(/\s+/).slice(1, 4);
        
        // Convert values to bytes for precise calculation
        const totalBytes = this.convertToBytes(total);
        const usedBytes = this.convertToBytes(used);
        
        // Calculate percentage, avoiding division by zero and very large values
        let percentage;
        if (totalBytes === 0) {
          percentage = '0.0';
        } else {
          const calculatedPercentage = (usedBytes / totalBytes) * 100;
          percentage = calculatedPercentage > 100 ? '100.0' : calculatedPercentage.toFixed(1);
        }
        
        return {
          total,
          used,
          free,
          percentage: `${percentage}%`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting swap information on Linux:', error);
      return null;
    }
  }

  // Helper function to convert values with suffixes (Gi, Mi, etc) to bytes
  static convertToBytes(value) {
    const units = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    const match = value.match(/^([\d.]+)([BKMGTP])?i?$/);
    if (match) {
      const [, number, unit] = match;
      return parseFloat(number) * (units[unit] || 1);
    }
    return 0;
  }

  static async getMacOSSwapInfo() {
    try {
      const output = execSync('vm_stat').toString();
      const swapLine = output.split('\n').find(line => line.includes('Swap:'));
      
      if (swapLine) {
        const [total, used, free] = swapLine.split(/\s+/).slice(1, 4);
        const percentage = ((parseFloat(used) / parseFloat(total)) * 100).toFixed(1);
        
        return {
          total,
          used,
          free,
          percentage: `${percentage}%`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting swap information on macOS:', error);
      return null;
    }
  }

  static async getWindowsSwapInfo() {
    try {
      const output = execSync('wmic pagefile get AllocatedBaseSize,CurrentUsage').toString();
      const lines = output.split('\n').slice(1);
      
      if (lines.length > 0) {
        const [total, used] = lines[0].trim().split(/\s+/);
        const percentage = ((parseFloat(used) / parseFloat(total)) * 100).toFixed(1);
        
        return {
          total: `${(parseFloat(total) / 1024).toFixed(2)} GB`,
          used: `${(parseFloat(used) / 1024).toFixed(2)} GB`,
          percentage: `${percentage}%`
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting swap information on Windows:', error);
      return null;
    }
  }
}

module.exports = SystemUtils; 