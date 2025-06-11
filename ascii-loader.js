const fs = require('fs');
const path = require('path');

class AsciiLoader {
  constructor() {
    this.asciiDir = path.join(__dirname, 'ascii');
    this.artCache = new Map();
    this.systemMappings = new Map();
    this.loadSystemMappings();
  }

  // Carregar mapeamentos de sistemas para arquivos
  loadSystemMappings() {
    try {
      const files = fs.readdirSync(this.asciiDir);
      
      // Mapear nomes de arquivos para sistemas
      files.forEach(file => {
        if (file.endsWith('.txt')) {
          const systemName = file.replace('.txt', '').toLowerCase();
          this.systemMappings.set(systemName, file);
        }
      });
    } catch (error) {
      console.error('Error loading system mappings:', error);
      return [];
    }
  }

  // Carregar arte ASCII de um arquivo
  loadAsciiArt(filename) {
    // Verificar cache primeiro
    if (this.artCache.has(filename)) {
      return this.artCache.get(filename);
    }

    try {
      const filePath = path.join(this.asciiDir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const art = content.split('\n').filter(line => line.trim() !== '');
        this.artCache.set(filename, art);
        return art;
      }
    } catch (error) {
      console.error(`Error loading ASCII art from ${filename}:`, error);
    }
    return null;
  }

  // Obter nome do arquivo para um sistema
  getAsciiArtFilename(system) {
    // Se o sistema for especificado diretamente
    if (this.systemMappings.has(system.toLowerCase())) {
      return this.systemMappings.get(system.toLowerCase());
    }

    // Tentar encontrar o melhor arquivo para o sistema
    const systemLower = system.toLowerCase();
    for (const [key, value] of this.systemMappings) {
      if (systemLower.includes(key)) {
        return value;
      }
    }

    // Fallback para arte desconhecida
    return 'unknown.txt';
  }

  // Obter arte ASCII para um sistema
  getAsciiArt(system) {
    try {
      const filename = this.getAsciiArtFilename(system);
      if (!filename) {
        return this.getAsciiArt('unknown');
      }

      const filePath = path.join(__dirname, 'ascii', filename);
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n');
    } catch (error) {
      console.error(`Error loading ASCII art from ${filename}:`, error);
      return this.getAsciiArt('unknown');
    }
  }

  // Listar todos os sistemas disponíveis
  listAvailableSystems() {
    return Array.from(this.systemMappings.keys());
  }

  // Verificar se um sistema tem arte disponível
  hasAsciiArt(system) {
    return this.systemMappings.has(system.toLowerCase());
  }

  getAsciiFilename() {
    const os = require('os');
    const platform = os.platform();
    const system = platform === 'linux' ? 'linux' : platform === 'win32' ? 'windows' : 'unknown';
    return this.getAsciiArtFilename(system);
  }
}

module.exports = new AsciiLoader(); 