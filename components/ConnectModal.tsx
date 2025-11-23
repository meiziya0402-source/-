
import React, { useState } from 'react';
import { PlatformConfig, ConnectionMode } from '../types';

interface ConnectModalProps {
  platform: PlatformConfig;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: ConnectionMode, token?: string) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ platform, isOpen, onClose, onConfirm }) => {
  const [mode, setMode] = useState<ConnectionMode>('mock');
  const [token, setToken] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (mode === 'real' && !token) {
      alert('请输入 Access Token');
      return;
    }
    onConfirm(mode, token);
    setToken(''); // Reset
    setMode('mock');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`p-6 ${platform.iconColor} text-white`}>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl backdrop-blur-md">
               {platform.iconLabel}
             </div>
             <div>
               <h3 className="text-xl font-bold">连接 {platform.name}</h3>
               <p className="text-white/80 text-xs">绑定账号以启用一键分发</p>
             </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
           <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
               onClick={() => setMode('mock')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'mock' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               模拟演示 (Mock)
             </button>
             <button 
               onClick={() => setMode('real')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'real' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               真实开发 (Real API)
             </button>
           </div>

           {mode === 'mock' ? (
             <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
               <p>✨ <b>演示模式：</b></p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>模拟 OAuth 授权流程</li>
                 <li>模拟上传进度和网络延迟</li>
                 <li>无需真实 API Key，适合体验功能</li>
               </ul>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-100">
                 ⚠️ <b>开发者模式：</b> 需要有效的 API Access Token。由于浏览器 CORS 限制，部分请求可能需要配置代理或在服务器端执行。
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
                 <input 
                   type="text" 
                   value={token}
                   onChange={(e) => setToken(e.target.value)}
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                   placeholder={`粘贴 ${platform.name} 的 Access Token`}
                 />
                 <p className="text-[10px] text-slate-400 mt-1">
                   {platform.id === 'YouTube' ? '例如: ya29.a0Af...' : '例如: act.123456...'}
                 </p>
               </div>
             </div>
           )}

           <div className="flex gap-3 justify-end pt-2">
             <button 
               onClick={onClose}
               className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
             >
               取消
             </button>
             <button 
               onClick={handleConfirm}
               className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all active:scale-95"
             >
               {mode === 'mock' ? '一键模拟连接' : '验证并绑定'}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
