
import { PlatformType, UploadState, DistributionJob, LogEntry, VideoMetadata, ConnectedAccount } from '../types';
import * as AuthService from './authService';

type UpdateCallback = (jobId: string, updates: Partial<DistributionJob>) => void;

/**
 * PublishService: The core engine handling video distribution.
 * Supports both MOCK simulation (default) and REAL API calls (if token provided).
 */
export class PublishService {
  
  private addLog(currentLogs: LogEntry[], message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): LogEntry[] {
    return [...currentLogs, { timestamp: Date.now(), message, type }];
  }

  public async startUpload(
    job: DistributionJob, 
    file: File, 
    metadata: VideoMetadata, 
    updateJob: UpdateCallback
  ) {
    const account = AuthService.getAccount(job.platformId);
    if (!account) {
      updateJob(job.id, { 
        status: UploadState.Error, 
        errorMessage: "Account not connected",
        logs: this.addLog([], "Error: Account session lost.", 'error')
      });
      return;
    }

    // 1. Initialization
    updateJob(job.id, { 
      status: UploadState.Authenticating,
      logs: this.addLog([], `Initializing ${account.mode === 'real' ? 'REAL' : 'MOCK'} session for ${job.platformId}...`) 
    });
    
    await new Promise(r => setTimeout(r, 500));

    try {
      if (account.mode === 'real' && account.accessToken) {
        // --- REAL MODE ---
        await this.executeRealUpload(job, file, metadata, account, updateJob);
      } else {
        // --- MOCK MODE ---
        await this.executeMockUpload(job, file, updateJob);
      }

      // Success (Mock or Real finished)
      // Only mark success if status isn't already Error
      // (Real upload might have set Error internally)
      
    } catch (error: any) {
      updateJob(job.id, {
        status: UploadState.Error,
        errorMessage: error.message || "Upload failed",
        logs: this.addLog(job.logs, `Critical Error: ${error.message}`, 'error')
      });
    }
  }

  // Router for Real API Logic
  private async executeRealUpload(
    job: DistributionJob, 
    file: File, 
    metadata: VideoMetadata,
    account: ConnectedAccount, 
    updateJob: UpdateCallback
  ) {
     let logs = job.logs;
     logs = this.addLog(logs, `[Real API] Connecting to ${job.platformId} endpoints...`);
     updateJob(job.id, { logs });

     try {
       switch (job.platformId) {
         case PlatformType.Douyin:
           await this.uploadDouyinReal(job, file, metadata, account, updateJob);
           break;
         case PlatformType.YouTube:
           await this.uploadYouTubeReal(job, file, metadata, account, updateJob);
           break;
         default:
           throw new Error(`Real API support for ${job.platformId} is under development. Please use Mock mode.`);
       }
     } catch (e: any) {
       // If Real API fails (CORS, 401), we log it but don't fallback silently to ensure "Real" means Real.
       // However, for user experience in this demo env, we will suggest Mock.
       logs = this.addLog(job.logs, `API Request Failed: ${e.message}`, 'error');
       logs = this.addLog(logs, `Tip: Ensure your Access Token is valid and CORS is allowed.`, 'warning');
       updateJob(job.id, { status: UploadState.Error, logs });
       throw e; // Re-throw to stop
     }
  }

  // --- Real Implementation: Douyin ---
  // https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/video-create/
  private async uploadDouyinReal(
    job: DistributionJob, 
    file: File, 
    metadata: VideoMetadata,
    account: ConnectedAccount, 
    updateJob: UpdateCallback
  ) {
    let logs = job.logs;
    const token = account.accessToken;

    // Step 1: Init Upload
    logs = this.addLog(logs, "POST /video/upload/init/ ...");
    updateJob(job.id, { status: UploadState.Uploading, logs });
    
    // Note: This will likely fail in browser due to CORS if Douyin doesn't allow localhost
    // We wrap fetch to catch this specific network error
    const initRes = await this.safeFetch(`https://open.douyin.com/video/upload/init/`, {
       method: 'POST',
       headers: { 'access-token': token!, 'Content-Type': 'application/json' }
    });
    
    const initData = await initRes.json();
    if (initData.data?.error_code) throw new Error(`Douyin Init Failed: ${initData.data.description}`);
    const uploadId = initData.data.upload_id;
    logs = this.addLog(logs, `Upload Initialized. ID: ${uploadId}`);
    updateJob(job.id, { logs });

    // Step 2: Upload Part (Simplified to 1 part for demo)
    const formData = new FormData();
    formData.append('video', file);
    
    logs = this.addLog(logs, `Uploading video data (${(file.size/1024/1024).toFixed(2)}MB)...`);
    updateJob(job.id, { progress: 20, logs });

    const uploadRes = await this.safeFetch(`https://open.douyin.com/video/upload/part/?upload_id=${uploadId}&part_number=1`, {
       method: 'POST',
       headers: { 'access-token': token! },
       body: formData
    });
    const uploadData = await uploadRes.json();
    logs = this.addLog(logs, "Video part uploaded.");
    updateJob(job.id, { progress: 80, logs });

    // Step 3: Complete
    const completeRes = await this.safeFetch(`https://open.douyin.com/video/upload/complete/?upload_id=${uploadId}`, {
       method: 'POST',
       headers: { 'access-token': token! }
    });
    const completeData = await completeRes.json();
    const videoId = completeData.data.video.video_id;

    // Step 4: Create Item
    logs = this.addLog(logs, "Creating video post...");
    await this.safeFetch(`https://open.douyin.com/video/create/`, {
       method: 'POST',
       headers: { 'access-token': token!, 'Content-Type': 'application/json' },
       body: JSON.stringify({
         video_id: videoId,
         text: metadata.title + "\n" + metadata.description,
         poi_id: "",
         poi_name: ""
       })
    });

    updateJob(job.id, { 
      status: UploadState.Success, 
      progress: 100, 
      logs: this.addLog(logs, "Douyin Video Published Successfully!", 'success') 
    });
  }

  // --- Real Implementation: YouTube ---
  // https://developers.google.com/youtube/v3/guides/uploading_a_video
  private async uploadYouTubeReal(
    job: DistributionJob, 
    file: File, 
    metadata: VideoMetadata,
    account: ConnectedAccount, 
    updateJob: UpdateCallback
  ) {
    let logs = job.logs;
    const token = account.accessToken;

    // Step 1: Initiate Resumable Session
    logs = this.addLog(logs, "Initiating Resumable Upload Session...");
    updateJob(job.id, { status: UploadState.Uploading, logs });

    const initBody = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: "22" // People & Blogs
      },
      status: {
        privacyStatus: "private" // Default to private for safety
      }
    };

    const initRes = await this.safeFetch(`https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json',
         'X-Upload-Content-Length': file.size.toString(),
         'X-Upload-Content-Type': file.type || 'video/mp4'
       },
       body: JSON.stringify(initBody)
    });

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error("Failed to get YouTube upload location");
    
    logs = this.addLog(logs, "Session Created. Starting binary upload...");
    updateJob(job.id, { progress: 10, logs });

    // Step 2: Upload Binary
    const uploadRes = await this.safeFetch(uploadUrl, {
       method: 'PUT',
       headers: {
         'Content-Type': file.type || 'video/mp4'
       },
       body: file
    });

    const result = await uploadRes.json();
    updateJob(job.id, { 
      status: UploadState.Success, 
      progress: 100, 
      resultUrl: `https://youtu.be/${result.id}`,
      logs: this.addLog(logs, `YouTube Upload Complete! ID: ${result.id}`, 'success') 
    });
  }

  // Wrapper to handle fetch errors safely
  private async safeFetch(url: string, options: RequestInit) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
      return response;
    } catch (e: any) {
      if (e.message.includes('Failed to fetch')) {
        throw new Error("Network Error: Likely CORS issue (Browser blocked request to external API).");
      }
      throw e;
    }
  }


  // --- MOCK LOGIC (Fallback) ---
  private async executeMockUpload(job: DistributionJob, file: File, updateJob: UpdateCallback) {
      let logs = job.logs;
      // Simulate different API requirements
      switch (job.platformId) {
        case PlatformType.Douyin:
        case PlatformType.TikTok:
          logs = await this.simulateMultipartUpload(job, updateJob, logs);
          break;
        case PlatformType.YouTube:
          logs = await this.simulateResumableUpload(job, updateJob, logs);
          break;
        default:
          logs = await this.simulateGenericUpload(job, updateJob, logs);
      }

      // Final Metadata Submission
      updateJob(job.id, { 
        status: UploadState.Processing,
        logs: this.addLog(logs, "Submitting video metadata (Title, Desc, Tags)...")
      });
      
      await new Promise(r => setTimeout(r, 1500));

      // Success
      updateJob(job.id, {
        status: UploadState.Success,
        progress: 100,
        logs: this.addLog(logs, "Video published successfully! (Mock)", 'success'),
        resultUrl: `https://${job.platformId.toLowerCase()}.com/video/${Math.floor(Math.random()*100000)}`
      });
  }

  // Simulates APIs like Douyin/TikTok that use chunked/multipart uploads
  private async simulateMultipartUpload(job: DistributionJob, updateJob: UpdateCallback, logs: LogEntry[]) {
    logs = this.addLog(logs, "Requesting upload session (Mock)...");
    updateJob(job.id, { logs });
    await new Promise(r => setTimeout(r, 800));

    const chunks = 5;
    for (let i = 1; i <= chunks; i++) {
      const progress = Math.floor((i / chunks) * 80);
      logs = this.addLog(logs, `Uploading chunk ${i}/${chunks}...`);
      updateJob(job.id, { status: UploadState.Uploading, progress, logs });
      await new Promise(r => setTimeout(r, 600));
    }

    logs = this.addLog(logs, "Committing file parts...");
    updateJob(job.id, { progress: 90, logs });
    await new Promise(r => setTimeout(r, 800));
    return logs;
  }

  // Simulates Google/YouTube Resumable Media Upload Protocol
  private async simulateResumableUpload(job: DistributionJob, updateJob: UpdateCallback, logs: LogEntry[]) {
    logs = this.addLog(logs, "Initializing Resumable Upload Session (Mock)...");
    updateJob(job.id, { logs });
    await new Promise(r => setTimeout(r, 1000));

    // Fake bytes stream
    logs = this.addLog(logs, `Streaming data...`);
    for(let i=0; i<5; i++) {
       logs = this.addLog(logs, `Transferred ${((i+1)*10).toFixed(0)}%...`);
       updateJob(job.id, { status: UploadState.Uploading, progress: (i+1)*18, logs });
       await new Promise(r => setTimeout(r, 500));
    }
    
    logs = this.addLog(logs, "Processing video on server...");
    updateJob(job.id, { progress: 95, logs });
    await new Promise(r => setTimeout(r, 2000));
    return logs;
  }

  private async simulateGenericUpload(job: DistributionJob, updateJob: UpdateCallback, logs: LogEntry[]) {
     logs = this.addLog(logs, "Uploading file (Mock)...");
     updateJob(job.id, { status: UploadState.Uploading, progress: 20, logs });
     await new Promise(r => setTimeout(r, 1000));
     
     updateJob(job.id, { status: UploadState.Uploading, progress: 60 });
     await new Promise(r => setTimeout(r, 1000));
     
     updateJob(job.id, { status: UploadState.Uploading, progress: 90 });
     return logs;
  }
}

export const publishService = new PublishService();
