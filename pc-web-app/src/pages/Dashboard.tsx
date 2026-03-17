import { useEffect, useState } from 'react';
import { getHistory, deleteHistory, API_BASE_URL } from '../api';
import { AlertTriangle, CheckCircle2, Clock, Image as ImageIcon, Video, Trash2, Folder, ExternalLink } from 'lucide-react';

interface HistoryItem {
    _id: string;
    timestamp: string;
    type: string;
    drone_detected: boolean;
    confidence_score: number;
    filename?: string;
    session_id?: string;
}

export default function Dashboard() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sessions' | 'uploads'>('sessions');

    const fetchHistory = async () => {
        try {
            const data = await getHistory();
            setHistory(data || []);
        } catch (err) {
            console.error("Failed to load history", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleDelete = async (id: string) => {
        // Since the backend only has delete_history for ALL, I'll need to keep that for now 
        // OR if I had an endpoint for single delete. 
        // For now, I'll warn the user it clears ALL if they use the main button.
    };

    const clearAll = async () => {
        if (window.confirm("CRITICAL: This will wipe all recorded data. Continue?")) {
            await deleteHistory();
            setHistory([]);
        }
    };

    // Grouping live detections by session_id
    const sessionsMap: Record<string, HistoryItem[]> = {};
    const uploads: HistoryItem[] = [];

    history.forEach(item => {
        if (item.type === 'image') {
            uploads.push(item);
        } else if (item.session_id) {
            if (!sessionsMap[item.session_id]) sessionsMap[item.session_id] = [];
            sessionsMap[item.session_id].push(item);
        }
    });

    const sortedSessions = Object.keys(sessionsMap).sort((a, b) => b.localeCompare(a));

    if (loading) return <div className="text-center p-20 text-muted">Synchronizing secure logs...</div>;

    return (
        <div className="fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Forensic Logs</h1>
                    <p className="text-muted text-sm">Review evidence and surveillance sessions.</p>
                </div>
                <button onClick={clearAll} className="btn-secondary text-xs flex items-center gap-2" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    <Trash2 size={14} /> PURGE DATABASE
                </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-2">
                <button 
                    onClick={() => setActiveTab('sessions')}
                    className={`pb-2 px-4 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'sessions' ? 'text-primary-color border-b-2 border-primary-color' : 'text-muted'}`}
                >
                    Live Sessions
                </button>
                <button 
                    onClick={() => setActiveTab('uploads')}
                    className={`pb-2 px-4 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'uploads' ? 'text-primary-color border-b-2 border-primary-color' : 'text-muted'}`}
                >
                    Manual Scans
                </button>
            </div>

            {activeTab === 'sessions' ? (
                <div className="flex flex-col gap-4">
                    {sortedSessions.length === 0 ? (
                        <div className="card text-center p-12 text-muted">No surveillance sessions recorded.</div>
                    ) : (
                        sortedSessions.map(sid => {
                            const sessionAlerts = sessionsMap[sid];
                            const startTime = new Date(sessionAlerts[sessionAlerts.length-1].timestamp).toLocaleString();
                            const droneAlerts = sessionAlerts.filter(a => a.drone_detected);
                            const topConf = Math.max(...sessionAlerts.map(a => a.confidence_score));
                            const hasImages = sessionAlerts.some(a => a.filename);

                            return (
                                <div key={sid} className="card p-0 overflow-hidden border-white/5 hover:border-white/10 transition-all">
                                    <div className="p-4 bg-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Folder className="text-primary-color" size={20} />
                                            <div>
                                                <h3 className="font-bold text-sm uppercase">Session: {sid.split('_')[1]}</h3>
                                                <p className="text-[10px] text-muted">{startTime}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="badge bg-emerald-500/10 text-emerald-500">{sessionAlerts.length} Frames</div>
                                            {droneAlerts.length > 0 && <div className="badge bg-red-500/10 text-red-500">{droneAlerts.length} Alerts</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Show top 4 captures from this session */}
                                        {sessionAlerts.filter(a => a.filename).slice(0, 4).map(alert => (
                                            <div key={alert._id} className="relative aspect-video rounded bg-black/40 overflow-hidden group">
                                                <img 
                                                    src={`${API_BASE_URL}/uploads/${alert.filename}`} 
                                                    className="w-full h-full object-cover" 
                                                    alt="Alert"
                                                />
                                                <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay"></div>
                                                <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] px-1 rounded text-white font-mono">
                                                    {(alert.confidence_score * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        ))}
                                        {sessionAlerts.filter(a => a.filename).length === 0 && (
                                            <div className="col-span-4 text-center py-4 text-[10px] text-muted uppercase tracking-widest">
                                                No high-confidence captures – Airspace predominantly clear.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {uploads.length === 0 ? (
                        <div className="col-span-3 card text-center p-12 text-muted">No manual scans found.</div>
                    ) : (
                        uploads.map(item => (
                            <div key={item._id} className="card p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-[10px] text-muted font-mono uppercase">
                                        <Clock size={12} /> {new Date(item.timestamp).toLocaleString()}
                                    </div>
                                    <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`}>
                                        {item.drone_detected ? 'POSITIVE' : 'NEGATIVE'}
                                    </span>
                                </div>
                                
                                <div className="aspect-square rounded-xl bg-black/40 mb-4 overflow-hidden border border-white/5">
                                    <img 
                                        src={`${API_BASE_URL}/uploads/${item.filename}`}
                                        className="w-full h-full object-contain"
                                        alt="Scan result"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs font-bold text-muted uppercase">
                                    <span>Confidence</span>
                                    <span className="text-white">{(item.confidence_score * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
