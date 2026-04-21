import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Sparkles, 
  Play, 
  Zap, 
  Shield, 
  Clock, 
  Star, 
  ArrowRight, 
  Check,
  Layers,
  Image,
  Volume2,
  Wand2,
  Video,
  ChevronDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FEATURES = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "AI-Powered Generation",
    desc: "Generate scripts, images, and voiceovers instantly with cutting-edge AI"
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Smart Storyboarding",
    desc: "Auto-create professional storyboards from your ideas in seconds"
  },
  {
    icon: <Image className="w-6 h-6" />,
    title: "Image Generation",
    desc: "Beautiful, contextual images for every slide powered by Gemini"
  },
  {
    icon: <Volume2 className="w-6 h-6" />,
    title: "Natural Voiceover",
    desc: "Crystal-clear AI voices with multiple languages and tones"
  },
  {
    icon: <Video className="w-6 h-6" />,
    title: "Video Export",
    desc: "Export your creations as MP4 videos ready to share"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "5x Faster",
    desc: "Create professional videos in minutes, not hours"
  }
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    features: ["5 video creations/month", "720p exports", "Basic templates", "Email support"],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["Unlimited videos", "1080p HD exports", "Premium templates", "Priority support", "Custom branding"],
    cta: "Start Free Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Pro", "4K quality", "API access", "Dedicated manager", "Custom workflows"],
    cta: "Contact Sales",
    popular: false
  }
];

const CATEGORIES = [
  { id: "explainer", label: "Explainer", icon: "📚", color: "#818cf8" },
  { id: "marketing", label: "Marketing", icon: "📈", color: "#f472b6" },
  { id: "social", label: "Social Media", icon: "📱", color: "#10b981" },
  { id: "education", label: "Education", icon: "🎓", color: "#f59e0b" },
  { id: "newsletter", label: "Newsletter", icon: "📧", color: "#3b82f6" }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('explainer');
  const [duration, setDuration] = useState(30);
  const [slideCount, setSlideCount] = useState(5);
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Generate script first using /generate-prompt
      const scriptRes = await axios.post(`${API}/generate-prompt`, {
        story: input,
        category: category,
        tone: "professional",
        slideCount: slideCount,
        duration: duration,
        visualStyle: "Cinematic"
      }, { timeout: 120000 });
      
      if (scriptRes.data.success && scriptRes.data.data) {
        console.log('Script generated successfully:', scriptRes.data.data);
        // Go to create page with the generated script for review
        navigate('/create', { state: { 
          scriptData: scriptRes.data.data,
          input: input,
          category: category,
          duration: duration,
          slideCount: slideCount,
          visualStyle: visualStyle
        }});
      } else {
        setError(scriptRes.data.error || 'Failed to generate script');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Something went wrong';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">SundayRemaker</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Dashboard
            </button>
            <button 
              onClick={() => navigate('/create')}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-semibold transition"
            >
              Start Creating
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">AI-Powered Video Creation</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Create stunning videos
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              in minutes, not hours
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Transform your ideas into professional videos with AI. Generate scripts, 
            images, and voiceovers automatically.
          </p>

          {/* Quick Create Form */}
          <div className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-6 max-w-2xl mx-auto">
            <div className="mb-6">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What's your video about? e.g., 'iran war explained in 60 seconds'"
                className="w-full h-28 bg-[#161b22] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Duration (sec)</label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#161b22] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>2 minutes</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Slides</label>
                <select 
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full bg-[#161b22] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value={3}>3 slides</option>
                  <option value={5}>5 slides</option>
                  <option value={8}>8 slides</option>
                  <option value={10}>10 slides</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !input.trim()}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Video
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            Free to start • No credit card required
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-[#0d1117]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to create amazing videos</h2>
            <p className="text-slate-400">Powerful AI tools at your fingertips</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-[#161b22] border border-white/[0.06] rounded-xl p-6 hover:border-indigo-500/30 transition">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Create videos in 3 simple steps</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Describe your idea", desc: "Tell us what you want to create about" },
              { step: "2", title: "AI generates", desc: "Scripts, images, and voiceovers created automatically" },
              { step: "3", title: "Export & share", desc: "Download your video or share directly" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-[#0d1117]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start free, upgrade when you need more</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <div 
                key={i} 
                className={`bg-[#161b22] border rounded-xl p-6 ${tier.popular ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-white/[0.06]'}`}
              >
                {tier.popular && (
                  <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black">{tier.price}</span>
                  {tier.period && <span className="text-slate-400">{tier.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold transition ${tier.popular ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-white'}`}>
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">SundayRemaker</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 SundayRemaker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}