import React, { useRef, useState, useEffect } from 'react';
import { getWebSocketUrl } from '../api';
import { Video, AlertTriangle, ShieldCheck, CameraOff } from 'lucide-react';

export default function LiveDetect() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [latestResult, setLatestResult] = useState<any>(null);
    const [errorMSG, setErrorMSG] = useState('');

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setIsStreaming(true);
            setErrorMSG('');

            connectWebSocket();
        } catch (err) {
            console.error("Camera access denied", err);
            setErrorMSG('Camera access was denied or no camera found.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsStreaming(false);
        setLatestResult(null);
        clearOverlay();
    };

    const clearOverlay = () => {
        if (overlayRef.current) {
            const ctx = overlayRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
    };

    const connectWebSocket = () => {
        const wsUrl = getWebSocketUrl();
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log('Backend connected for live inference');
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLatestResult(data);
            drawBoundingBoxes(data);
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket connection closed');
            clearOverlay();
        };
    };

    const drawBoundingBoxes = (data: any) => {
        if (!overlayRef.current || !videoRef.current) return;
        const canvas = overlayRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const video = videoRef.current;
        if (!video.videoWidth) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (data.boxes && data.boxes.length > 0) {
            data.boxes.forEach((b: any) => {
                const [x1, y1, x2, y2] = b.box;
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
                ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 18px Arial';
                ctx.fillText(`Drone ${(b.confidence * 100).toFixed(0)}%`, x1, y1 > 20 ? y1 - 8 : 20);
            });
        }
    };

    useEffect(() => {
        let intervalId: any;

        if (isStreaming) {
            intervalId = setInterval(() => {
                if (videoRef.current && canvasRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;

                    if (video.videoWidth === 0) return;

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        canvas.toBlob((blob) => {
                            if (blob) {
                                wsRef.current?.send(blob);
                            }
                        }, 'image/jpeg', 0.6);
                    }
                }
            }, 500);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isStreaming]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Live Camera Feed</h1>
                    <p className="text-muted mt-2">Real-time drone detection using your PC's webcam.</p>
                </div>

                {latestResult && (
                    <div className="p-3 rounded-lg flex items-center gap-3 bg-[rgba(15,23,42,0.8)] border border-[var(--border-color)]">
                        {latestResult.drone_detected ? (
                            <AlertTriangle className="text-danger" size={24} />
                        ) : (
                            <ShieldCheck className="text-[var(--accent)]" size={24} />
                        )}
                        <div>
                            <p className="text-xs uppercase text-muted font-bold tracking-wider mb-1">Status</p>
                            <p className={`font-mono text-sm ${latestResult.drone_detected ? 'text-danger' : 'text-[var(--accent)]'}`}>
                                {latestResult.drone_detected ? 'DRONE DETECTED' : 'CLEAR'}
                                {latestResult.drone_detected && ` (${(latestResult.confidence * 100).toFixed(0)}%)`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="card">
                {errorMSG && (
                    <div className="bg-red-900/40 text-red-200 p-4 rounded-lg mb-4 text-sm text-center">
                        {errorMSG}
                    </div>
                )}

                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-[var(--border-color)] mb-6 flex items-center justify-center">
                    {!isStreaming && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted z-10">
                            <CameraOff size={48} className="mb-4 opacity-50" />
                            <p>Camera is offline</p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-contain z-20"
                        muted
                        playsInline
                        style={{ display: isStreaming ? 'block' : 'none' }}
                    />

                    {/* This overlay matches the video perfectly because we dynamically set its width/height to match the video's internal resolution, and CSS object-contain scales them identically side-by-side */}
                    <canvas ref={overlayRef} className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none" />

                    {/* Hidden canvas used to extract screenshots from the video for YOLO processing */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex justify-center gap-4">
                    {!isStreaming ? (
                        <button onClick={startCamera} className="btn btn-primary px-8">
                            <Video size={18} />
                            Start Live Feed
                        </button>
                    ) : (
                        <button onClick={stopCamera} className="btn bg-danger hover:bg-red-600 text-white px-8">
                            <CameraOff size={18} />
                            Stop Camera
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
