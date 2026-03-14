import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Folder, Clock, Play, Trash2, ExternalLink, User, LogOut, Image, Mic, Film, BarChart3, Library, Search, Filter, Grid3X3, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ASSET_CATEGORIES = [
  { id: 'all', label: 'All', icon: Grid3X3, color: 'text-slate-400' },
  { id: 'image', label: 'Images', icon: Image, color: 'text-blue-400' },
  { id: 'voice', label: 'Voices', icon: Mic, color: 'text-emerald-400' },
  { id: 'video', label: 'Videos', icon: Film, color: 'text-pink-400' },
  { id: 'audio', label: 'Audio', icon: Mic, color: 'text-amber-400' },
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
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white font-['Outfit']">
              Explaina<span className="gradient-text">Pro</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <User className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-slate-300">{user?.name || user?.email?.split('@')[0]}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" data-testid="logout-btn">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowAuthModal(true)} data-testid="login-btn">Sign In</Button>
            )}
            <Button onClick={() => navigate('/')} data-testid="new-project-btn">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Banner */}
        {isAuthenticated && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Folder className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-slate-400 uppercase">Projects</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.projects}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400 uppercase">Images</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.images}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400 uppercase">Voices</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.voices}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Film className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-slate-400 uppercase">Videos</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.videos}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800 mb-6">
          <button onClick={() => setActiveTab('projects')} className={`pb-3 text-sm font-semibold border-b-2 -mb-px ${activeTab === 'projects' ? 'border-violet-500 text-white' : 'border-transparent text-slate-500'}`} data-testid="tab-projects">
            Projects ({projects.length})
          </button>
          {isAuthenticated && (
            <button onClick={() => setActiveTab('library')} className={`pb-3 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 ${activeTab === 'library' ? 'border-violet-500 text-white' : 'border-transparent text-slate-500'}`} data-testid="tab-library">
              <Library className="w-4 h-4" /> My Library ({totalAssets})
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-violet-500 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Folder className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
              <p className="text-slate-500 mb-6">Create your first AI-powered video</p>
              <Button onClick={() => navigate('/')} size="lg">
                <Plus className="w-4 h-4 mr-2" /> Create New Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-violet-500/50 transition-colors"
                >
                  <div className="aspect-video relative bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
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
                      <Play className="w-12 h-12 text-slate-600" />
                    )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button size="sm" onClick={() => navigate(`/editor/${project.id}`)} data-testid={`open-project-${project.id}`}>
                      <ExternalLink className="w-4 h-4 mr-1" /> Open
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate">{project.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {project.settings?.duration || 30}s
                    </span>
                    <span>{project.slides?.length || project.projectData?.slides?.length || 0} slides</span>
                    <span className="capitalize">{project.category || 'explainer'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
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
            {/* Category filters + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex gap-2 flex-wrap">
                {ASSET_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setLibraryCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      libraryCategory === cat.id
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                        : 'bg-slate-800/50 text-slate-500 border border-slate-800 hover:border-slate-600'
                    }`}
                    data-testid={`library-filter-${cat.id}`}
                  >
                    <cat.icon className={`w-3.5 h-3.5 ${libraryCategory === cat.id ? 'text-violet-400' : cat.color}`} />
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
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
                  data-testid="library-search"
                />
              </div>
            </div>

            {filteredLibrary.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <Library className="w-8 h-8 text-slate-600" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
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
                      className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden group relative"
                      data-testid={`library-asset-${asset.id}`}
                    >
                      {asset.type === 'image' || asset.type === 'video' ? (
                        <div className="aspect-video relative bg-slate-800">
                          <img 
                            src={asset.url?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${asset.url}` : asset.url} 
                            alt={asset.prompt?.slice(0, 30)} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video relative bg-gradient-to-br from-emerald-900/30 to-slate-900 flex items-center justify-center">
                          <Mic className="w-8 h-8 text-emerald-400" />
                        </div>
                      )}

                      {/* Type badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-black/60 text-white backdrop-blur-sm">
                        {asset.type}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        disabled={deletingId === asset.id}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 hover:bg-red-500/30"
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
                          <p className="text-[9px] text-slate-600">{new Date(asset.createdAt).toLocaleDateString()}</p>
                          {asset.metadata?.source === 'upload' && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Uploaded</span>
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
