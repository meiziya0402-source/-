import { PlatformConfig, PlatformType } from './types';

export const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  // Domestic
  { 
    id: PlatformType.Douyin, 
    name: '抖音', 
    region: 'CN', 
    iconColor: 'bg-black', 
    iconLabel: '🎵',
    supportedFormats: ['mp4', 'mov'],
    maxDurationSec: 900 
  },
  { 
    id: PlatformType.Kuaishou, 
    name: '快手', 
    region: 'CN', 
    iconColor: 'bg-orange-500', 
    iconLabel: '⚡',
    supportedFormats: ['mp4', 'mov', 'flv']
  },
  { 
    id: PlatformType.Xiaohongshu, 
    name: '小红书', 
    region: 'CN', 
    iconColor: 'bg-red-500', 
    iconLabel: '📕',
    supportedFormats: ['mp4', 'mov'] 
  },
  { 
    id: PlatformType.WeChatChannels, 
    name: '视频号', 
    region: 'CN', 
    iconColor: 'bg-green-600', 
    iconLabel: '💬',
    supportedFormats: ['mp4']
  },
  { 
    id: PlatformType.Bilibili, 
    name: 'Bilibili', 
    region: 'CN', 
    iconColor: 'bg-pink-400', 
    iconLabel: '📺',
    supportedFormats: ['mp4', 'flv', 'avi']
  },
  // Global
  { 
    id: PlatformType.X, 
    name: 'X (Twitter)', 
    region: 'Global', 
    iconColor: 'bg-slate-900', 
    iconLabel: '𝕏',
    supportedFormats: ['mp4', 'mov']
  },
  { 
    id: PlatformType.TikTok, 
    name: 'TikTok', 
    region: 'Global', 
    iconColor: 'bg-teal-400', 
    iconLabel: '♪',
    supportedFormats: ['mp4', 'mov']
  },
  { 
    id: PlatformType.YouTube, 
    name: 'YouTube', 
    region: 'Global', 
    iconColor: 'bg-red-600', 
    iconLabel: '▶️',
    supportedFormats: ['mp4', 'mov', 'avi', 'wmv']
  },
];

export const MOCK_HISTORY = [
  { id: '1', date: '2023-10-24 14:30', videoName: 'Product_Launch_v2.mp4', platforms: [PlatformType.Douyin, PlatformType.TikTok], status: 'Complete' },
  { id: '2', date: '2023-10-23 09:15', videoName: 'Daily_Vlog_05.mp4', platforms: [PlatformType.Bilibili, PlatformType.YouTube], status: 'Complete' },
];