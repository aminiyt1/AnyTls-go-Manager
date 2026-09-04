export interface AnyTlsConfig {
  id: string;
  remark: string;
  port: number;
  password: string;
  sni: string;
  trafficLimitGB: number; // 0 = unlimited
  trafficUsedBytes: number;
  expireDays: number; // 0 = unlimited
  expireAt: string | null; // ISO date string or null
  createdAt: string;
  status: 'active' | 'disabled' | 'expired';
  insecure: boolean;
  notes?: string;
  processRunning?: boolean;
  processPid?: number;
}

export interface ConfigProcessDetails {
  binaryPath: string | null;
  binaryExists: boolean;
  status: 'running' | 'stopped' | 'failed';
  pid?: number;
  port: number;
  isListening?: boolean;
  listenDetails?: string;
  startedAt?: string;
  logs: string[];
}

export interface ServerStatus {
  cpuUsage: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  uptimeSeconds: number;
  serverIp: string;
  panelPort: number;
  anytlsInstalled: boolean;
  anytlsVersion: string;
  activeConfigsCount: number;
  totalConfigsCount: number;
  osInfo: string;
  isStandalone?: boolean;
}

export interface AdminUser {
  username: string;
  isLoggedIn: boolean;
  token?: string;
}

export interface RenewOptions {
  addDays: number;
  addTrafficGB: number;
  resetTraffic: boolean;
}
