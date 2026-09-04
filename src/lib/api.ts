import { AnyTlsConfig, ServerStatus, RenewOptions, ConfigProcessDetails } from '../types';

const TOKEN_KEY = 'anytls_panel_token';
const USERNAME_KEY = 'anytls_panel_username';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getStoredUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || 'admin';
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      removeStoredToken();
    }
    throw new Error(data.error || `Server communication error (${res.status})`);
  }

  return data as T;
}

export const api = {
  async login(username: string, password: string): Promise<{ token: string; username: string }> {
    const res = await apiRequest<{ success: boolean; token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setStoredToken(res.token, res.username);
    return res;
  },

  async checkAuth(): Promise<{ isLoggedIn: boolean; username?: string }> {
    try {
      return await apiRequest<{ isLoggedIn: boolean; username: string }>('/api/auth/me');
    } catch {
      return { isLoggedIn: false };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      removeStoredToken();
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async updateSettings(payload: {
    currentPassword?: string;
    newPassword?: string;
    newPort?: number;
  }): Promise<{ success: boolean; message: string; portChanged?: boolean; newPort?: number }> {
    return apiRequest<{ success: boolean; message: string; portChanged?: boolean; newPort?: number }>('/api/settings/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getConfigs(): Promise<{ configs: AnyTlsConfig[]; serverIp: string }> {
    return apiRequest<{ configs: AnyTlsConfig[]; serverIp: string }>('/api/configs');
  },

  async createConfig(payload: Partial<AnyTlsConfig>): Promise<{ success: boolean; config: AnyTlsConfig }> {
    return apiRequest<{ success: boolean; config: AnyTlsConfig }>('/api/configs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateConfig(id: string, payload: Partial<AnyTlsConfig>): Promise<{ success: boolean; config: AnyTlsConfig }> {
    return apiRequest<{ success: boolean; config: AnyTlsConfig }>(`/api/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async toggleConfig(id: string): Promise<{ success: boolean; status: AnyTlsConfig['status'] }> {
    return apiRequest<{ success: boolean; status: AnyTlsConfig['status'] }>(`/api/configs/${id}/toggle`, {
      method: 'POST',
    });
  },

  async renewConfig(id: string, options: RenewOptions): Promise<{ success: boolean; config: AnyTlsConfig }> {
    return apiRequest<{ success: boolean; config: AnyTlsConfig }>(`/api/configs/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async deleteConfig(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/configs/${id}`, {
      method: 'DELETE',
    });
  },

  async getServerStatus(): Promise<ServerStatus> {
    return apiRequest<ServerStatus>('/api/server/status');
  },

  async getConfigProcess(id: string): Promise<ConfigProcessDetails> {
    return apiRequest<ConfigProcessDetails>(`/api/configs/${id}/process`);
  },

  async restartConfigProcess(id: string): Promise<{ success: boolean; status?: string }> {
    return apiRequest<{ success: boolean; status?: string }>(`/api/configs/${id}/restart-process`, {
      method: 'POST',
    });
  },

  async getSystemInfo(): Promise<{ isStandalone: boolean; serverIp?: string }> {
    try {
      const res = await fetch('/api/system-info');
      if (!res.ok) return { isStandalone: false };
      return await res.json();
    } catch {
      return { isStandalone: false };
    }
  },
};
