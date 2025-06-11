# NodeFetch

A Node.js clone of neofetch/fastfetch. This application displays system information along with custom ASCII

## Features

* Displays detailed system information (CPU, memory, disk, etc.)
* Shows custom ASCII art based on the operating system
* Support for Linux, Windows, macOS and Android environments
* Colored terminal interface

## Requirements

* Node.js 12 or higher
* For Android use: Termux or similar environment with Node.js installed

## Installation

### From Source
```bash
# Clone the repository
git clone https://github.com/SterTheStar/nodefetch.git
cd nodefetch

# Install dependencies
npm install
```

### Using Pre-built Binaries

#### Linux
```bash
# Download and extract the Linux package
unzip nodefetch-linux.zip

# Run the installer
sudo ./install.sh
```

#### Windows
1. Download and extract `nodefetch-windows.zip`
2. Run `install.bat` as administrator

## Usage

```bash
# Run the application
node index.js

# Or use npm
npm start
```

## Customization

You can customize the ASCII art by editing the `ascii-loader.js` file and modifying the `asciiArts` object.

## Building from Source

To build the application for different platforms:

```bash
# Build for all platforms
npm run build:all

# Build for specific platforms
npm run build:linux-x64    # Linux 64-bit
npm run build:windows-x64  # Windows 64-bit
```

## License

GPL-3.0

## Repository

[GitHub Repository](https://github.com/SterTheStar/nodefetch)
