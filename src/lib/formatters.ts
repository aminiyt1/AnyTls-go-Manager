import { AnyTlsConfig } from '../types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function generateAnyTlsLink(config: AnyTlsConfig, serverIp: string): string {
  const host = serverIp || '127.0.0.1';
  const encodedRemark = encodeURIComponent(config.remark);
  const cleanSni = config.sni ? config.sni.trim() : '';
  const sniParam = cleanSni ? `sni=${encodeURIComponent(cleanSni)}` : '';
  const insecureParam = config.insecure ? 'insecure=1' : '';

  const queryParts = [sniParam, insecureParam].filter(Boolean).join('&');
  const queryStr = queryParts ? `?${queryParts}` : '';

  // Standard AnyTLS URI scheme: anytls://password@host:port?params#remark
  return `anytls://${config.password}@${host}:${config.port}${queryStr}#${encodedRemark}`;
}

export function generateSingBoxJson(config: AnyTlsConfig, serverIp: string): string {
  const cleanSni = config.sni ? config.sni.trim() : '';
  const tlsConfig: Record<string, any> = {
    enabled: true,
    insecure: config.insecure,
  };

  if (cleanSni) {
    tlsConfig.server_name = cleanSni;
  }

  const outbound = {
    type: 'anytls',
    tag: config.remark,
    server: serverIp || '127.0.0.1',
    server_port: config.port,
    password: config.password,
    tls: tlsConfig,
    idle_session_check_interval: '30s',
    idle_session_timeout: '30s',
    min_idle_session: 1,
  };

  return JSON.stringify(outbound, null, 2);
}

export function generateClashYaml(config: AnyTlsConfig, serverIp: string): string {
  const cleanSni = config.sni ? config.sni.trim() : '';
  let yaml = `  - name: "${config.remark}"
    type: anytls
    server: ${serverIp || '127.0.0.1'}
    port: ${config.port}
    password: "${config.password}"`;

  if (cleanSni) {
    yaml += `\n    sni: ${cleanSni}`;
  }

  yaml += `\n    skip-cert-verify: ${config.insecure ? 'true' : 'false'}
    idle-session-timeout: 30`;

  return yaml;
}

export function generateRandomPassword(length = 14): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let ret = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    ret += charset[values[i] % charset.length];
  }
  return ret;
}

export function getDaysRemaining(expireAt: string | null): { days: number; isExpired: boolean; text: string } {
  if (!expireAt) {
    return { days: 9999, isExpired: false, text: 'Unlimited' };
  }

  const now = new Date().getTime();
  const exp = new Date(expireAt).getTime();
  const diffMs = exp - now;

  if (diffMs <= 0) {
    return { days: 0, isExpired: true, text: 'Expired' };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) {
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return { days, isExpired: false, text: `${hours}h remaining` };
  }

  return { days, isExpired: false, text: `${days}d remaining` };
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Unlimited';
  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoDate;
  }
}

// Backward compatibility alias
export const formatDateToPersian = formatDate;
