
import { PlatformType, ConnectedAccount, ConnectionMode } from '../types';

const STORAGE_KEY = 'omnistream_accounts';

// Mock user data for simulation
const MOCK_USERS: Record<string, { username: string; avatar: string }> = {
  [PlatformType.Douyin]: { username: '抖音创作者_Mock', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Douyin' },
  [PlatformType.Bilibili]: { username: 'B站UP主_Mock', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bili' },
  [PlatformType.YouTube]: { username: 'YouTube Creator Mock', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=YT' },
  [PlatformType.TikTok]: { username: 'TikTokStar_Mock', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TikTok' },
  [PlatformType.Xiaohongshu]: { username: '生活薯_Mock', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Red' },
};

export const getConnectedAccounts = (): ConnectedAccount[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getAccount = (platformId: PlatformType): ConnectedAccount | undefined => {
  return getConnectedAccounts().find(a => a.platformId === platformId);
};

export const connectAccount = async (
  platformId: PlatformType, 
  mode: ConnectionMode, 
  token?: string
): Promise<ConnectedAccount> => {
  
  // Simulate network delay for effect
  await new Promise(resolve => setTimeout(resolve, 800));

  let username = `User_${platformId}`;
  let avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${platformId}`;

  if (mode === 'mock') {
    const mock = MOCK_USERS[platformId];
    if (mock) {
      username = mock.username;
      avatar = mock.avatar;
    }
  } else {
    // In real mode, we might fetch user profile with the token here if we had CORS access
    // For now, we assume a generic Real User name
    username = `${platformId}_Dev_User`;
  }

  const newAccount: ConnectedAccount = {
    platformId,
    username,
    avatar,
    mode,
    accessToken: token, // DANGEROUS: Storing token in localStorage is not safe for prod, but okay for demo
    connectedAt: Date.now(),
    status: 'Active'
  };

  const current = getConnectedAccounts();
  const updated = [...current.filter(a => a.platformId !== platformId), newAccount];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  return newAccount;
};

export const disconnectAccount = (platformId: PlatformType): void => {
  const current = getConnectedAccounts();
  const updated = current.filter(a => a.platformId !== platformId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const isPlatformConnected = (platformId: PlatformType): boolean => {
  const accounts = getConnectedAccounts();
  return accounts.some(a => a.platformId === platformId && a.status === 'Active');
};
