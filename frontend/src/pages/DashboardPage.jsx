import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Folder, Clock, Play, Trash2, ExternalLink, User, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        // If user is logged in, filter by their userId
        const url = user?.id ? `${API}/projects?userId=${user.id}` : `${API}/projects`;
        const res = await axios.get(url);
        if (res.data.success) setProjects(res.data.projects || []);
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
      setLoading(false);
    };
    loadProjects();
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white font-['Outfit']">Your Projects</h1>
            <p className="text-slate-500 mt-1">Manage and edit your video projects</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Folder className="w-4 h-4" />
            <span>{projects.length} projects</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-violet-500 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
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
        )}
      </div>
    </div>
  );
}
