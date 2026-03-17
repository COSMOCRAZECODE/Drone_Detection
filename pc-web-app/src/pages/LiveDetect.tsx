import { useRef, useState, useEffect } from 'react';
import { getWebSocketUrl } from '../api';
import { Video, AlertTriangle, ShieldCheck, CameraOff, Play } from 'lucide-react';

export default function LiveDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<any>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<any>({ drone_detected: false, confidence: 0 });
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const initCamera = () => {
    setShowPrompt(true);
    setSessionName(`Surveillance_${new Date().toLocaleTimeString([], { hour12: false }).replace(/:/g, '-')}`);
  };

  const startCamera = async () => {
    if (!sessionName.trim()) return;
    setShowPrompt(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
      setError('');
      connectWebSocket(sessionName);
    } catch (err) {
      setError('Camera access denied. Please check your browser permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsStreaming(false);
    setStatus({ drone_detected: false, confidence: 0 });
    clearOverlay();
  };

  const connectWebSocket = (sid: string) => {
    const wsUrl = getWebSocketUrl(sid);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatus({ drone_detected: data.drone_detected, confidence: data.confidence });
        if (data.boxes) {
          drawOverlay(data.boxes);
        } else {
          clearOverlay();
        }
      } catch (err) { console.error("WS Message Error", err); }
    };

    ws.onclose = () => {
      if (isStreaming) setError('Link lost. Re-establishing connection...');
    };
  };

  const clearOverlay = () => {
    if (!overlayRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
  };

  const drawOverlay = (boxes: any[]) => {
    if (!overlayRef.current || !videoRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    const canvas = overlayRef.current;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boxes.forEach(b => {
      let x1, y1, x2, y2, conf;
      if (b.x1 !== undefined && b.y1 !== undefined) {
        x1 = b.x1 * canvas.width;
        y1 = b.y1 * canvas.height;
        x2 = b.x2 * canvas.width;
        y2 = b.y2 * canvas.height;
        conf = b.confidence;
      }
      else {
        const boxData = b.box || b;
        if (Array.isArray(boxData) && boxData.length === 4) {
          [x1, y1, x2, y2] = boxData;
          conf = b.confidence || status.confidence;
        }
      }

      if (x1 !== undefined && y1 !== undefined) {
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = '#00f2ff';
        ctx.font = 'bold 20px Arial';
        const label = `DRONE ${(conf * 100).toFixed(0)}%`;
        ctx.fillText(label, x1, y1 > 30 ? y1 - 10 : 30);
      }
    });
  };

  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2 && wsRef.current?.readyState === WebSocket.OPEN) {
          const canvas = canvasRef.current!;
          const video = videoRef.current;
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const base64 = canvas.toDataURL('image/jpeg', 0.6);
              wsRef.current.send(base64);
            }
          }
        }
      }, 300);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStreaming]);

  useEffect(() => { return () => stopCamera(); }, []);

  return (
    <div className="main-content">
      {showPrompt && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="text-xl font-bold mb-4">Start Detection Session</h2>
            <p className="text-muted text-sm mb-6">Give this session a name to organize your history.</p>
            <div className="input-group">
                <label className="input-label">Session Name</label>
                <input 
                    type="text" 
                    className="input-field" 
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g. Backyard Scan"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && startCamera()}
                />
            </div>
            <div className="flex gap-4 mt-8">
                <button onClick={() => setShowPrompt(false)} className="btn btn-secondary flex-1">CANCEL</button>
                <button onClick={startCamera} className="btn btn-primary flex-1">START FEED</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Detection</h1>
        <p className="text-muted mt-2">Real-time accelerated drone defense feed.</p>
      </div>

      <div className="card">
        {error && <div className="badge badge-danger mb-4 w-full text-center">{error}</div>}

        <div className="image-preview-container" style={{ height: '500px', border: 'none', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />
          <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 10, pointerEvents: 'none' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!isStreaming && (
            <div className="flex flex-col items-center justify-center gap-4 text-muted w-full h-full">
              <CameraOff size={64} style={{ opacity: 0.15 }} />
              <p className="font-bold uppercase tracking-widest text-xs opacity-50">Feed Offline</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-between items-center gap-6 pb-2">
          {!isStreaming ? (
            <button onClick={initCamera} className="btn btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem', borderRadius: '0.75rem' }}>
              <Play size={20} fill="currentColor" /> INITIALIZE SCAN
            </button>
          ) : (
            <button onClick={stopCamera} className="btn" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <CameraOff size={20} /> STOP FEED
            </button>
          )}

          <div style={{ minWidth: '300px' }}>
            {status.drone_detected ? (
              <div className="badge badge-danger text-lg py-4 px-8 w-full flex items-center justify-center gap-4" style={{ borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertTriangle size={24} />
                <span className="font-black uppercase tracking-tight">Drone Detected ({(status.confidence * 100).toFixed(0)}%)</span>
              </div>
            ) : (
              <div className="badge badge-success text-lg py-4 px-8 w-full flex items-center justify-center gap-4" style={{ borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <ShieldCheck size={24} />
                <span className="font-black uppercase tracking-tight">Airspace Secure</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
