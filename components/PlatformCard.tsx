import React from 'react';
import { PlatformConfig } from '../types';

interface PlatformCardProps {
  platform: PlatformConfig;
  isSelected: boolean;
  isConnected: boolean;
  onToggle: (id: string) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ platform, isSelected, isConnected, onToggle }) => {
  return (
    <div
      onClick={() => onToggle(platform.id)}
      className={`
        relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-200
        ${isSelected 
          ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-105' 
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
        }
      `}
    >
      <div className={`w-12 h-12 rounded-full ${platform.iconColor} text-white flex items-center justify-center text-2xl shadow-sm relative`}>
        {platform.iconLabel}
        {isConnected && (
           <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="已绑定账号"></div>
        )}
      </div>
      <span className={`font-medium text-sm text-center ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
        {platform.name}
      </span>
      
      {!isConnected && isSelected && (
         <span className="text-[10px] text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">未绑定</span>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 text-indigo-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};