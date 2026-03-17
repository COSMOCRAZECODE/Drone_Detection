import { useEffect, useState } from 'react';
import { getHistory } from '../api';
import { AlertCircle, CheckCircle2, Clock, Image as ImageIcon } from 'lucide-react';

interface HistoryItem {
    _id: string;
    timestamp: string;
    type: string;
    drone_detected: boolean;
    confidence_score: number;
    filename?: string;
}

import { API_BASE_URL } from '../api';
const API_STATIC_URL = `${API_BASE_URL}/uploads`;

export default function Dashboard() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const data = await getHistory();
                setHistory(data);
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="spinner">
                    <Clock size={32} className="text-muted" />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Detection History</h1>
                    <p className="text-muted mt-2">View your past drone detection logs.</p>
                </div>
                <button
                    onClick={async () => {
                        if (window.confirm("Are you sure you want to clear your history?")) {
                            await import('../api').then(m => m.deleteHistory());
                            setHistory([]);
                        }
                    }}
                    className="btn bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
                >
                    Clear History
                </button>
            </div>

            {history.length === 0 ? (
                <div className="card text-center p-8">
                    <p className="text-muted">No detections recorded yet. Try uploading an image!</p>
                </div>
            ) : (
                <div className="grid-2">
                    {history.map((item) => (
                        <div key={item._id} className="card flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 text-muted text-sm">
                                    <Clock size={16} />
                                    {new Date(item.timestamp).toLocaleString()}
                                </div>
                                <div className="badge border border-[var(--border-color)]">
                                    {item.type.toUpperCase().replace('_', ' ')}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <h3 className="text-lg">Result</h3>
                                {item.drone_detected ? (
                                    <span className="badge badge-danger flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        Drone Detected
                                    </span>
                                ) : (
                                    <span className="badge badge-success flex items-center gap-1">
                                        <CheckCircle2 size={14} />
                                        Safe / Clear
                                    </span>
                                )}
                            </div>

                            {item.drone_detected && (
                                <div className="mt-2 text-sm text-muted">
                                    Max Confidence: <strong className="text-light">{(item.confidence_score * 100).toFixed(1)}%</strong>
                                </div>
                            )}

                            {/* Show the image if it's an uploaded image */}
                            {item.type === 'image' && item.filename ? (
                                <div className="history-img-container">
                                    <img
                                        src={`${API_STATIC_URL}/${item.filename}?t=${Date.now()}`}
                                        className="history-img"
                                        alt="history result"
                                    />
                                </div>
                            ) : item.type === 'image' && !item.filename ? (
                                <div className="history-img-container flex-col border-dashed text-muted text-center">
                                    <ImageIcon className="mb-2 opacity-50" size={32} />
                                    <p className="text-xs">Image not saved</p>
                                </div>
                            ) : null}

                            {item.type === 'live_video' && item.drone_detected && (
                                <div className="mt-4 p-3 bg-red-900/20 rounded border border-red-500/20 text-xs text-red-200">
                                    <p className="font-semibold mb-1">Live Detection Logged at {(item.confidence_score * 100).toFixed(1)}%</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
