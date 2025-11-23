
export enum PlatformType {
  Douyin = 'Douyin',
  Kuaishou = 'Kuaishou',
  Xiaohongshu = 'Xiaohongshu',
  WeChatChannels = 'WeChatChannels',
  Bilibili = 'Bilibili',
  X = 'X',
  TikTok = 'TikTok',
  YouTube = 'YouTube',
}

export enum UploadState {
  Idle = 'Idle',
  Queued = 'Queued',
  Authenticating = 'Authenticating',
  Uploading = 'Uploading',
  Processing = 'Processing',
  Success = 'Success',
  Error = 'Error',
}

export type ConnectionMode = 'mock' | 'real';

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  region: 'CN' | 'Global';
  iconColor: string;
  iconLabel: string;
  maxDurationSec?: number;
  maxTitleLength?: number;
  supportedFormats: string[];
}

export interface ConnectedAccount {
  platformId: PlatformType;
  username: string;
  avatar?: string;
  mode: ConnectionMode;
  accessToken?: string; // Stored locally for 'real' mode
  refreshToken?: string;
  connectedAt: number;
  status: 'Active' | 'Expired';
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface DistributionJob {
  id: string;
  platformId: PlatformType;
  status: UploadState;
  progress: number;
  logs: LogEntry[];
  errorMessage?: string;
  resultUrl?: string;
  timestamp: number;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
}

export interface HistoryItem {
  id: string;
  date: string;
  videoName: string;
  platforms: PlatformType[];
  status: 'Complete' | 'Partial' | 'Failed';
}
