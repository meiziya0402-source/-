import React from 'react';
import { HistoryItem } from '../types';
import { SUPPORTED_PLATFORMS } from '../constants';

interface HistoryListProps {
  history: HistoryItem[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-lg font-semibold text-slate-800">历史发布记录</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="px-6 py-3">时间</th>
              <th className="px-6 py-3">视频名称</th>
              <th className="px-6 py-3">发布平台</th>
              <th className="px-6 py-3">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{item.videoName}</td>
                <td className="px-6 py-4">
                  <div className="flex -space-x-2">
                    {item.platforms.map((pid) => {
                       const p = SUPPORTED_PLATFORMS.find(sp => sp.id === pid);
                       return p ? (
                         <div key={pid} className={`w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] text-white ${p.iconColor}`} title={p.name}>
                           {p.iconLabel}
                         </div>
                       ) : null;
                    })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${item.status === 'Complete' ? 'bg-green-100 text-green-800' : 
                      item.status === 'Failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.status === 'Complete' ? '发布成功' : item.status === 'Failed' ? '发布失败' : '部分成功'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};