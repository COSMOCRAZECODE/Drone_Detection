import { useEffect, useState } from 'react';
import { getHistory, deleteHistory, deleteSession, deleteRecord } from '../api';
import { AlertCircle, Clock, Video, Trash2, FolderOpen, Layers, Image as ImageIcon, ChevronLeft, Calendar } from 'lucide-react';

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
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

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

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete all alerts from session ${sid}?`)) {
      await deleteSession(sid);
      if (selectedSession === sid) setSelectedSession(null);
      fetchHistory();
    }
  };

  const handleDeleteRecord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this specific detection record?")) {
      await deleteRecord(id);
      fetchHistory();
    }
  };

  const uploadHistory = history.filter(h => h.type === 'image');
  const liveHistory = history.filter(h => h.type === 'live_video');

  const sessionsMap: { [key: string]: HistoryItem[] } = {};
  liveHistory.forEach(item => {
    const sid = item.session_id || 'Legacy Streams';
    if (!sessionsMap[sid]) sessionsMap[sid] = [];
    sessionsMap[sid].push(item);
  });

  if (loading) {
    return (
      <div className="main-content flex justify-center items-center py-20">
        <Clock className="spinner text-primary" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold">Detection History</h1>
          <p className="text-muted mt-2">Persistence and logs of all drone activities.</p>
        </div>
        <button onClick={handleDeleteAll} className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <Trash2 size={16} /> WIPE ALL
        </button>
      </div>

      <div className="flex gap-6 mb-8 border-bottom" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          onClick={() => { setActiveTab('uploads'); setSelectedSession(null); }}
          className="flex items-center gap-2 pb-4 font-bold transition-all px-2"
          style={{ 
            color: activeTab === 'uploads' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'uploads' ? '2px solid var(--primary-color)' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Layers size={18} /> UPLOADS ({uploadHistory.length})
        </button>
        <button
          onClick={() => { setActiveTab('live'); setSelectedSession(null); }}
          className="flex items-center gap-2 pb-4 font-bold transition-all px-2"
          style={{ 
            color: activeTab === 'live' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'live' ? '2px solid var(--primary-color)' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Video size={18} /> LIVE SESSIONS ({Object.keys(sessionsMap).length})
        </button>
      </div>

      {activeTab === 'uploads' && (
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {uploadHistory.length === 0 ? (
            <div className="col-span-full py-24 text-center text-muted card">
               <ImageIcon size={64} className="mx-auto mb-4 opacity-10" />
               <p>No uploaded detections found.</p>
            </div>
          ) : uploadHistory.map(item => (
            <div key={item._id} className="card group" style={{ position: 'relative' }}>
              <button 
                onClick={(e) => handleDeleteRecord(e, item._id)}
                className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Delete this record"
              >
                <Trash2 size={14} />
              </button>
              
              <div className="flex justify-between items-center mb-4 pr-8">
                <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`}>
                  {item.drone_detected ? 'DRONE FOUND' : 'CLEAR'}
                </span>
                <span className="text-xs text-muted font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="history-img-container" style={{ background: '#000', height: '180px' }}>
                {item.image_data ? (
                  <img src={`data:image/jpeg;base64,${item.image_data}`} className="history-img" style={{ maxHeight: '100%' }} />
                ) : (
                  <ImageIcon size={32} className="text-muted" />
                )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock size={12} />
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-muted">CONF:</span>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{(item.confidence_score * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'live' && (
        <div className="flex flex-col gap-6">
          {!selectedSession ? (
            /* SESSION FOLDERS VIEW */
            <>
              {Object.keys(sessionsMap).length === 0 ? (
                <div className="py-24 text-center text-muted card">
                   <Video size={64} className="mx-auto mb-4 opacity-10" />
                   <p>No live sessions recorded.</p>
                </div>
              ) : (
                <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {Object.keys(sessionsMap).sort().reverse().map(sid => (
                    <div 
                      key={sid} 
                      onClick={() => setSelectedSession(sid)}
                      className="card group cursor-pointer hover:border-primary-color/50 transition-all border-dashed"
                      style={{ padding: '1.5rem', borderStyle: 'solid' }}
                    >
                      <div className="flex justify-between items-start">
                        <div style={{ color: 'var(--primary-color)', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '1rem' }}>
                          <FolderOpen size={32} />
                        </div>
                        <button 
                          onClick={(e) => handleDeleteSession(e, sid)}
                          className="p-2 hover:bg-red-500/20 text-muted hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-bold group-hover:text-primary-color transition-colors">{sid}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                           <div className="flex items-center gap-1 text-[11px] text-muted uppercase font-bold tracking-tight">
                              <Layers size={10} /> {sessionsMap[sid].length} Events
                           </div>
                           <div className="flex items-center gap-1 text-[11px] text-muted uppercase font-bold tracking-tight">
                              <Calendar size={10} /> {new Date(sessionsMap[sid][0].timestamp).toLocaleDateString()}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* INDIVIDUAL SESSION VIEW (Inside Folder) */
            <div className="fade-in">
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-muted hover:text-white"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <FolderOpen size={20} style={{ color: 'var(--primary-color)' }} />
                    {selectedSession}
                  </h2>
                  <p className="text-muted text-xs uppercase font-bold tracking-widest mt-1">
                    Viewing {sessionsMap[selectedSession!].length} detection events
                  </p>
                </div>
                <button 
                    onClick={(e) => handleDeleteSession(e, selectedSession!)}
                    className="ml-auto btn btn-secondary text-xs" 
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                    DELETE SESSION
                </button>
              </div>

              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {sessionsMap[selectedSession!].map(alert => (
                  <div key={alert._id} className="card group p-2 hover:border-primary-color/30 transition-all border-none" style={{ background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
                    <button 
                      onClick={(e) => handleDeleteRecord(e, alert._id)}
                      className="absolute top-1 right-1 p-1 bg-red-500/20 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 size={10} />
                    </button>
                    <div className="history-img-container" style={{ height: '100px', marginBottom: '0.5rem', border: 'none' }}>
                      {alert.image_data ? (
                        <img src={`data:image/jpeg;base64,${alert.image_data}`} className="history-img" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-40">
                             <AlertCircle size={20} className="text-danger" />
                             <span className="text-[8px] font-bold text-white">METADATA</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-primary-color">{(alert.confidence_score * 100).toFixed(0)}%</span>
                        <span className="text-[9px] text-muted font-mono">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
