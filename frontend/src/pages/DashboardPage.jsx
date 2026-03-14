import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Folder, Clock, Play, Trash2, ExternalLink, User, LogOut, Image, Mic, Film, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load projects
        const url = user?.id ? `${API}/projects?userId=${user.id}` : `${API}/projects`;
        const res = await axios.get(url);
        if (res.data.success) setProjects(res.data.projects || []);
        
        // Load user assets and stats if logged in
        if (user?.id) {
          try {
            const [assetsRes, statsRes] = await Promise.all([
              axios.get(`${API}/user/assets?limit=20`),
              axios.get(`${API}/user/stats`)
            ]);
            if (assetsRes.data.success) setAssets(assetsRes.data.assets || []);
            if (statsRes.data.success) setStats(statsRes.data.stats);
          } catch (e) {
            console.log('Could not load user data');
          }
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#030712]" data-testid="dashboard-page">
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
        {/* Stats Banner - Only for logged in users */}
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
            <button onClick={() => setActiveTab('assets')} className={`pb-3 text-sm font-semibold border-b-2 -mb-px ${activeTab === 'assets' ? 'border-violet-500 text-white' : 'border-transparent text-slate-500'}`} data-testid="tab-assets">
              Generated Assets ({assets.length})
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
          /* Assets Tab */
          assets.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Image className="w-10 h-10 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No generated assets yet</h2>
              <p className="text-slate-500 mb-6">Start creating to see your generated images, voices, and videos here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden group"
                >
                  {asset.type === 'image' || asset.type === 'video' ? (
                    <div className="aspect-video relative bg-slate-800">
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}${asset.url}`} 
                        alt={asset.prompt?.slice(0, 30)} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-black/50 text-white">
                        {asset.type}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video relative bg-gradient-to-br from-emerald-900/30 to-slate-900 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-emerald-400" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-black/50 text-white">
                        voice
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-slate-400 line-clamp-2">{asset.prompt || 'No description'}</p>
                    <p className="text-[9px] text-slate-600 mt-1">{new Date(asset.createdAt).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
