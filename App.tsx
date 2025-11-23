
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SUPPORTED_PLATFORMS, MOCK_HISTORY } from './constants';
import { PlatformType, VideoMetadata, UploadState, DistributionJob, ConnectedAccount, PlatformConfig, ConnectionMode } from './types';
import { PlatformCard } from './components/PlatformCard';
import { AccountCard } from './components/AccountCard';
import { HistoryList } from './components/HistoryList';
import { ConnectModal } from './components/ConnectModal';
import { generateVideoCopy } from './services/geminiService';
import * as AuthService from './services/authService';
import { publishService } from './services/publishService';

type ViewMode = 'publish' | 'accounts' | 'history';

const App: React.FC = () => {
  // Navigation
  const [currentView, setCurrentView] = useState<ViewMode>('publish');

  // State: Accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [authLoadingId, setAuthLoadingId] = useState<string | null>(null);
  
  // State: Connect Modal
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<PlatformConfig | null>(null);

  // State: File & Preview
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  // State: Metadata
  const [metadata, setMetadata] = useState<VideoMetadata>({ title: '', description: '', tags: [] });
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // State: Platforms & Schedule
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  // State: Publishing
  const [jobs, setJobs] = useState<DistributionJob[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load Accounts on Mount
  useEffect(() => {
    setAccounts(AuthService.getConnectedAccounts());
  }, []);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setMetadata(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleCaptureCover = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setCoverImage(canvas.toDataURL('image/jpeg'));
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) setCoverImage(ev.target.result as string);
        }
        reader.readAsDataURL(e.target.files[0]);
     }
  };

  const togglePlatform = (id: string) => {
    const platformId = id as PlatformType;
    setSelectedPlatforms(prev => 
      prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId]
    );
  };

  const handleAiGenerate = async () => {
    if (!metadata.title) {
      alert("请输入视频主题或简短标题作为AI生成的依据");
      return;
    }
    setIsAiGenerating(true);
    try {
      const result = await generateVideoCopy(metadata.title, selectedPlatforms.length > 0 ? selectedPlatforms[0] : 'General');
      setMetadata({
        title: result.title,
        description: result.description,
        tags: result.tags
      });
    } catch (e) {
      alert("AI 生成失败，请检查 API Key 或网络连接。");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Auth Handlers
  const handleRequestConnect = (platform: PlatformConfig) => {
    setTargetPlatform(platform);
    setConnectModalOpen(true);
  };

  const handleConfirmConnect = async (mode: ConnectionMode, token?: string) => {
    if (!targetPlatform) return;
    setConnectModalOpen(false);
    setAuthLoadingId(targetPlatform.id);
    
    try {
      const newAccount = await AuthService.connectAccount(targetPlatform.id, mode, token);
      setAccounts(prev => [...prev.filter(a => a.platformId !== targetPlatform.id), newAccount]);
    } catch (e) {
      alert("连接失败");
    } finally {
      setAuthLoadingId(null);
      setTargetPlatform(null);
    }
  };

  const disconnectPlatform = (platformId: string) => {
    AuthService.disconnectAccount(platformId as PlatformType);
    setAccounts(prev => prev.filter(a => a.platformId !== platformId));
  };

  // Publishing Logic
  const startPublishing = async () => {
    if (!videoFile) return;
    if (selectedPlatforms.length === 0) {
      alert("请至少选择一个发布平台");
      return;
    }
    
    // Validation: Check connection
    const missingAuth = selectedPlatforms.filter(p => !AuthService.isPlatformConnected(p));
    if (missingAuth.length > 0) {
      alert(`请先在账号管理中绑定以下平台账号: ${missingAuth.map(id => SUPPORTED_PLATFORMS.find(p => p.id === id)?.name).join(', ')}`);
      setCurrentView('accounts');
      return;
    }

    setIsPublishing(true);
    
    // Initialize Jobs
    const initialJobs: DistributionJob[] = selectedPlatforms.map(p => ({
      id: Math.random().toString(36).substr(2, 9),
      platformId: p,
      status: UploadState.Queued,
      progress: 0,
      logs: [],
      timestamp: Date.now()
    }));
    setJobs(initialJobs);

    // Execute Uploads
    const uploadPromises = initialJobs.map(job => {
      return publishService.startUpload(job, videoFile, metadata, (jobId, updates) => {
        setJobs(current => current.map(j => j.id === jobId ? { ...j, ...updates } : j));
      });
    });

    await Promise.all(uploadPromises);
    setIsPublishing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20">
      {/* Modal */}
      {targetPlatform && (
        <ConnectModal 
          platform={targetPlatform}
          isOpen={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
          onConfirm={handleConfirmConnect}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('publish')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-md">O</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              OmniStream <span className="text-slate-500 text-sm font-normal hidden sm:inline-block ml-2">一键分发工具</span>
            </h1>
          </div>
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentView('publish')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'publish' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              发布视频
            </button>
            <button 
              onClick={() => setCurrentView('accounts')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'accounts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              账号管理
            </button>
            <button 
              onClick={() => setCurrentView('history')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${currentView === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              历史记录
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow space-y-8">
        
        {currentView === 'history' && <HistoryList history={MOCK_HISTORY as any} />}

        {currentView === 'accounts' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 flex items-start gap-3">
               <span className="text-xl">💡</span>
               <div>
                 <p className="font-bold mb-1">账号绑定说明</p>
                 <p>您可以选择 <b>Mock 模式</b> 体验功能，或切换至 <b>Real 模式</b> 输入 Access Token 进行真实 API 调用。</p>
               </div>
             </div>
             
             <div>
               <h3 className="text-lg font-bold text-slate-800 mb-4">国内平台</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SUPPORTED_PLATFORMS.filter(p => p.region === 'CN').map(p => (
                    <AccountCard 
                      key={p.id} 
                      platform={p} 
                      account={accounts.find(a => a.platformId === p.id)}
                      onConnect={handleRequestConnect}
                      onDisconnect={disconnectPlatform}
                      isLoading={authLoadingId === p.id}
                    />
                  ))}
               </div>
             </div>

             <div>
               <h3 className="text-lg font-bold text-slate-800 mb-4">海外平台</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SUPPORTED_PLATFORMS.filter(p => p.region === 'Global').map(p => (
                    <AccountCard 
                      key={p.id} 
                      platform={p} 
                      account={accounts.find(a => a.platformId === p.id)}
                      onConnect={handleRequestConnect}
                      onDisconnect={disconnectPlatform}
                      isLoading={authLoadingId === p.id}
                    />
                  ))}
               </div>
             </div>
          </div>
        )}

        {currentView === 'publish' && (
          <div className="animate-in fade-in duration-300">
            {/* Step 1: Upload & Preview */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                上传视频与封面
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Video Upload Area */}
                <div className="space-y-4">
                   {!videoPreviewUrl ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors h-64 relative group cursor-pointer">
                        <div className="group-hover:scale-110 transition-transform duration-200">
                           <svg className="w-12 h-12 text-slate-400 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                           </svg>
                        </div>
                        <p className="text-sm text-slate-500 mb-2 font-medium">拖拽视频文件到此处，或点击上传</p>
                        <p className="text-xs text-slate-400">支持 MP4, MOV, AVI (最大 2GB)</p>
                        <input 
                          type="file" 
                          accept="video/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          onChange={handleFileChange}
                        />
                      </div>
                   ) : (
                     <div className="relative rounded-xl overflow-hidden bg-black aspect-video group shadow-lg">
                       <video 
                         ref={videoRef}
                         src={videoPreviewUrl} 
                         className="w-full h-full object-contain"
                         controls
                       />
                       <button 
                        onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                     </div>
                   )}
                </div>

                {/* Cover & Metadata */}
                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">视频封面</label>
                      <div className="flex gap-4 items-start">
                        <div className="w-32 h-48 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center relative group shadow-inner">
                          {coverImage ? (
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-400 px-2 text-center">暂无封面</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                           <button 
                             onClick={handleCaptureCover}
                             disabled={!videoPreviewUrl}
                             className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors shadow-sm"
                           >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             从视频提取
                           </button>
                           <label className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer text-center transition-colors shadow-sm">
                             上传图片
                             <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                           </label>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </section>

            {/* Step 2: Content Editing */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                    文案编辑
                 </h2>
                 <button 
                  onClick={handleAiGenerate}
                  disabled={isAiGenerating || !metadata.title}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                 >
                   {isAiGenerating ? (
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   ) : (
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   )}
                   AI 一键生成
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">视频标题</label>
                   <input 
                     type="text" 
                     value={metadata.title}
                     onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                     className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                     placeholder="输入一个引人注目的标题..."
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">视频描述</label>
                   <textarea 
                     rows={4}
                     value={metadata.description}
                     onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                     className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none resize-none"
                     placeholder="添加描述、话题标签、链接等..."
                   />
                 </div>
                 {metadata.tags.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-2">
                     {metadata.tags.map((tag, idx) => (
                       <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium">#{tag}</span>
                     ))}
                   </div>
                 )}
               </div>
            </section>

            {/* Step 3: Platform Selection */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
               <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">3</span>
                  选择发布平台
               </h2>
               
               <div className="mb-6">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">国内主流平台</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                   {SUPPORTED_PLATFORMS.filter(p => p.region === 'CN').map(platform => (
                     <PlatformCard 
                        key={platform.id} 
                        platform={platform} 
                        isSelected={selectedPlatforms.includes(platform.id)}
                        isConnected={AuthService.isPlatformConnected(platform.id)}
                        onToggle={togglePlatform}
                     />
                   ))}
                 </div>
               </div>
               
               <div>
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">海外平台</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                   {SUPPORTED_PLATFORMS.filter(p => p.region === 'Global').map(platform => (
                     <PlatformCard 
                        key={platform.id} 
                        platform={platform} 
                        isSelected={selectedPlatforms.includes(platform.id)}
                        isConnected={AuthService.isPlatformConnected(platform.id)}
                        onToggle={togglePlatform}
                     />
                   ))}
                 </div>
               </div>
            </section>

            {/* Step 4: Schedule & Publish */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
               <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">4</span>
                  发布设置
               </h2>

               <div className="flex flex-col md:flex-row gap-6 mb-8">
                 <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-auto">
                   <input 
                    type="radio" 
                    name="schedule" 
                    checked={scheduleType === 'immediate'} 
                    onChange={() => setScheduleType('immediate')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                   />
                   <span className="font-medium text-slate-700">立即发布</span>
                 </label>
                 
                 <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-auto">
                   <input 
                    type="radio" 
                    name="schedule" 
                    checked={scheduleType === 'scheduled'} 
                    onChange={() => setScheduleType('scheduled')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                   />
                   <span className="font-medium text-slate-700">定时发布</span>
                 </label>

                 {scheduleType === 'scheduled' && (
                   <input 
                    type="datetime-local" 
                    className="px-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700"
                    onChange={(e) => setScheduleTime(e.target.value)}
                   />
                 )}
               </div>

               <button 
                onClick={startPublishing}
                disabled={isPublishing || !videoFile || selectedPlatforms.length === 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {isPublishing ? '任务执行中...' : '确认发布'}
                 {!isPublishing && (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 )}
               </button>

               {/* Progress & Logs Area */}
               {jobs.length > 0 && (
                 <div className="mt-8 space-y-6 border-t border-slate-100 pt-8 animate-in slide-in-from-bottom-5 duration-500">
                   <h3 className="font-medium text-slate-700">分发状态监控</h3>
                   {jobs.map(job => {
                     const platformName = SUPPORTED_PLATFORMS.find(p => p.id === job.platformId)?.name;
                     const isError = job.status === UploadState.Error;
                     const isSuccess = job.status === UploadState.Success;
                     const isProcessing = job.status === UploadState.Processing;
                     
                     return (
                       <div key={job.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800">{platformName}</h4>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${isSuccess ? 'bg-green-100 text-green-700 border-green-200' : isError ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                        {job.status === UploadState.Uploading ? '上传中...' : job.status}
                                    </span>
                                </div>
                                <span className="text-xs font-mono text-slate-500">{job.progress}%</span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3 relative">
                                <div 
                                  className={`h-full transition-all duration-300 ${isSuccess ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${job.progress}%` }}
                                ></div>
                                {isProcessing && (
                                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                )}
                            </div>
                            
                            {/* Logs Output */}
                            <div className="bg-slate-900 rounded-md p-3 h-32 overflow-y-auto text-[10px] font-mono leading-relaxed scroll-smooth shadow-inner">
                                {job.logs.length === 0 && <span className="text-slate-500">Waiting to start...</span>}
                                {job.logs.map((log, i) => (
                                    <div key={i} className={`${log.type === 'error' ? 'text-red-400 font-bold' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                                        <span className="text-slate-600 mr-2 select-none">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                                        {log.message}
                                    </div>
                                ))}
                                {job.resultUrl && (
                                    <div className="mt-2 pt-2 border-t border-slate-800">
                                        <a href={job.resultUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 group">
                                            查看发布结果 
                                            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                          </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
