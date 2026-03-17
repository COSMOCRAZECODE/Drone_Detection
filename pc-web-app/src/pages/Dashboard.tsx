import { useEffect, useState } from 'react';
import { getHistory, deleteHistory, deleteSession, deleteRecord } from '../api';
import { AlertCircle, Clock, Video, Trash2, FolderOpen, Layers, Image as ImageIcon, ChevronLeft, Calendar, Download } from 'lucide-react';

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
    if (window.confirm(`Delete all alerts from session "${sid}"?`)) {
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

  const handleDownload = (e: React.MouseEvent, base64: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = `DroneDet_${name}_${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadHistory = history.filter(h => h.type === 'image');
  const liveHistory = history.filter(h => h.type === 'live_video');

  const sessionsMap: { [key: string]: HistoryItem[] } = {};
  liveHistory.forEach(item => {
    const sid = item.session_id || 'Auto-Captured';
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
        <button onClick={handleDeleteAll} className="btn" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.6rem 1.2rem', fontSize: '0.875rem' }}>
          <Trash2 size={16} /> WIPE ALL RECORDS
        </button>
      </div>

      <div className="flex gap-8 mb-8" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => { setActiveTab('uploads'); setSelectedSession(null); }}
          className={`tab-btn ${activeTab === 'uploads' ? 'active' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} /> UPLOADS ({uploadHistory.length})
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('live'); setSelectedSession(null); }}
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
        >
          <div className="flex items-center gap-2">
            <Video size={18} /> LIVE ALERTS ({Object.keys(sessionsMap).length})
          </div>
        </button>
      </div>

      {activeTab === 'uploads' && (
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {uploadHistory.length === 0 ? (
            <div className="col-span-full py-24 text-center text-muted card">
               <ImageIcon size={64} className="mx-auto mb-4 opacity-10" />
               <p>No uploaded detections found.</p>
            </div>
          ) : uploadHistory.map(item => (
            <div key={item._id} className="card group" style={{ position: 'relative', padding: '1.25rem' }}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={(e) => item.image_data && handleDownload(e, item.image_data, 'Upload')}
                  className="btn-icon btn-icon-primary"
                  title="Download Image"
                >
                  <Download size={14} />
                </button>
                <button 
                  onClick={(e) => handleDeleteRecord(e, item._id)}
                  className="btn-icon btn-icon-danger"
                  title="Delete Record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-4 pr-16">
                <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`}>
                  {item.drone_detected ? 'DRONE FOUND' : 'CLEAR'}
                </span>
                <span className="text-xs text-muted font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="history-img-container" style={{ background: '#000', height: '180px', borderRadius: '0.75rem', overflow: 'hidden' }}>
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
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {Object.keys(sessionsMap).length === 0 ? (
                <div className="col-span-full py-24 text-center text-muted card">
                   <Video size={64} className="mx-auto mb-4 opacity-10" />
                   <p>No live sessions recorded.</p>
                </div>
              ) : Object.keys(sessionsMap).sort().reverse().map(sid => (
                <div 
                  key={sid} 
                  onClick={() => setSelectedSession(sid)}
                  className="card group cursor-pointer hover:border-primary-color/50 transition-all"
                  style={{ padding: '1.5rem', borderStyle: 'solid' }}
                >
                  <div className="flex justify-between items-start">
                    <div style={{ color: 'var(--primary-color)', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '1rem' }}>
                      <FolderOpen size={30} />
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, sid)}
                      className="btn-icon btn-icon-danger"
                      style={{ opacity: 0 }} /* Only show on group hover */
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <style>{`.group:hover .btn-icon { opacity: 1 !important; }`}</style>
                  <div className="mt-4">
                    <h3 className="text-lg font-bold group-hover:text-primary-color transition-colors truncate">{sid}</h3>
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
          ) : (
            <div className="fade-in">
              <div className="flex items-center gap-6 mb-10">
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="btn-icon btn-icon-primary"
                  style={{ width: '42px', height: '42px', borderRadius: '50%' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <FolderOpen size={24} style={{ color: 'var(--primary-color)' }} />
                    {selectedSession}
                  </h2>
                  <p className="text-muted text-xs uppercase font-bold tracking-widest mt-1">
                    Logged {sessionsMap[selectedSession!].length} high-confidence detections
                  </p>
                </div>
                <button 
                    onClick={(e) => handleDeleteSession(e, selectedSession!)}
                    className="ml-auto btn" 
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: '0.8rem' }}
                >
                    DELETE SESSION
                </button>
              </div>

              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {sessionsMap[selectedSession!].map(alert => (
                  <div key={alert._id} className="card group p-3 hover:border-primary-color/30 transition-all" style={{ background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90">
                      <button 
                        onClick={(e) => alert.image_data && handleDownload(e, alert.image_data, 'Live')}
                        className="btn-icon btn-icon-primary"
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteRecord(e, alert._id)}
                        className="btn-icon btn-icon-danger"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="history-img-container" style={{ height: '120px', marginBottom: '0.75rem', border: 'none', background: '#000', borderRadius: '0.5rem' }}>
                      {alert.image_data ? (
                        <img src={`data:image/jpeg;base64,${alert.image_data}`} className="history-img" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-20">
                             <AlertCircle size={24} className="text-danger" />
                             <span className="text-[10px] font-black text-white">METADATA ONLY</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black text-primary-color">{(alert.confidence_score * 100).toFixed(0)}% CONF</span>
                        <span className="text-[10px] text-muted font-mono">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
