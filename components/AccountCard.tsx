
import React from 'react';
import { PlatformConfig, ConnectedAccount } from '../types';

interface AccountCardProps {
  platform: PlatformConfig;
  account?: ConnectedAccount;
  onConnect: (platform: PlatformConfig) => void;
  onDisconnect: (id: string) => void;
  isLoading: boolean;
}

export const AccountCard: React.FC<AccountCardProps> = ({ 
  platform, 
  account, 
  onConnect, 
  onDisconnect,
  isLoading 
}) => {
  const isConnected = !!account;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Background decoration for real mode */}
      {isConnected && account.mode === 'real' && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 -mr-8 -mt-8 rounded-full pointer-events-none"></div>
      )}

      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${platform.iconColor} text-white flex items-center justify-center text-2xl shadow-sm shrink-0`}>
          {platform.iconLabel}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
             <h3 className="font-bold text-slate-800 truncate">{platform.name}</h3>
             {isConnected && (
               <span className={`text-[10px] px-1.5 py-0.5 rounded border ${account.mode === 'real' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                 {account.mode === 'real' ? 'API' : 'MOCK'}
               </span>
             )}
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2 mt-1">
               {account.avatar && <img src={account.avatar} alt="" className="w-5 h-5 rounded-full bg-slate-100" />}
               <span className="text-xs text-green-600 font-medium flex items-center gap-1 truncate max-w-[120px]">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 {account.username}
               </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-1">未绑定账号</p>
          )}
        </div>
      </div>

      <div className="shrink-0 ml-2">
        {isLoading ? (
           <div className="px-4 py-2 text-slate-400 text-sm"><span className="animate-spin inline-block mr-2">⟳</span>处理中...</div>
        ) : isConnected ? (
          <button 
            onClick={() => onDisconnect(platform.id)}
            className="px-4 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            断开
          </button>
        ) : (
          <button 
            onClick={() => onConnect(platform)}
            className="px-4 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
          >
            绑定
          </button>
        )}
      </div>
    </div>
  );
};
