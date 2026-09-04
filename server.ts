import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import crypto from 'crypto';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as archiverModule from 'archiver';
import { createServer as createViteServer } from 'vite';

function createZipArchive(options?: any) {
  const mod: any = archiverModule;
  if (typeof mod.ZipArchive === 'function') {
    return new mod.ZipArchive(options);
  }
  if (typeof mod.default === 'function') {
    return mod.default('zip', options);
  }
  if (typeof mod === 'function') {
    return mod('zip', options);
  }
  throw new Error('Unable to initialize zip archive');
}

interface StoredConfig {
  id: string;
  remark: string;
  port: number;
  password: string;
  sni: string;
  trafficLimitGB: number;
  trafficUsedBytes: number;
  expireDays: number;
  expireAt: string | null;
  createdAt: string;
  status: 'active' | 'disabled' | 'expired';
  insecure: boolean;
  notes?: string;
}

interface AppData {
  admin: {
    username: string;
    passwordHash: string;
    salt: string;
  };
  serverIp: string;
  panelPort: number;
  isStandalone?: boolean;
  configs: StoredConfig[];
}

// ----------------------------------------------------
// AnyTLS Server Process Manager
// ----------------------------------------------------
interface ProcessInfo {
  configId: string;
  remark: string;
  port: number;
  process?: ChildProcess;
  pid?: number;
  status: 'running' | 'stopped' | 'failed';
  startedAt?: string;
  logs: string[];
}

const activeProcesses = new Map<string, ProcessInfo>();

function getAnyTlsBinaryPath(): string | null {
  // First check if it's already in system PATH
  try {
    const whichOut = execSync('which anytls-server 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (whichOut && fs.existsSync(whichOut)) {
      try {
        fs.chmodSync(whichOut, 0o755);
      } catch {}
      return whichOut;
    }
  } catch {}

  const candidates = [
    '/usr/local/bin/anytls-server',
    '/usr/bin/anytls-server',
    '/root/anytls-server',
    '/root/anytls/anytls-server',
    '/root/anytls-go/anytls-server',
    '/opt/anytls-panel/anytls-server',
    '/opt/anytls-panel/bin/anytls-server',
    path.join(process.cwd(), 'anytls-server'),
    path.join(process.cwd(), 'bin', 'anytls-server'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
      } catch {}
      // If it exists in a custom folder, try creating a symlink in /usr/local/bin so the whole OS finds it
      if (p !== '/usr/local/bin/anytls-server' && !fs.existsSync('/usr/local/bin/anytls-server')) {
        try {
          fs.symlinkSync(p, '/usr/local/bin/anytls-server');
        } catch {}
      }
      return p;
    }
  }
  return null;
}

function addProcessLog(configId: string, message: string) {
  const info = activeProcesses.get(configId);
  if (info) {
    const timestamp = new Date().toLocaleTimeString();
    info.logs.push(`[${timestamp}] ${message}`);
    if (info.logs.length > 100) {
      info.logs.shift();
    }
  }
}

// Kill any old stray processes on the designated port before binding
function killPortOccupant(port: number): Promise<void> {
  return new Promise((resolve) => {
    if (os.platform() === 'linux') {
      exec(`fuser -k ${port}/tcp 2>/dev/null || true`, () => {
        setTimeout(resolve, 150);
      });
    } else {
      resolve();
    }
  });
}

// Check if port is actively listening on the host
function checkPortInListenState(port: number): Promise<{ isListening: boolean; details: string }> {
  return new Promise((resolve) => {
    if (os.platform() === 'linux') {
      exec(`ss -lntp 2>/dev/null | grep ":${port} " || true`, (err, stdout) => {
        const line = stdout.trim();
        if (line) {
          resolve({ isListening: true, details: line });
        } else {
          resolve({ isListening: false, details: 'Port not listed in ss -lntp' });
        }
      });
    } else {
      // Fallback check
      const client = new net.Socket();
      client.setTimeout(400);
      client.once('connect', () => {
        client.destroy();
        resolve({ isListening: true, details: `TCP probe connected to 127.0.0.1:${port}` });
      });
      client.once('timeout', () => {
        client.destroy();
        resolve({ isListening: false, details: 'Connection timed out' });
      });
      client.once('error', (e) => {
        client.destroy();
        resolve({ isListening: false, details: e.message });
      });
      client.connect(port, '127.0.0.1');
    }
  });
}

async function startAnyTlsServer(config: StoredConfig): Promise<boolean> {
  // Stop existing internal handle
  stopAnyTlsServer(config.id);

  if (config.status !== 'active') {
    return false;
  }

  const binaryPath = getAnyTlsBinaryPath();
  const info: ProcessInfo = {
    configId: config.id,
    remark: config.remark,
    port: config.port,
    status: 'stopped',
    logs: [],
  };
  activeProcesses.set(config.id, info);

  if (!binaryPath) {
    info.status = 'failed';
    const warnMsg = `Binary anytls-server not found at /usr/local/bin/anytls-server. On Ubuntu server, please run install.sh.`;
    addProcessLog(config.id, warnMsg);
    console.warn(`[AnyTLS] ${warnMsg} (Config: ${config.remark}, Port: ${config.port})`);
    return false;
  }

  try {
    // Clean up any stray process holding this port
    await killPortOccupant(config.port);

    addProcessLog(config.id, `Starting: ${binaryPath} -l 0.0.0.0:${config.port} -p ******`);
    console.log(`[AnyTLS] Spawning ${binaryPath} -l 0.0.0.0:${config.port} for "${config.remark}"`);

    // Ensure port is open in firewall
    if (os.platform() === 'linux') {
      exec(`ufw allow ${config.port}/tcp >/dev/null 2>&1 || true`, () => {});
    }

    const child = spawn(binaryPath, ['-l', `0.0.0.0:${config.port}`, '-p', config.password], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    info.process = child;
    info.pid = child.pid;
    info.status = 'running';
    info.startedAt = new Date().toISOString();
    addProcessLog(config.id, `Process started successfully (PID: ${child.pid}) listening on 0.0.0.0:${config.port}`);

    // Verify after a short delay that port has actually entered LISTEN mode
    setTimeout(async () => {
      const check = await checkPortInListenState(config.port);
      if (check.isListening) {
        addProcessLog(config.id, `✓ Port ${config.port} confirmed in LISTEN state: ${check.details}`);
      } else if (info.status === 'running') {
        addProcessLog(config.id, `⚠️ Process PID ${child.pid} alive, waiting for port binding...`);
      }
    }, 600);

    child.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        addProcessLog(config.id, msg);
        console.log(`[AnyTLS ${config.port}] ${msg}`);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        addProcessLog(config.id, msg);
        console.error(`[AnyTLS ${config.port}] ${msg}`);
      }
    });

    child.on('error', (err: Error) => {
      info.status = 'failed';
      addProcessLog(config.id, `Process error: ${err.message}`);
      console.error(`[AnyTLS ${config.port}] Process error:`, err);
    });

    child.on('exit', (code: number | null, signal: string | null) => {
      info.status = 'stopped';
      info.pid = undefined;
      info.process = undefined;
      addProcessLog(config.id, `Process exited with code ${code ?? 'null'} signal ${signal ?? 'none'}`);
      console.log(`[AnyTLS ${config.port}] Process exited with code ${code}`);
    });

    return true;
  } catch (err: any) {
    info.status = 'failed';
    addProcessLog(config.id, `Failed to launch process: ${err.message}`);
    console.error(`[AnyTLS ${config.port}] Failed to launch:`, err);
    return false;
  }
}

function stopAnyTlsServer(configId: string): void {
  const info = activeProcesses.get(configId);
  if (info) {
    if (info.process) {
      try {
        addProcessLog(configId, `Stopping process (PID: ${info.pid})...`);
        info.process.kill('SIGTERM');
        setTimeout(() => {
          if (info.process && !info.process.killed) {
            try {
              info.process.kill('SIGKILL');
            } catch {}
          }
        }, 800);
      } catch (err: any) {
        console.error(`[AnyTLS] Error stopping process ${configId}:`, err);
      }
    }
    // Also ensure port occupant is cleared
    if (info.port) {
      killPortOccupant(info.port);
    }
    info.status = 'stopped';
    info.pid = undefined;
    info.process = undefined;
  }
}

function syncAllAnyTlsProcesses(): void {
  const data = loadData();
  const currentActiveIds = new Set<string>();

  for (const cfg of data.configs) {
    if (cfg.status === 'active') {
      currentActiveIds.add(cfg.id);
      const existing = activeProcesses.get(cfg.id);
      if (!existing || existing.status !== 'running' || existing.port !== cfg.port) {
        startAnyTlsServer(cfg);
      }
    } else {
      stopAnyTlsServer(cfg.id);
    }
  }

  // Stop any orphaned processes
  for (const [id] of activeProcesses.entries()) {
    if (!currentActiveIds.has(id)) {
      stopAnyTlsServer(id);
      activeProcesses.delete(id);
    }
  }
}

// Background Watchdog: Runs every 20 seconds
// 1. Checks and auto-disables expired configurations
// 2. Checks if any active configuration process exited unexpectedly and restarts it
function startProcessWatchdog(): void {
  setInterval(async () => {
    try {
      const data = loadData();
      let changed = false;
      const now = new Date();

      for (const cfg of data.configs) {
        // Expiration check: Date
        const isTimeExpired = cfg.expireAt ? new Date(cfg.expireAt) < now : false;
        // Expiration check: Traffic Limit
        const isTrafficExpired = cfg.trafficLimitGB > 0 && cfg.trafficUsedBytes >= cfg.trafficLimitGB * 1024 * 1024 * 1024;

        if ((isTimeExpired || isTrafficExpired) && cfg.status === 'active') {
          console.log(`[Watchdog] Config "${cfg.remark}" expired (Time: ${isTimeExpired}, Traffic: ${isTrafficExpired}). Stopping process.`);
          cfg.status = 'expired';
          stopAnyTlsServer(cfg.id);
          changed = true;
          continue;
        }

        // Keep-alive check for active configurations
        if (cfg.status === 'active') {
          const proc = activeProcesses.get(cfg.id);
          if (!proc || proc.status !== 'running' || !proc.pid) {
            console.log(`[Watchdog] Active config "${cfg.remark}" (Port: ${cfg.port}) process not running. Auto-restarting...`);
            await startAnyTlsServer(cfg);
          }
        }
      }

      if (changed) {
        saveData(data);
      }
    } catch (err) {
      console.error('[Watchdog] Error during supervisor cycle:', err);
    }
  }, 20000);
}

process.on('SIGTERM', () => {
  for (const [id] of activeProcesses) {
    stopAnyTlsServer(id);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  for (const [id] of activeProcesses) {
    stopAnyTlsServer(id);
  }
  process.exit(0);
});

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'config.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultData(): AppData {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword('admin123', salt);

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    admin: {
      username: 'admin',
      passwordHash,
      salt,
    },
    serverIp: '127.0.0.1',
    panelPort: 3000,
    configs: [
      {
        id: 'cfg-' + crypto.randomBytes(4).toString('hex'),
        remark: 'User-VIP-01',
        port: 8443,
        password: crypto.randomBytes(12).toString('base64url'),
        sni: 'cloudflare.com',
        trafficLimitGB: 50,
        trafficUsedBytes: 12.4 * 1024 * 1024 * 1024,
        expireDays: 30,
        expireAt: thirtyDaysLater.toISOString(),
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        insecure: true,
        notes: 'Default AnyTLS test config for Android and iOS clients',
      },
      {
        id: 'cfg-' + crypto.randomBytes(4).toString('hex'),
        remark: 'User-Work-02',
        port: 9443,
        password: crypto.randomBytes(12).toString('base64url'),
        sni: 'speedtest.net',
        trafficLimitGB: 100,
        trafficUsedBytes: 45.8 * 1024 * 1024 * 1024,
        expireDays: 60,
        expireAt: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        insecure: true,
        notes: 'Compatible with Sing-Box and Clash/Mihomo',
      },
    ],
  };
}

function loadData(): AppData {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = getDefaultData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // backward compatibility check
    if (parsed.admin && parsed.admin.password && !parsed.admin.passwordHash) {
      const salt = crypto.randomBytes(16).toString('hex');
      parsed.admin.passwordHash = hashPassword(parsed.admin.password, salt);
      parsed.admin.salt = salt;
      delete parsed.admin.password;
      saveData(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error loading config.json:', err);
    return getDefaultData();
  }
}

function saveData(data: AppData): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// In-memory active tokens
const activeTokens = new Set<string>();

async function startServer() {
  const app = express();
  const initialData = loadData();

  const isStandaloneEnv =
    initialData.isStandalone === true ||
    process.env.STANDALONE_PANEL === 'true' ||
    process.env.VITE_STANDALONE === 'true' ||
    fs.existsSync('/etc/systemd/system/anytls-panel.service');

  // In standalone deployment on Ubuntu/VPS, listen on configured panelPort or process.env.PORT
  // In development / cloud container, port MUST be 3000 as strictly mandated by ingress proxy
  const PORT = isStandaloneEnv
    ? (Number(initialData.panelPort) || Number(process.env.PORT) || 3000)
    : 3000;

  app.use(express.json());

  // Detect public IP once in background
  let cachedServerIp = '127.0.0.1';
  fetch('https://api.ipify.org?format=json')
    .then((r) => r.json())
    .then((res: any) => {
      if (res && res.ip) cachedServerIp = res.ip;
    })
    .catch(() => {
      try {
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
          for (const iface of ifaces[name] || []) {
            if (!iface.internal && iface.family === 'IPv4') {
              cachedServerIp = iface.address;
              return;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    });

  // Simple auth middleware for API routes
  const requireAuth = (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Please sign in first' });
      return;
    }
    const token = authHeader.split(' ')[1];
    if (!activeTokens.has(token)) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    next();
  };

  // ----------------------------------------------------
  // Auth Endpoints
  // ----------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const data = loadData();

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    if (username !== data.admin.username) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const calculatedHash = hashPassword(password, data.admin.salt);
    let isAuthenticated = calculatedHash === data.admin.passwordHash;

    // Backward-compatibility fallback: if hash was created with sha256 or plain text
    if (!isAuthenticated && data.admin.salt) {
      const sha256Hash = crypto.createHash('sha256').update(password + data.admin.salt).digest('hex');
      if (sha256Hash === data.admin.passwordHash) {
        isAuthenticated = true;
        // Automatically upgrade to PBKDF2 sha512
        data.admin.passwordHash = calculatedHash;
        saveData(data);
      }
    }

    if (!isAuthenticated && (data.admin as any).password === password) {
      isAuthenticated = true;
      delete (data.admin as any).password;
      const newSalt = crypto.randomBytes(16).toString('hex');
      data.admin.salt = newSalt;
      data.admin.passwordHash = hashPassword(password, newSalt);
      saveData(data);
    }

    if (!isAuthenticated) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.add(token);

    res.json({
      success: true,
      token,
      username: data.admin.username,
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ isLoggedIn: false });
      return;
    }
    const token = authHeader.split(' ')[1];
    if (!activeTokens.has(token)) {
      res.status(401).json({ isLoggedIn: false });
      return;
    }
    const data = loadData();
    res.json({
      isLoggedIn: true,
      username: data.admin.username,
      panelPort: data.panelPort || 3000,
    });
  });

  app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const data = loadData();
    const currentHash = hashPassword(currentPassword, data.admin.salt);
    let isAuthed = currentHash === data.admin.passwordHash;
    if (!isAuthed && data.admin.salt) {
      const sha256Hash = crypto.createHash('sha256').update(currentPassword + data.admin.salt).digest('hex');
      if (sha256Hash === data.admin.passwordHash) {
        isAuthed = true;
      }
    }
    if (!isAuthed) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    data.admin.salt = newSalt;
    data.admin.passwordHash = hashPassword(newPassword, newSalt);
    saveData(data);

    res.json({ success: true, message: 'Password changed successfully' });
  });

  // Settings update endpoint (changes password and/or panel port)
  app.post('/api/settings/update', requireAuth, (req: Request, res: Response) => {
    const { currentPassword, newPassword, newPort } = req.body;
    const data = loadData();

    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required to save changes' });
      return;
    }

    const currentHash = hashPassword(currentPassword, data.admin.salt);
    let isAuthed = currentHash === data.admin.passwordHash;
    if (!isAuthed && data.admin.salt) {
      const sha256Hash = crypto.createHash('sha256').update(currentPassword + data.admin.salt).digest('hex');
      if (sha256Hash === data.admin.passwordHash) {
        isAuthed = true;
      }
    }
    if (!isAuthed) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    let passwordChanged = false;
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }
      const newSalt = crypto.randomBytes(16).toString('hex');
      data.admin.salt = newSalt;
      data.admin.passwordHash = hashPassword(newPassword, newSalt);
      passwordChanged = true;
    }

    let portChanged = false;
    let targetPort = data.panelPort || 3000;
    if (newPort !== undefined && newPort !== null && newPort !== '') {
      const parsedPort = parseInt(String(newPort), 10);
      if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        res.status(400).json({ error: 'Panel port must be a number between 1 and 65535' });
        return;
      }
      const collision = data.configs.find((c) => c.port === parsedPort);
      if (collision) {
        res.status(400).json({ error: `Port ${parsedPort} is already assigned to AnyTLS tunnel '${collision.remark}'` });
        return;
      }
      if (parsedPort !== data.panelPort) {
        data.panelPort = parsedPort;
        targetPort = parsedPort;
        portChanged = true;
      }
    }

    saveData(data);

    // If port changed on standalone linux system, update systemd and ufw
    if (portChanged && os.platform() === 'linux') {
      try {
        const servicePath = '/etc/systemd/system/anytls-panel.service';
        if (fs.existsSync(servicePath)) {
          let serviceContent = fs.readFileSync(servicePath, 'utf8');
          if (serviceContent.includes('Environment=PORT=')) {
            serviceContent = serviceContent.replace(/Environment=PORT=\d+/, `Environment=PORT=${targetPort}`);
          } else {
            serviceContent = serviceContent.replace(/\[Service\]/, `[Service]\nEnvironment=PORT=${targetPort}`);
          }
          fs.writeFileSync(servicePath, serviceContent, 'utf8');
          exec(`systemctl daemon-reload && ufw allow ${targetPort}/tcp >/dev/null 2>&1 || true`, () => {});
        }
      } catch (err) {
        console.error('Error updating systemd service port:', err);
      }

      // Schedule graceful restart so new port takes effect
      setTimeout(() => {
        process.exit(0);
      }, 1200);
    }

    res.json({
      success: true,
      passwordChanged,
      portChanged,
      newPort: targetPort,
      message: portChanged
        ? `Settings saved! Port updated to ${targetPort}. The panel service is restarting on the new port.`
        : 'Settings saved successfully.',
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      activeTokens.delete(token);
    }
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // Configs CRUD Endpoints
  // ----------------------------------------------------
  app.get('/api/configs', requireAuth, (req: Request, res: Response) => {
    const data = loadData();
    // Auto-update expired status if date passed
    const now = new Date();
    let hasChanges = false;
    data.configs = data.configs.map((cfg) => {
      if (cfg.expireAt && new Date(cfg.expireAt) < now && cfg.status === 'active') {
        hasChanges = true;
        return { ...cfg, status: 'expired' };
      }
      if (
        cfg.trafficLimitGB > 0 &&
        cfg.trafficUsedBytes >= cfg.trafficLimitGB * 1024 * 1024 * 1024 &&
        cfg.status === 'active'
      ) {
        hasChanges = true;
        return { ...cfg, status: 'expired' };
      }
      return cfg;
    });

    if (hasChanges) {
      saveData(data);
    }

    const configsWithProcess = data.configs.map((cfg) => {
      const proc = activeProcesses.get(cfg.id);
      return {
        ...cfg,
        processRunning: proc?.status === 'running',
        processPid: proc?.pid,
      };
    });

    res.json({
      configs: configsWithProcess,
      serverIp: cachedServerIp,
      binaryInstalled: Boolean(getAnyTlsBinaryPath()),
    });
  });

  app.post('/api/configs', requireAuth, async (req: Request, res: Response) => {
    const {
      remark,
      port,
      password,
      sni,
      trafficLimitGB = 0,
      expireDays = 30,
      notes = '',
      insecure = true,
    } = req.body;

    if (!remark || !port) {
      res.status(400).json({ error: 'Remark and port are required' });
      return;
    }

    const numericPort = Number(port);
    if (isNaN(numericPort) || numericPort < 1 || numericPort > 65535) {
      res.status(400).json({ error: 'Invalid port (must be between 1 and 65535)' });
      return;
    }

    const data = loadData();
    const portConflict = data.configs.some((c) => c.port === numericPort);
    if (portConflict) {
      res.status(400).json({ error: `Port ${numericPort} is already in use` });
      return;
    }

    const now = new Date();
    let expireAt: string | null = null;
    const daysNum = Number(expireDays);
    if (daysNum > 0) {
      const exp = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);
      expireAt = exp.toISOString();
    }

    const finalPassword = password && password.trim()
      ? password.trim()
      : crypto.randomBytes(12).toString('base64url');

    const newConfig: StoredConfig = {
      id: 'cfg-' + crypto.randomBytes(6).toString('hex'),
      remark: remark.trim(),
      port: numericPort,
      password: finalPassword,
      sni: (sni !== undefined && typeof sni === 'string') ? sni.trim() : '',
      trafficLimitGB: Number(trafficLimitGB) || 0,
      trafficUsedBytes: 0,
      expireDays: daysNum,
      expireAt,
      createdAt: now.toISOString(),
      status: 'active',
      insecure: insecure !== false,
      notes: notes ? notes.trim() : '',
    };

    data.configs.unshift(newConfig);
    saveData(data);

    // Launch anytls-server process immediately
    await startAnyTlsServer(newConfig);

    res.json({
      success: true,
      config: {
        ...newConfig,
        processRunning: activeProcesses.get(newConfig.id)?.status === 'running',
        processPid: activeProcesses.get(newConfig.id)?.pid,
      },
    });
  });

  app.put('/api/configs/:id', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      remark,
      port,
      password,
      sni,
      trafficLimitGB,
      expireDays,
      notes,
      insecure,
    } = req.body;

    const data = loadData();
    const index = data.configs.findIndex((c) => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    const current = data.configs[index];
    const numericPort = Number(port);
    if (numericPort && numericPort !== current.port) {
      const portConflict = data.configs.some((c) => c.id !== id && c.port === numericPort);
      if (portConflict) {
        res.status(400).json({ error: `Port ${numericPort} is already in use` });
        return;
      }
      current.port = numericPort;
    }

    if (remark) current.remark = remark.trim();
    if (password) current.password = password.trim();
    if (sni !== undefined) current.sni = typeof sni === 'string' ? sni.trim() : '';
    if (notes !== undefined) current.notes = notes.trim();
    if (insecure !== undefined) current.insecure = Boolean(insecure);
    if (trafficLimitGB !== undefined) current.trafficLimitGB = Number(trafficLimitGB);

    if (expireDays !== undefined) {
      const daysNum = Number(expireDays);
      current.expireDays = daysNum;
      if (daysNum > 0) {
        const createdTime = new Date(current.createdAt).getTime();
        current.expireAt = new Date(createdTime + daysNum * 24 * 60 * 60 * 1000).toISOString();
      } else {
        current.expireAt = null;
      }
    }

    data.configs[index] = current;
    saveData(data);

    // Restart process with updated port/password if active
    if (current.status === 'active') {
      await startAnyTlsServer(current);
    } else {
      stopAnyTlsServer(current.id);
    }

    res.json({
      success: true,
      config: {
        ...current,
        processRunning: activeProcesses.get(current.id)?.status === 'running',
        processPid: activeProcesses.get(current.id)?.pid,
      },
    });
  });

  app.post('/api/configs/:id/toggle', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = loadData();
    const config = data.configs.find((c) => c.id === id);
    if (!config) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    if (config.status === 'active') {
      config.status = 'disabled';
      stopAnyTlsServer(config.id);
    } else {
      config.status = 'active';
      await startAnyTlsServer(config);
    }

    saveData(data);
    res.json({ success: true, status: config.status });
  });

  app.post('/api/configs/:id/renew', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { addDays = 30, addTrafficGB = 0, resetTraffic = false } = req.body;

    const data = loadData();
    const config = data.configs.find((c) => c.id === id);
    if (!config) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    // Days extension
    const daysToAdd = Number(addDays) || 0;
    if (daysToAdd > 0) {
      const baseTime = config.expireAt && new Date(config.expireAt) > new Date()
        ? new Date(config.expireAt).getTime()
        : Date.now();
      config.expireAt = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      config.expireDays += daysToAdd;
    }

    // Traffic extension
    const trafficToAdd = Number(addTrafficGB) || 0;
    if (trafficToAdd > 0 && config.trafficLimitGB > 0) {
      config.trafficLimitGB += trafficToAdd;
    }

    if (resetTraffic) {
      config.trafficUsedBytes = 0;
    }

    config.status = 'active';
    saveData(data);
    await startAnyTlsServer(config);

    res.json({ success: true, config });
  });

  app.delete('/api/configs/:id', requireAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = loadData();
    const initialLen = data.configs.length;
    const removedCfg = data.configs.find((c) => c.id === id);
    data.configs = data.configs.filter((c) => c.id !== id);

    if (data.configs.length === initialLen) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }

    // Terminate process
    stopAnyTlsServer(id);
    activeProcesses.delete(id);

    if (os.platform() === 'linux' && removedCfg) {
      try {
        exec(`ufw delete allow ${removedCfg.port}/tcp >/dev/null 2>&1 || true`, () => {});
      } catch {}
    }

    saveData(data);
    res.json({ success: true, message: 'Configuration deleted successfully' });
  });

  // ----------------------------------------------------
  // Process Details & Real-Time Logs Endpoints
  // ----------------------------------------------------
  app.get('/api/configs/:id/process', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const binaryPath = getAnyTlsBinaryPath();
    const info = activeProcesses.get(id);
    const data = loadData();
    const config = data.configs.find((c) => c.id === id);
    const targetPort = config ? config.port : (info?.port || 0);

    const portCheck = targetPort ? await checkPortInListenState(targetPort) : { isListening: false, details: '' };

    res.json({
      binaryPath,
      binaryExists: Boolean(binaryPath),
      status: info?.status || (config?.status === 'active' ? 'stopped' : 'disabled'),
      pid: info?.pid,
      port: targetPort,
      isListening: portCheck.isListening,
      listenDetails: portCheck.details,
      startedAt: info?.startedAt,
      logs: info?.logs || [],
    });
  });

  app.post('/api/configs/:id/restart-process', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = loadData();
    const config = data.configs.find((c) => c.id === id);
    if (!config) {
      res.status(404).json({ error: 'Configuration not found' });
      return;
    }
    const started = await startAnyTlsServer(config);
    const proc = activeProcesses.get(id);
    res.json({
      success: started,
      status: proc?.status || 'stopped',
      pid: proc?.pid,
    });
  });

  // ----------------------------------------------------
  // Server Status & System Info
  // ----------------------------------------------------
  app.get('/api/server/status', requireAuth, (req: Request, res: Response) => {
    const data = loadData();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Check if anytls binary exists on system
    const anytlsPath = '/usr/local/bin/anytls-server';
    const anytlsInstalled = fs.existsSync(anytlsPath);

    const isStandalone =
      data.isStandalone === true ||
      process.env.STANDALONE_PANEL === 'true' ||
      process.env.VITE_STANDALONE === 'true' ||
      fs.existsSync('/etc/systemd/system/anytls-panel.service') ||
      anytlsInstalled ||
      (process.env.NODE_ENV === 'production' && !process.env.K_SERVICE);

    const activeCount = data.configs.filter((c) => c.status === 'active').length;

    res.json({
      cpuUsage: Math.round((os.loadavg()[0] || 0.15) * 10) / 10,
      memoryUsedMB: Math.round(usedMem / 1024 / 1024),
      memoryTotalMB: Math.round(totalMem / 1024 / 1024),
      uptimeSeconds: Math.round(os.uptime()),
      serverIp: cachedServerIp,
      panelPort: data.panelPort || 3000,
      anytlsInstalled,
      anytlsVersion: anytlsInstalled ? 'v1.0.0 (anytls-go)' : 'Ready to install on Ubuntu',
      activeConfigsCount: activeCount,
      totalConfigsCount: data.configs.length,
      osInfo: `${os.type()} ${os.release()} (${os.arch()})`,
      isStandalone: Boolean(isStandalone),
    });
  });

  // Public system info route for UI standalone detection
  app.get('/api/system-info', (req: Request, res: Response) => {
    const data = loadData();
    const isStandalone =
      data.isStandalone === true ||
      process.env.STANDALONE_PANEL === 'true' ||
      process.env.VITE_STANDALONE === 'true' ||
      fs.existsSync('/etc/systemd/system/anytls-panel.service') ||
      fs.existsSync('/usr/local/bin/anytls-server') ||
      (process.env.NODE_ENV === 'production' && !process.env.K_SERVICE);

    res.json({
      isStandalone: Boolean(isStandalone),
      serverIp: cachedServerIp,
    });
  });

  // ----------------------------------------------------
  // Download One-Click Ubuntu Package (ZIP)
  // ----------------------------------------------------
  app.get('/api/download-zip', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="anytls-panel-ubuntu.zip"');

    const archive = createZipArchive({
      zlib: { level: 9 },
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    const projectRoot = process.cwd();

    // Include key files for Ubuntu installation
    const filesToInclude = [
      'install.sh',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'server.ts',
      'metadata.json',
      '.env.example',
      '.gitignore',
    ];

    for (const file of filesToInclude) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }

    // Include bin directory (CLI utility)
    const binDir = path.join(projectRoot, 'bin');
    if (fs.existsSync(binDir)) {
      archive.directory(binDir, 'bin');
    }

    // Include src directory
    const srcDir = path.join(projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
      archive.directory(srcDir, 'src');
    }

    // Include public directory if exists
    const publicDir = path.join(projectRoot, 'public');
    if (fs.existsSync(publicDir)) {
      archive.directory(publicDir, 'public');
    }

    // Include README.md
    const readmePath = path.join(projectRoot, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'README.md' });
    }

    // Include standalone flag for standalone Ubuntu deployment
    archive.append('STANDALONE_PANEL=true\nVITE_STANDALONE=true\n', { name: '.env' });

    archive.finalize();
  });

  // Get raw install.sh script for direct curl execution
  app.get('/api/install.sh', (req: Request, res: Response) => {
    const installScriptPath = path.join(process.cwd(), 'install.sh');
    if (fs.existsSync(installScriptPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(fs.readFileSync(installScriptPath, 'utf-8'));
    } else {
      res.status(404).send('# install.sh not found');
    }
  });

  // ----------------------------------------------------
  // Vite Middleware (Development) / Static Files (Production)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AnyTLS Manager Panel running on http://0.0.0.0:${PORT}`);
    // Automatically launch anytls-server process for each active configuration
    try {
      syncAllAnyTlsProcesses();
      startProcessWatchdog();
    } catch (err) {
      console.error('Failed to sync AnyTLS processes on startup:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
