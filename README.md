# AnyTLS Manager Panel

Professional management web panel for the AnyTLS protocol, based on the official [anytls/anytls-go](https://github.com/anytls/anytls-go) repository.

Easily deploy and manage AnyTLS servers on Ubuntu (22.04 LTS & 24.04 LTS) with full control over ports, users, traffic limits, expiration dates, and QR code client links.

---

## 🚀 Quick Install (Ubuntu Server)

Run as root on your Ubuntu server:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/aminiyt1/AnyTls-go-Manager/main/install.sh)
```

```bash
git clone https://github.com/aminiyt1/AnyTls-go-Manager.git /opt/anytls-panel && cd /opt/anytls-panel && chmod +x install.sh bin/anytls && ./install.sh
```

Or extract the downloaded `anytls-panel-ubuntu.zip` and run `./install.sh`.

---

## 📦 Manual Installation via ZIP

1. Upload `anytls-panel-ubuntu.zip` to `/root/` on your Ubuntu server via SFTP or `scp`:

```bash
scp anytls-panel-ubuntu.zip root@YOUR_SERVER_IP:/root/
```

2. Extract and run installer:

```bash
apt-get update && apt-get install -y unzip
unzip anytls-panel-ubuntu.zip -d anytls-panel
cd anytls-panel
chmod +x install.sh
sudo ./install.sh
```

---

## ⚙️ Service Commands

| Command | Description |
|---------|-------------|
| `systemctl status anytls-panel` | Check panel service status |
| `systemctl restart anytls-panel` | Restart panel service |
| `systemctl stop anytls-panel` | Stop panel service |
| `journalctl -u anytls-panel -f` | View live service logs |
| `ufw allow 3000/tcp` | Open firewall port |

---

## 📋 AnyTLS Connection Format

```text
anytls://PASSWORD@SERVER_IP:PORT?sni=DOMAIN&insecure=1#REMARK
```

