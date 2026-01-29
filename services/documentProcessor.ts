
import { UploadedFile, AISettings } from "../types";

export const processFile = async (
  file: File, 
  settings: AISettings,
  onProgress: (status: UploadedFile['status'], message?: string) => void
): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    
    // Initialize Worker
    // Note: In Vite/Webpack, this works. In this specific ESM setup, we rely on the browser loading the module.
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    const fileId = crypto.randomUUID();

    worker.onmessage = (e) => {
      const { type, status, message, result, error } = e.data;

      if (type === 'status') {
        // Just log or update simple status for now. 
        // In a real app we'd expose 'message' to the UI
        onProgress(status);
        console.log(`[Worker] ${message}`);
      } else if (type === 'complete') {
        worker.terminate();
        resolve(result);
      } else if (type === 'error') {
        worker.terminate();
        onProgress('error');
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      console.error("Worker Error:", err);
      worker.terminate();
      reject(err);
    };

    // Read file as ArrayBuffer (transferable) to send to worker
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      
      // Send data to worker
      // We pass settings and env API key separately to ensure worker has access
      worker.postMessage({
        fileData: arrayBuffer,
        fileName: file.name,
        fileType: file.type,
        fileId: fileId,
        settings: {
           ...settings,
           envKey: process.env.API_KEY
        }
      }, [arrayBuffer]); // Transfer the arrayBuffer to worker (zero-copy)
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};
