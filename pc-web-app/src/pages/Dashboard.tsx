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
    if (window.confirm("CRITICAL: Wipe entire detection history? This cannot be undone.")) {
      await deleteHistory();
      fetchHistory();
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete entire session "${sid}"?`)) {
      await deleteSession(sid);
      if (selectedSession === sid) setSelectedSession(null);
      fetchHistory();
    }
  };

  const handleDeleteRecord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this specific record?")) {
      await deleteRecord(id);
      fetchHistory();
    }
  };

  const formatDisplayTime = (isoString: string) => {
    // Ensure the timestamp is treated as UTC if it lacks a timezone offset
    let dateStr = isoString;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr += 'Z';
    }
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleDownload = (e: React.MouseEvent, base64: string, name: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = `DroneDet_${name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
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
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-3xl font-bold">Security Logs</h1>
          <p className="text-muted mt-2 text-sm italic">Historical record for all drone detection events.</p>
        </div>
        <button 
          onClick={handleDeleteAll} 
          className="btn" 
          style={{ 
            color: 'var(--danger)', 
            borderColor: 'rgba(239, 68, 68, 0.2)', 
            background: 'rgba(239, 68, 68, 0.05)',
            padding: '0.8rem 1.5rem',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            letterSpacing: '0.05em'
          }}
        >
          <Trash2 size={16} /> WIPE DATABASE
        </button>
      </div>

      <div className="history-tabs">
        <button 
          onClick={() => { setActiveTab('uploads'); setSelectedSession(null); }}
          className={`tab-btn ${activeTab === 'uploads' ? 'active' : ''}`}
          style={{ paddingBottom: '1.25rem' }}
        >
          <Layers size={20} /> UPLOADS ({uploadHistory.length})
        </button>
        <button 
          onClick={() => { setActiveTab('live'); setSelectedSession(null); }}
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          style={{ paddingBottom: '1.25rem' }}
        >
          <Video size={20} /> LIVE SURVEILLANCE ({Object.keys(sessionsMap).length})
        </button>
      </div>

      {/* Safety check to prevent blank screen if session was deleted */}
      {selectedSession && !sessionsMap[selectedSession] && setActiveTab('live') && setSelectedSession(null)}

      {activeTab === 'uploads' && (
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2.5rem' }}>
          {uploadHistory.length === 0 ? (
            <div className="col-span-full py-32 text-center text-muted card border-dashed">
               <ImageIcon size={64} className="mx-auto mb-4 opacity-5" />
               <p className="font-bold tracking-widest text-xs">NO UPLOADS RECORDED</p>
            </div>
          ) : uploadHistory.map(item => (
            <div key={item._id} className="card group" style={{ position: 'relative', padding: '1.5rem' }}>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all scale-95 origin-top-right">
                <div className="btn-icon-group">
                  <button 
                    onClick={(e) => item.image_data && handleDownload(e, item.image_data, 'Upload')}
                    className="btn-icon btn-icon-primary"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteRecord(e, item._id)}
                    className="btn-icon btn-icon-danger"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-3 pr-16 px-1">
                <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {item.drone_detected ? 'DRONE IDENTIFIED' : 'CLEAR'}
                </span>
                <span className="text-[10px] text-muted font-bold opacity-40">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="history-img-container" style={{ background: '#000', height: '180px', borderRadius: '0.6rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '0' }}>
                {item.image_data ? (
                  <img src={`data:image/jpeg;base64,${item.image_data}`} className="history-img" style={{ maxHeight: '100%', width: 'auto', opacity: 0.9 }} />
                ) : (
                  <ImageIcon size={32} className="text-muted opacity-20" />
                )}
              </div>
              <div className="mt-3 flex justify-between items-center px-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted font-bold">
                  <Clock size={11} className="text-primary-color opacity-70" />
                  {formatDisplayTime(item.timestamp)}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-muted uppercase opacity-50">Score:</span>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{(item.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'live' && (
        <div className="flex flex-col gap-6">
          {!selectedSession ? (
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {Object.keys(sessionsMap).length === 0 ? (
                <div className="col-span-full py-32 text-center text-muted card border-dashed">
                   <Video size={64} className="mx-auto mb-4 opacity-5" />
                   <p className="font-bold tracking-widest text-xs">NO SESSIONS LOGGED</p>
                </div>
              ) : Object.keys(sessionsMap).sort().reverse().map(sid => (
                <div 
                  key={sid} 
                  onClick={() => setSelectedSession(sid)}
                  className="card group cursor-pointer hover:border-primary-color/50 transition-all"
                  style={{ padding: '1.5rem', borderRadius: '1.25rem' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div style={{ color: 'var(--primary-color)', padding: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '1rem' }}>
                      <FolderOpen size={24} />
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, sid)}
                      className="btn-icon btn-icon-danger opacity-0 group-hover:opacity-100 scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold group-hover:text-primary-color transition-colors truncate mb-1">{sid}</h3>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1 text-[10px] text-muted font-bold tracking-tight">
                          <Layers size={12} className="opacity-50" /> {sessionsMap[sid].length} Events
                       </div>
                       <div className="flex items-center gap-1 text-[10px] text-muted font-bold tracking-tight">
                          <Calendar size={12} className="opacity-50" /> {new Date(sessionsMap[sid][0].timestamp).toLocaleDateString()}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fade-in">
              <div className="flex items-center gap-8 mb-12">
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="btn-icon btn-icon-primary"
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-4">
                    <span>{selectedSession}</span>
                  </h2>
                  <p className="text-muted text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">
                    {sessionsMap[selectedSession!].length} EVENTS DETECTED
                  </p>
                </div>
                <button 
                    onClick={(e) => handleDeleteSession(e, selectedSession!)}
                    className="ml-auto btn" 
                    style={{ 
                        color: 'var(--danger)', 
                        borderColor: 'rgba(239, 68, 68, 0.3)', 
                        background: 'rgba(239, 68, 68, 0.05)',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '0.5rem 1rem'
                    }}
                >
                    DELETE ALL
                </button>
              </div>

                <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {sessionsMap[selectedSession!].map(alert => (
                  <div key={alert._id} className="card group p-2 hover:border-primary-color/40 transition-all" style={{ background: 'rgba(15, 23, 42, 0.4)', position: 'relative', borderRadius: '0.75rem' }}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90">
                      <div className="btn-icon-group">
                        <button 
                          onClick={(e) => alert.image_data && handleDownload(e, alert.image_data, 'Live')}
                          className="btn-icon btn-icon-primary"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteRecord(e, alert._id)}
                          className="btn-icon btn-icon-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="history-img-container" style={{ height: '150px', marginBottom: '0.5rem', border: 'none', background: '#000', borderRadius: '0.6rem' }}>
                      {alert.image_data ? (
                        <img src={`data:image/jpeg;base64,${alert.image_data}`} className="history-img" style={{ opacity: 0.9 }} />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-20 text-center">
                             <AlertCircle size={24} className="text-danger" />
                             <span className="text-[8px] font-black">METADATA ONLY</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center px-2 pb-1">
                        <span className="text-[11px] font-bold text-primary-color">{(alert.confidence_score * 100).toFixed(0)}% CONF</span>
                        <span className="text-[10px] text-muted font-bold">{formatDisplayTime(alert.timestamp)}</span>
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
