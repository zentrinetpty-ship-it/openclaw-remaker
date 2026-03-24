import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Folder, Clock, Play, Trash2, ExternalLink, User, LogOut, Image, Mic, Film, Library, Search, Grid3X3, X, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ASSET_CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid3X3 },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'voice', label: 'Voices', icon: Mic },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'audio', label: 'Audio', icon: Mic },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [library, setLibrary] = useState([]);
  const [libraryCounts, setLibraryCounts] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const token = localStorage.getItem('token');

  const loadLibrary = async (cat) => {
    if (!user?.id || !token) return;
    try {
      const res = await axios.get(`${API}/user/library?category=${cat}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLibrary(res.data.assets || []);
        setLibraryCounts(res.data.counts || {});
      }
    } catch (e) {
      console.log('Could not load library');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const url = user?.id ? `${API}/projects?userId=${user.id}` : `${API}/projects`;
        const res = await axios.get(url);
        if (res.data.success) setProjects(res.data.projects || []);
        
        if (user?.id && token) {
          try {
            const statsRes = await axios.get(`${API}/user/stats`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (statsRes.data.success) setStats(statsRes.data.stats);
          } catch (e) {
            console.log('Could not load stats');
          }
          await loadLibrary('all');
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'library') loadLibrary(libraryCategory);
  }, [libraryCategory, activeTab]);

  const handleDeleteAsset = async (assetId) => {
    if (!token) return;
    setDeletingId(assetId);
    try {
      await axios.delete(`${API}/user/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLibrary(prev => prev.filter(a => a.id !== assetId));
      setLibraryCounts(prev => {
        const asset = library.find(a => a.id === assetId);
        if (asset) {
          const t = asset.type || 'other';
          return { ...prev, [t]: Math.max(0, (prev[t] || 0) - 1) };
        }
        return prev;
      });
    } catch (e) {
      console.error('Delete failed:', e);
    }
    setDeletingId(null);
  };

  const filteredLibrary = librarySearch
    ? library.filter(a => (a.prompt || '').toLowerCase().includes(librarySearch.toLowerCase()))
    : library;

  const totalAssets = Object.values(libraryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#030712]" data-testid="dashboard-page" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-indigo-500">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-100">
              Explaina<span className="gradient-text">Pro</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-indigo-500/10 border border-indigo-500/20">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-300">{user?.name || user?.email?.split('@')[0]}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-sm text-slate-500 hover:text-slate-300 hover:bg-white/5" data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <motion.button onClick={() => setShowAuthModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-5 py-2 rounded-none bg-indigo-500 text-white text-sm font-bold btn-sharp" data-testid="login-btn">
                Sign In
              </motion.button>
            )}
            <motion.button onClick={() => navigate('/')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-5 py-2 rounded-none bg-indigo-500 text-white text-sm font-bold btn-sharp" data-testid="new-project-btn">
              <Plus className="w-4 h-4" /> New Project
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Banner */}
        {isAuthenticated && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Folder, label: 'Projects', value: stats.projects, color: '#818cf8', bg: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
              { icon: Image, label: 'Images', value: stats.images, color: '#60a5fa', bg: 'bg-blue-500/10', borderColor: 'border-blue-500/20', iconColor: 'text-blue-400' },
              { icon: Mic, label: 'Voices', value: stats.voices, color: '#34d399', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
              { icon: Film, label: 'Videos', value: stats.videos, color: '#f472b6', bg: 'bg-pink-500/10', borderColor: 'border-pink-500/20', iconColor: 'text-pink-400' },
            ].map((s, i) => (
              <div key={i} className={`p-4 rounded-md border-2 ${s.borderColor} ${s.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{s.label}</span>
                </div>
                <p className="text-2xl font-black text-slate-100">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-white/[0.06] mb-6">
          <button onClick={() => setActiveTab('projects')} className={`pb-3 text-sm font-bold border-b-2 -mb-px transition ${activeTab === 'projects' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`} data-testid="tab-projects">
            Projects ({projects.length})
          </button>
          {isAuthenticated && (
            <button onClick={() => setActiveTab('library')} className={`pb-3 text-sm font-bold border-b-2 -mb-px flex items-center gap-2 transition ${activeTab === 'library' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`} data-testid="tab-library">
              <Library className="w-4 h-4" /> My Library ({totalAssets})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-md bg-[#0a0f1a] border-2 border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                <Folder className="w-10 h-10 text-slate-700" />
              </div>
              <h2 className="text-xl font-bold text-slate-200 mb-2">No projects yet</h2>
              <p className="text-slate-500 mb-6">Create your first AI-powered video</p>
              <motion.button whileHover={{ scale: 1.02 }} onClick={() => navigate('/')} className="px-6 py-2.5 rounded-none bg-indigo-500 text-white font-bold text-sm btn-sharp inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create New Project
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group rounded-md border-2 border-white/[0.08] bg-[#0a0f1a] overflow-hidden hover:border-indigo-500/30 transition-all card-lift"
                >
                  <div className="aspect-video relative bg-[#0d1117] flex items-center justify-center">
                    {project.projectData?.slides?.[0]?.assetUrl ? (
                      <img 
                        src={project.projectData.slides[0].assetUrl.startsWith('/api') 
                          ? `${process.env.REACT_APP_BACKEND_URL}${project.projectData.slides[0].assetUrl}` 
                          : project.projectData.slides[0].assetUrl
                        } 
                        className="w-full h-full object-cover" 
                        alt={project.title} 
                      />
                    ) : (
                      <Play className="w-12 h-12 text-slate-700" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate(`/editor/${project.id}`)} className="flex items-center gap-1.5 px-4 py-2 rounded-none bg-indigo-500 text-white text-xs font-bold btn-sharp" data-testid={`open-project-${project.id}`}>
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </motion.button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-200 truncate">{project.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {project.settings?.duration || 30}s
                      </span>
                      <span>{project.slides?.length || project.projectData?.slides?.length || 0} slides</span>
                      <span className="capitalize">{project.category || 'explainer'}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2 font-mono">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Library Tab */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex gap-2 flex-wrap">
                {ASSET_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setLibraryCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold border-2 transition ${
                      libraryCategory === cat.id
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : 'border-white/[0.08] bg-transparent text-slate-500 hover:border-white/[0.15]'
                    }`}
                    data-testid={`library-filter-${cat.id}`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                    {cat.id !== 'all' && libraryCounts[cat.id] ? (
                      <span className="ml-1 text-[10px] opacity-60">({libraryCounts[cat.id]})</span>
                    ) : cat.id === 'all' ? (
                      <span className="ml-1 text-[10px] opacity-60">({totalAssets})</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-sm bg-[#0d1117] border-2 border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#030712]"
                  data-testid="library-search"
                />
              </div>
            </div>

            {filteredLibrary.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-md bg-[#0a0f1a] border-2 border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Library className="w-8 h-8 text-slate-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-200 mb-2">
                  {librarySearch ? 'No matching assets' : 'No assets yet'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {librarySearch ? 'Try a different search term' : 'Generated images, voices, and videos will appear here'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredLibrary.map((asset, idx) => (
                    <motion.div
                      key={asset.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.02 }}
                      className="rounded-md border-2 border-white/[0.08] bg-[#0a0f1a] overflow-hidden group relative card-lift"
                      data-testid={`library-asset-${asset.id}`}
                    >
                      {asset.type === 'image' || asset.type === 'video' ? (
                        <div className="aspect-video relative bg-[#0d1117]">
                          <img 
                            src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url} 
                            alt={asset.prompt?.slice(0, 30)} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video relative bg-emerald-500/10 flex items-center justify-center">
                          <Mic className="w-8 h-8 text-emerald-400" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-none text-[9px] font-bold uppercase bg-indigo-500 text-white">
                        {asset.type}
                      </div>

                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        disabled={deletingId === asset.id}
                        className="absolute top-2 right-2 w-7 h-7 rounded-sm bg-black/60 backdrop-blur-sm border border-white/[0.1] flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        data-testid={`delete-asset-${asset.id}`}
                      >
                        {deletingId === asset.id ? (
                          <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="p-3">
                        <p className="text-xs text-slate-400 line-clamp-2">{asset.prompt || 'No description'}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-[9px] text-slate-600 font-mono">{new Date(asset.createdAt).toLocaleDateString()}</p>
                          {asset.metadata?.source === 'upload' && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-none bg-white/[0.05] text-slate-500 font-bold border border-white/[0.08]">Uploaded</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
