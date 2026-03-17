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
        clearOverlay();
    };

    const connectWebSocket = () => {
        const wsUrl = getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setStatus({ drone_detected: data.drone_detected, confidence: data.confidence });
            
            if (data.boxes) {
                drawOverlay(data.boxes);
            } else {
                clearOverlay();
            }
        };
        
        ws.onclose = () => {
            if (isStreaming) setError('Link lost. Attempting to reconnect...');
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

            // Handle normalized object format: {x1, y1, x2, y2, confidence}
            if (b.x1 !== undefined && b.y1 !== undefined) {
                x1 = b.x1 * canvas.width;
                y1 = b.y1 * canvas.height;
                x2 = b.x2 * canvas.width;
                y2 = b.y2 * canvas.height;
                conf = b.confidence;
            } 
            // Handle array format [x1, y1, x2, y2]
            else {
                const boxData = b.box || b;
                if (Array.isArray(boxData) && boxData.length === 4) {
                    [x1, y1, x2, y2] = boxData;
                    conf = b.confidence || status.confidence;
                }
            }

            if (x1 !== undefined && y1 !== undefined) {
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 6;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                
                ctx.strokeStyle = 'rgba(0, 242, 255, 0.3)';
                ctx.lineWidth = 12;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = '#00f2ff';
                ctx.font = 'bold 24px Arial';
                const label = `DRONE ${(conf * 100).toFixed(0)}%`;
                ctx.fillText(label, x1, y1 > 40 ? y1 - 15 : 40);
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
        <div className="section-container" style={{ padding: '40px 20px' }}>
            <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>Live Detection Hub</h1>
                <p style={{ color: '#94a3b8' }}>Advanced AI drone surveillance (Desktop Optimized)</p>
            </div>

            <div className="card" style={{ maxWidth: '1100px', margin: '0 auto', background: '#1e293b', padding: '20px', borderRadius: '16px' }}>
                {error && <div style={{ background: '#ef4444', color: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <div className="viewer-frame" style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', height: '600px', border: '2px solid #334155' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />
                    <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 10, pointerEvents: 'none' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {!isStreaming && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <CameraOff size={80} style={{ opacity: 0.2 }} />
                            <p style={{ marginTop: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>System Offline</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '30px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
                    {!isStreaming ? (
                        <button onClick={startCamera} className="btn-primary" style={{ padding: '15px 40px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', background: '#6366f1', color: '#fff', border: 'none' }}>
                            <Video size={20} style={{ marginRight: '10px' }} /> INITIALIZE FEED
                        </button>
                    ) : (
                        <button onClick={stopCamera} style={{ padding: '15px 40px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', background: '#ef4444', color: '#fff', border: 'none' }}>
                            <CameraOff size={20} style={{ marginRight: '10px' }} /> TERMINATE
                        </button>
                    )}

                    <div style={{ minWidth: '300px' }}>
                        {status.drone_detected ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '15px 30px', borderRadius: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '15px', border: '2px solid #ef4444' }}>
                                <AlertTriangle /> ALERT: DRONE ({(status.confidence * 100).toFixed(0)}%)
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '15px 30px', borderRadius: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '15px', border: '2px solid #10b981' }}>
                                <ShieldCheck /> AIRSPACE SECURE
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
