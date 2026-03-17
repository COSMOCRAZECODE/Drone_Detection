import { useEffect, useState } from 'react';
import { getHistory, deleteHistory, deleteSession } from '../api';
import { AlertCircle, Clock, Video, Trash2, FolderOpen, Layers } from 'lucide-react';

interface HistoryItem {
    _id: string;
    timestamp: string;
    type: string;
    drone_detected: boolean;
    confidence_score: number;
    filename?: string;
    image_data?: string;
    session_id?: string;
}

export default function Dashboard() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'uploads' | 'live'>('uploads');

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

    const handleDeleteAll = async () => {
        if (window.confirm("Are you sure you want to clear your entire history?")) {
            await deleteHistory();
            fetchHistory();
        }
    };

    const handleDeleteSession = async (sid: string) => {
        if (window.confirm(`Delete all alerts from session ${sid}?`)) {
            await deleteSession(sid);
            fetchHistory();
        }
    };

    const uploadHistory = history.filter(h => h.type === 'image');
    
    // Group live video by session
    const liveHistory = history.filter(h => h.type === 'live_video');
    const sessionsMap: { [key: string]: HistoryItem[] } = {};
    liveHistory.forEach(item => {
        const sid = item.session_id || 'Legacy Streams';
        if (!sessionsMap[sid]) sessionsMap[sid] = [];
        sessionsMap[sid].push(item);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="spinner"><Clock size={40} className="text-primary-color" /></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Security Logs</h1>
                    <p className="text-muted">Persistence of all detected drone activities.</p>
                </div>
                <button onClick={handleDeleteAll} className="btn-secondary" style={{ color: '#ef4444' }}>
                    <Trash2 size={16} /> WIPE ALL RECORDS
                </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
                <button 
                    onClick={() => setActiveTab('uploads')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all ${activeTab === 'uploads' ? 'bg-white/5 text-white border-b-2 border-primary-color' : 'text-muted hover:text-white'}`}
                >
                    <Layers size={18} /> IMAGE UPLOADS ({uploadHistory.length})
                </button>
                <button 
                    onClick={() => setActiveTab('live')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all ${activeTab === 'live' ? 'bg-white/5 text-white border-b-2 border-primary-color' : 'text-muted hover:text-white'}`}
                >
                    <Video size={18} /> LIVE ALERT SESSIONS ({Object.keys(sessionsMap).length})
                </button>
            </div>

            {/* TAB CONTENT: UPLOADS */}
            {activeTab === 'uploads' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uploadHistory.length === 0 ? (
                        <p className="text-muted col-span-3 text-center py-20 italic">No image uploads recorded.</p>
                    ) : uploadHistory.map(item => (
                        <div key={item._id} className="card p-4">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`}>
                                    {item.drone_detected ? 'DRONE FOUND' : 'CLEAR'}
                                </span>
                                <div className="text-[10px] text-muted font-mono">{new Date(item.timestamp).toLocaleString()}</div>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/5 mb-4">
                                {item.image_data ? (
                                    <img src={`data:image/jpeg;base64,${item.image_data}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">No Persistent Image</div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase">
                                <span className="text-muted">Confidence</span>
                                <span className="text-primary-color">{(item.confidence_score * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB CONTENT: LIVE SESSIONS */}
            {activeTab === 'live' && (
                <div className="flex flex-col gap-8">
                    {Object.keys(sessionsMap).length === 0 ? (
                        <p className="text-muted text-center py-20 italic">No live detections recorded.</p>
                    ) : Object.keys(sessionsMap).sort().reverse().map(sid => (
                        <div key={sid} className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary-color/20 rounded-xl text-primary-color"><FolderOpen size={24} /></div>
                                    <div>
                                        <h3 className="font-black text-xl text-white uppercase tracking-tighter">{sid}</h3>
                                        <p className="text-[10px] text-muted font-mono uppercase">
                                            {sessionsMap[sid].length} Alerts Logged • Last Activity: {new Date(sessionsMap[sid][0].timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteSession(sid)} className="p-3 hover:bg-red-500/20 text-muted hover:text-red-500 rounded-xl transition-all">
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {sessionsMap[sid].map(alert => (
                                    <div key={alert._id} className="group relative aspect-square bg-black rounded-xl overflow-hidden border border-white/10 hover:border-primary-color/50 transition-all cursor-crosshair">
                                        {alert.image_data ? (
                                            <img src={`data:image/jpeg;base64,${alert.image_data}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                                <AlertCircle size={24} className="text-danger mb-1" />
                                                <span className="text-[8px] font-bold text-muted uppercase">Metadata Only</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black text-[10px] font-bold">
                                            {(alert.confidence_score * 100).toFixed(0)}% • {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
