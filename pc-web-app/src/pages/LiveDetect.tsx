import { useRef, useState, useEffect } from 'react';
import { getWebSocketUrl } from '../api';
import { Video, AlertTriangle, ShieldCheck, CameraOff } from 'lucide-react';

export default function LiveDetect() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<any>(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [status, setStatus] = useState<any>({ drone_detected: false, confidence: 0 });
    const [error, setError] = useState('');

    const startCamera = async () => {
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
            connectWebSocket();
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
    };

    const connectWebSocket = () => {
        const wsUrl = getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setStatus({ drone_detected: data.drone_detected, confidence: data.confidence });
            drawOverlay(data.boxes || []);
        };
        
        ws.onclose = () => {
            if (isStreaming) setError('Link lost. Attempting to reconnect...');
        };
    };

    const drawOverlay = (boxes: any[]) => {
        if (!overlayRef.current || !videoRef.current) return;
        const ctx = overlayRef.current.getContext('2d');
        if (!ctx) return;

        const video = videoRef.current;
        overlayRef.current.width = video.videoWidth;
        overlayRef.current.height = video.videoHeight;
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

        boxes.forEach(b => {
            const [x1, y1, x2, y2] = b.box;
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 4;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`DRONE ${(b.confidence * 100).toFixed(0)}%`, x1, y1 > 30 ? y1 - 10 : 30);
        });
    };

    useEffect(() => {
        if (isStreaming) {
            timerRef.current = setInterval(() => {
                if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                    const canvas = canvasRef.current!;
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(videoRef.current, 0, 0);
                        const base64 = canvas.toDataURL('image/jpeg', 0.5);
                        wsRef.current.send(base64);
                    }
                }
            }, 300);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isStreaming]);

    useEffect(() => { return () => stopCamera(); }, []);

    return (
        <div className="main-content">
            <div className="section-header">
                <h2>Live Security Feed</h2>
                <p>Real-time drone detection from your primary camera.</p>
            </div>

            <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {error && <div className="alert-banner">{error}</div>}

                <div className="video-container" style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', height: '500px' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />
                    <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 10 }} />
                    <canvas ref={canvasRef} className="hidden" style={{ display: 'none' }} />
                    
                    {!isStreaming && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                            <CameraOff size={64} />
                            <p>Camera Offline</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {!isStreaming ? (
                        <button onClick={startCamera} className="btn-primary" style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold' }}>
                            <Video size={20} /> START FEED
                        </button>
                    ) : (
                        <button onClick={stopCamera} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold' }}>
                            <CameraOff size={20} /> STOP
                        </button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {status.drone_detected ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #ef4444' }}>
                                <AlertTriangle /> DRONE DETECTED ({(status.confidence * 100).toFixed(0)}%)
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #10b981' }}>
                                <ShieldCheck /> SECURE
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
