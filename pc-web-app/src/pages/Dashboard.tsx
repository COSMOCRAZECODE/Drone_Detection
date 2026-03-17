import { useEffect, useState } from 'react';
import { getHistory, deleteHistory, deleteSession } from '../api';
import { AlertCircle, Clock, Video, Trash2, FolderOpen, Layers, Image as ImageIcon } from 'lucide-react';

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
        <button onClick={handleDeleteAll} className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
          <Trash2 size={16} /> WIPE ALL
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-bottom" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('uploads')}
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
          onClick={() => setActiveTab('live')}
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

      {/* Uploads Grid */}
      {activeTab === 'uploads' && (
        <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {uploadHistory.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted card">
               <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
               <p>No uploaded detections found.</p>
            </div>
          ) : uploadHistory.map(item => (
            <div key={item._id} className="card">
              <div className="flex justify-between items-center mb-4">
                <span className={`badge ${item.drone_detected ? 'badge-danger' : 'badge-success'}`}>
                  {item.drone_detected ? 'DRONE FOUND' : 'CLEAR'}
                </span>
                <span className="text-xs text-muted font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="history-img-container">
                {item.image_data ? (
                  <img src={`data:image/jpeg;base64,${item.image_data}`} className="history-img" />
                ) : (
                  <ImageIcon size={32} className="text-muted" />
                )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm font-bold">Confidence</span>
                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{(item.confidence_score * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Sessions List */}
      {activeTab === 'live' && (
        <div className="flex flex-col gap-8">
          {Object.keys(sessionsMap).length === 0 ? (
            <div className="py-20 text-center text-muted card">
               <Video size={48} className="mx-auto mb-4 opacity-20" />
               <p>No live session sessions found.</p>
            </div>
          ) : Object.keys(sessionsMap).sort().reverse().map(sid => (
            <div key={sid} className="card">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div style={{ color: 'var(--primary-color)', padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem' }}>
                    <FolderOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{sid}</h3>
                    <p className="text-xs text-muted uppercase tracking-tight">{sessionsMap[sid].length} Events • {new Date(sessionsMap[sid][0].timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteSession(sid)} className="btn btn-secondary" style={{ padding: '0.5rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {sessionsMap[sid].map(alert => (
                  <div key={alert._id} className="card p-2 text-center" style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                    <div className="history-img-container" style={{ height: '5rem', marginBottom: '0.5rem' }}>
                      {alert.image_data ? (
                        <img src={`data:image/jpeg;base64,${alert.image_data}`} className="history-img" />
                      ) : (
                        <AlertCircle size={20} className="text-danger" />
                      )}
                    </div>
                    <div className="text-[10px] font-bold">{(alert.confidence_score * 100).toFixed(0)}% CONF</div>
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
