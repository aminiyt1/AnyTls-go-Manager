#!/usr/bin/env bash
# ==============================================================================
# AnyTLS Manager Panel - One-Click Installer for Ubuntu 22.04+
# Repository: https://github.com/anytls/anytls-go
# ==============================================================================

set -e

# Capture script directory and caller directory immediately before any cd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
CALLER_DIR="$(pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}${BOLD}"
echo "================================================================"
echo "          🚀 AnyTLS Manager Panel - Automated Installer         "
echo "             Supported OS: Ubuntu 22.04 / 24.04 LTS            "
echo "================================================================"
echo -e "${NC}"

# Check root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}[Error] This script must be run as root or with sudo!${NC}"
    exit 1
fi

# Detect Architecture
UNAME_M="$(uname -m)"
case "$UNAME_M" in
    x86_64|amd64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo -e "${RED}[Error] Unsupported CPU architecture: ${UNAME_M}${NC}"
        echo "Supported architectures: x86_64 (amd64) and aarch64 (arm64)"
        exit 1
        ;;
esac

echo -e "${YELLOW}🖥️  Detected CPU Architecture:${NC} ${BOLD}linux/${ARCH} (${UNAME_M})${NC}"

# Detect Server IP
SERVER_IP=$(curl -s -4 https://api.ipify.org || curl -s -4 https://icanhazip.com || curl -s -4 https://ifconfig.me || hostname -I | awk '{print $1}')
SERVER_IP=${SERVER_IP:-"127.0.0.1"}

echo -e "${YELLOW}🌐 Detected Public Server IP:${NC} ${BOLD}${SERVER_IP}${NC}"
echo ""

# Ask for Panel Port
read -p "🔌 Enter Panel Port [default: 3000]: " PANEL_PORT
PANEL_PORT=${PANEL_PORT:-3000}

# Ask for Admin Username
read -p "👤 Enter Admin Username [default: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

# Ask for Admin Password
read -p "🔑 Enter Admin Password [press Enter to auto-generate]: " ADMIN_PASS
if [ -z "$ADMIN_PASS" ]; then
    ADMIN_PASS=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 12)
    echo -e "${GREEN}✨ Auto-generated strong password:${NC} ${BOLD}${ADMIN_PASS}${NC}"
fi

echo ""
echo -e "${CYAN}📦 Step 1/5: Updating system packages and installing dependencies...${NC}"
apt-get update -y -q
apt-get install -y -q curl wget git ufw tar build-essential jq unzip psmisc net-tools

echo -e "${CYAN}📦 Step 2/5: Installing Node.js (v20 LTS)...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js version:${NC} $(node -v) / npm: $(npm -v)"

echo -e "${CYAN}📦 Step 3/5: Installing AnyTLS Server binary (anytls-go)...${NC}"
mkdir -p /usr/local/bin
INSTALLED_ANYTLS=false

# Target release tag and clean version string
RELEASE_TAG="v0.0.13"
RELEASE_VER="0.0.13"

# Official pre-compiled release URL from GitHub according to detected architecture
RELEASE_URL="https://github.com/anytls/anytls-go/releases/download/${RELEASE_TAG}/anytls_${RELEASE_VER}_linux_${ARCH}.zip"

echo "Downloading AnyTLS server package for linux/${ARCH}..."
echo "Source: ${RELEASE_URL}"

if curl -fsSL "$RELEASE_URL" -o /tmp/anytls-prebuilt.zip; then
    mkdir -p /tmp/anytls-unzip
    unzip -q -o /tmp/anytls-prebuilt.zip -d /tmp/anytls-unzip
    if [ -f "/tmp/anytls-unzip/anytls-server" ]; then
        mv -f /tmp/anytls-unzip/anytls-server /usr/local/bin/anytls-server
        chmod +x /usr/local/bin/anytls-server
        if [ -f "/tmp/anytls-unzip/anytls-client" ]; then
            mv -f /tmp/anytls-unzip/anytls-client /usr/local/bin/anytls-client
            chmod +x /usr/local/bin/anytls-client
        fi
        INSTALLED_ANYTLS=true
        echo -e "${GREEN}✓ Official AnyTLS ${RELEASE_TAG} (${ARCH}) installed successfully to /usr/local/bin/anytls-server${NC}"
    fi
    rm -rf /tmp/anytls-prebuilt.zip /tmp/anytls-unzip
fi

# Fallback: Compile from source if pre-compiled release download failed
if [ "$INSTALLED_ANYTLS" = false ]; then
    echo "Pre-built binary download was unsuccessful. Compiling anytls-go from official source repository..."
    if ! command -v go &> /dev/null; then
        echo "Installing Go 1.24.0 for linux/${ARCH}..."
        GO_TAR="go1.24.0.linux-${ARCH}.tar.gz"
        wget -q "https://go.dev/dl/${GO_TAR}" -O "/tmp/${GO_TAR}"
        rm -rf /usr/local/go && tar -C /usr/local -xzf "/tmp/${GO_TAR}"
        rm -f "/tmp/${GO_TAR}"
        export PATH=/usr/local/go/bin:$PATH
        if ! grep -q "/usr/local/go/bin" /etc/profile; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
        fi
    fi
    export PATH=/usr/local/go/bin:$PATH

    ANYTLS_BUILD_DIR="/tmp/anytls-build"
    rm -rf "$ANYTLS_BUILD_DIR"
    git clone --depth 1 https://github.com/anytls/anytls-go "$ANYTLS_BUILD_DIR"
    
    (
        cd "$ANYTLS_BUILD_DIR"
        go build -o /usr/local/bin/anytls-server ./cmd/server
        go build -o /usr/local/bin/anytls-client ./cmd/client
        chmod +x /usr/local/bin/anytls-server /usr/local/bin/anytls-client
    )
    rm -rf "$ANYTLS_BUILD_DIR"
    echo -e "${GREEN}✓ AnyTLS Server binary compiled and installed to /usr/local/bin/anytls-server${NC}"
fi

# Setup Panel Directory
INSTALL_DIR="/opt/anytls-panel"
echo -e "${CYAN}📦 Step 4/5: Setting up AnyTLS Panel in ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/data"

# Find source files to copy into /opt/anytls-panel
SOURCE_DIR=""
if [ -f "$SCRIPT_DIR/package.json" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
elif [ -f "$CALLER_DIR/package.json" ]; then
    SOURCE_DIR="$CALLER_DIR"
elif [ -f "./package.json" ]; then
    SOURCE_DIR="$(pwd)"
fi

if [ -n "$SOURCE_DIR" ] && [ "$SOURCE_DIR" != "$INSTALL_DIR" ]; then
    echo "Copying panel files from $SOURCE_DIR to $INSTALL_DIR..."
    cp -r "$SOURCE_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
    cp "$SOURCE_DIR"/.env* "$INSTALL_DIR/" 2>/dev/null || true
fi

# Fallback 1: if package.json is missing in INSTALL_DIR, look for any unzipped anytls-panel folder
if [ ! -f "$INSTALL_DIR/package.json" ]; then
    FIND_PKG=$(find /root /home /tmp -name "package.json" -path "*/anytls-panel*/package.json" 2>/dev/null | head -n 1 || true)
    if [ -n "$FIND_PKG" ]; then
        FOUND_DIR="$(dirname "$FIND_PKG")"
        echo "Found panel files at $FOUND_DIR, copying..."
        cp -r "$FOUND_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
        cp "$FOUND_DIR"/.env* "$INSTALL_DIR/" 2>/dev/null || true
    fi
fi

# Fallback 2: Automatic download from official release URL if package.json is still missing
if [ ! -f "$INSTALL_DIR/package.json" ]; then
    PANEL_ZIP_URL="https://ais-dev-5ym5y2hecbbnt73jaj562d-667232856800.us-east1.run.app/api/download-zip"
    echo -e "${YELLOW}Downloading complete AnyTLS Panel package from cloud source...${NC}"
    if curl -fsSL "$PANEL_ZIP_URL" -o /tmp/anytls-fresh.zip; then
        unzip -q -o /tmp/anytls-fresh.zip -d "$INSTALL_DIR"
        rm -f /tmp/anytls-fresh.zip
        echo -e "${GREEN}✓ Downloaded and extracted panel source into ${INSTALL_DIR}${NC}"
    fi
fi

if [ ! -f "$INSTALL_DIR/package.json" ]; then
    echo -e "${RED}[Error] package.json could not be prepared in $INSTALL_DIR!${NC}"
    echo "Please check internet connection to download the panel package."
    exit 1
fi

cd "$INSTALL_DIR"
echo "Installing panel dependencies..."
npm install

# Write initial credentials and config if it does not already exist
CONFIG_FILE="$INSTALL_DIR/data/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
cat > "$CONFIG_FILE" <<EOF
{
  "admin": {
    "username": "${ADMIN_USER}",
    "password": "${ADMIN_PASS}"
  },
  "panelPort": ${PANEL_PORT},
  "serverIp": "${SERVER_IP}",
  "isStandalone": true,
  "configs": []
}
EOF
fi

# Ensure standalone environment variables before build
cat > "$INSTALL_DIR/.env" <<EOF
STANDALONE_PANEL=true
VITE_STANDALONE=true
EOF

echo "Building panel assets and production server..."
VITE_STANDALONE=true npm run build

# Install CLI Management Script 'anytls' to /usr/local/bin/anytls
if [ -f "$INSTALL_DIR/bin/anytls" ]; then
    cp -f "$INSTALL_DIR/bin/anytls" /usr/local/bin/anytls
    chmod +x /usr/local/bin/anytls
    echo -e "${GREEN}✓ Terminal CLI installed:${NC} Run ${CYAN}anytls${NC} anytime to manage panel"
fi

# Allow port in UFW firewall if active
if command -v ufw &> /dev/null; then
    ufw allow ${PANEL_PORT}/tcp >/dev/null 2>&1 || true
fi

# Step 5: Setup systemd service
echo -e "${CYAN}📦 Step 5/5: Configuring systemd service...${NC}"
NODE_BIN=$(command -v node || echo /usr/bin/node)
SERVICE_FILE="/etc/systemd/system/anytls-panel.service"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=AnyTLS Web Management Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${NODE_BIN} ${INSTALL_DIR}/dist/server.cjs
Restart=always
RestartSec=3
LimitNOFILE=65535
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=NODE_ENV=production
Environment=PORT=${PANEL_PORT}
Environment=STANDALONE_PANEL=true
Environment=VITE_STANDALONE=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable anytls-panel
systemctl restart anytls-panel

# Final report
echo ""
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}      🎉 AnyTLS Management Panel Installed Successfully!        ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${BOLD}🌐 Panel URL        :${NC} ${CYAN}http://${SERVER_IP}:${PANEL_PORT}${NC}"
echo -e "${BOLD}👤 Admin Username   :${NC} ${YELLOW}${ADMIN_USER}${NC}"
echo -e "${BOLD}🔑 Admin Password   :${NC} ${YELLOW}${ADMIN_PASS}${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${BOLD}💻 Terminal Management Menu:${NC}"
echo -e " • Simply type: ${CYAN}${BOLD}anytls${NC} anywhere in your terminal!"
echo -e "   (Opens interactive menu to Restart, Stop, View Logs, or Uninstall)"
echo -e "${GREEN}${BOLD}================================================================${NC}"
