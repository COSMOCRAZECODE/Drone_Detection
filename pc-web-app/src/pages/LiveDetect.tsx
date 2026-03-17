import { useRef, useState, useEffect } from 'react';
import { getWebSocketUrl } from '../api';
import { Video, AlertTriangle, ShieldCheck, CameraOff } from 'lucide-react';

export default function LiveDetect() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<any>(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [status, setStatus] = useState<any>({ drone_detected: false, confidence: 0 });
    const [boxes, setBoxes] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [videoSize, setVideoSize] = useState({ width: 0, height: 0, left: 0, top: 0 });

    // Function to calculate the exact display coordinates of the video content
    const updateOverlayBounds = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const container = video.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const videoRatio = video.videoWidth / video.videoHeight;
        const containerRatio = containerRect.width / containerRect.height;

        let w, h, l, t;
        if (videoRatio > containerRatio) {
            w = containerRect.width;
            h = containerRect.width / videoRatio;
            l = 0;
            t = (containerRect.height - h) / 2;
        } else {
            h = containerRect.height;
            w = containerRect.height * videoRatio;
            l = (containerRect.width - w) / 2;
            t = 0;
        }
        setVideoSize({ width: w, height: h, left: l, top: t });
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    updateOverlayBounds();
                };
            }
            setIsStreaming(true);
            setError('');
            connectWebSocket();
        } catch (err) {
            setError('Camera access denied.');
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
        setBoxes([]);
    };

    const connectWebSocket = () => {
        const wsUrl = getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setStatus({ drone_detected: data.drone_detected, confidence: data.confidence });
            if (data.boxes) setBoxes(data.boxes);
            else setBoxes([]);
        };
        
        ws.onclose = () => {
            if (isStreaming) setError('Link lost. Re-initializing...');
        };
    };

    useEffect(() => {
        if (isStreaming) {
            timerRef.current = setInterval(() => {
                if (videoRef.current && videoRef.current.readyState >= 2 && wsRef.current?.readyState === WebSocket.OPEN) {
                    const canvas = canvasRef.current!;
                    const video = videoRef.current;
                    if (video.videoWidth > 0) {
                        canvas.width = Math.min(video.videoWidth, 640);
                        canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const base64 = canvas.toDataURL('image/jpeg', 0.5);
                            wsRef.current.send(base64);
                        }
                    }
                }
            }, 400);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isStreaming]);

    useEffect(() => {
        window.addEventListener('resize', updateOverlayBounds);
        return () => {
            window.removeEventListener('resize', updateOverlayBounds);
            stopCamera();
        };
    }, []);

    return (
        <div className="section-container" style={{ padding: '20px' }}>
            <div className="section-header" style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff' }}>LIVE SURVEILLANCE</h1>
                <p style={{ color: '#94a3b8' }}>Real-time AI drone identification and tracking.</p>
            </div>

            <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', background: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden', height: '550px' }}>
                    
                    <video 
                        ref={videoRef} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        muted 
                        playsInline 
                    />

                    {/* DYNAMIC PRECISION OVERLAY */}
                    <div style={{ 
                        position: 'absolute', 
                        width: videoSize.width, 
                        height: videoSize.height, 
                        left: videoSize.left, 
                        top: videoSize.top,
                        pointerEvents: 'none'
                    }}>
                        {boxes.map((b, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                left: `${b.x1 * 100}%`,
                                top: `${b.y1 * 100}%`,
                                width: `${(b.x2 - b.x1) * 100}%`,
                                height: `${(b.y2 - b.y1) * 100}%`,
                                border: '3px solid #00f2ff',
                                boxShadow: '0 0 10px #00f2ff, inset 0 0 10px #00f2ff',
                                zIndex: 20
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-25px', left: '-3px',
                                    background: '#00f2ff', color: '#000',
                                    fontSize: '12px', fontWeight: '900',
                                    padding: '2px 8px', whiteSpace: 'nowrap'
                                }}>
                                    DRONE {(b.confidence * 100).toFixed(0)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center', padding: '15px' }}>
                    {!isStreaming ? (
                        <button onClick={startCamera} className="btn-primary" style={{ padding: '12px 30px', fontWeight: 'bold' }}>
                            START MONITORING
                        </button>
                    ) : (
                        <button onClick={stopCamera} style={{ padding: '12px 30px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            STOP FEED
                        </button>
                    )}

                    <div style={{ marginLeft: 'auto' }}>
                        {status.drone_detected ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={18} /> THREAT DETECTED: {(status.confidence * 100).toFixed(0)}%
                            </div>
                        ) : (
                            <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={18} /> AIRSPACE SECURE
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
