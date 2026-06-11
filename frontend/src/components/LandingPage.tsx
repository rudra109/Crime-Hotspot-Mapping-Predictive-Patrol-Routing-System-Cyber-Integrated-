/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Shield, MapPin, Cpu, Users, BarChart3, ChevronRight, Activity,
  Eye, Navigation, Lock, Zap, Globe, Database,
  ArrowRight, Menu, X, Play, TrendingUp, AlertTriangle
} from "lucide-react";
import { motion, useInView } from "motion/react";

interface LandingPageProps {
  onEnterDashboard: () => void;
}

/* ─────────────────── Animated Counter ─────────────────── */
function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────── Floating Particles ─────────────────── */
function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-500/10"
          initial={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Fade In Section Component ─────────────────── */
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────── MAIN LANDING PAGE ─────────────────── */
export default function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStage, setInitStage] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isInitializing) return;
    const stages = [
      "Authenticating Officer Credentials...",
      "Syncing Ahmedabad Sector Grid...",
      "Initializing Route Optimizer...",
      "Connecting to PCR Network...",
      "Establishing Field Officer Sync...",
      "Command Center Ready. Launching...",
    ];
    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onEnterDashboard(), 300);
          return 100;
        }
        const stageIndex = Math.min(Math.floor((prev / 100) * stages.length), stages.length - 1);
        setInitStage(stages[stageIndex]);
        return prev + 2;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [isInitializing, onEnterDashboard]);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Dashboard", href: "#dashboard" },
    { label: "Statistics", href: "#stats" },
    { label: "Capabilities", href: "#capabilities" },
  ];

  const stats = [
    { value: 4200, suffix: "+", label: "Incidents Processed" },
    { value: 98, suffix: "%", label: "Response Accuracy" },
    { value: 156, suffix: "", label: "Active Patrol Units" },
    { value: 24, suffix: "/7", label: "Real-Time Monitoring" },
  ];

  const features = [
    {
      icon: Shield,
      title: "AI-Powered Crime Analysis",
      description: "Advanced machine learning algorithms analyze historical crime data to predict hotspots and allocate resources efficiently across all sectors.",
      color: "from-blue-500 to-cyan-400"
    },
    {
      icon: Navigation,
      title: "Predictive Patrol Routing",
      description: "Optimal route generation using ML engines ensures patrol units cover maximum ground while prioritizing high-risk zones dynamically.",
      color: "from-cyan-400 to-emerald-400"
    },
    {
      icon: Globe,
      title: "Real-Time Threat Mapping",
      description: "Live geospatial visualization with interactive heatmaps, incident overlays, and sector-level threat indices for immediate situational awareness.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Cpu,
      title: "Intelligent Automation",
      description: "Automated dispatch protocols, AI-generated tactical briefings, and smart alert escalation reduce response time by up to 40%.",
      color: "from-pink-500 to-rose-400"
    },
    {
      icon: Eye,
      title: "Surveillance Integration",
      description: "Unified surveillance mesh connects CCTV feeds, drone fleet telemetry, and sensor networks into a single command interface.",
      color: "from-amber-400 to-orange-500"
    },
    {
      icon: Lock,
      title: "Cyber Threat Defense",
      description: "Integrated cybercrime monitoring with encrypted communications, anomaly detection, and forensic audit trail capabilities.",
      color: "from-slate-400 to-slate-200"
    }
  ];

  const capabilities = [
    {
      icon: Database,
      title: "Smart Data Pipeline",
      description: "Real-time ingestion and processing of crime data from multiple sources with automated classification and severity scoring.",
      stat: "10K+ events/hr"
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics Engine",
      description: "ML models trained on historical patterns to forecast emerging crime trends and recommend proactive deployment strategies.",
      stat: "94% accuracy"
    },
    {
      icon: AlertTriangle,
      title: "Instant Alert System",
      description: "Multi-channel alerting with configurable escalation paths, ensuring critical incidents reach the right personnel immediately.",
      stat: "<2s latency"
    },
    {
      icon: Users,
      title: "Field Officer Sync",
      description: "Mobile-first officer interface with real-time GPS tracking, incident reporting, and secure communications from the field.",
      stat: "150+ officers"
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <FloatingParticles />

      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.1)]">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="block text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase leading-none mb-1">Gujarat Police</span>
              <span className="block text-sm font-bold text-white tracking-wide">AEGIS Command</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsInitializing(true)}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] hover:-translate-y-0.5 transition-all flex items-center gap-2 group"
            >
              Launch Console
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <button className="md:hidden text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-full left-0 right-0 bg-[#0B1220]/95 backdrop-blur-xl border-b border-slate-800 p-6 flex flex-col gap-4 shadow-2xl"
          >
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-slate-300 hover:text-cyan-400 py-2 border-b border-slate-800" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); setIsInitializing(true); }} className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2">
              Launch Console <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 px-6 flex items-center justify-center text-center min-h-screen">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-8 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Crime Intelligence Platform
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Safeguard Your City Using <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Predictive Policing</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 font-medium">
            An intelligent command platform that unifies crime hotspot mapping, predictive patrol routing, and real-time threat analysis — empowering the police force with data-driven decision making.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {!isInitializing ? (
              <>
                <button onClick={() => setIsInitializing(true)} className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_30px_rgba(0,229,255,0.25)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group">
                  <Activity className="w-5 h-5" /> Initialize Command Center <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#dashboard" className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-white font-semibold backdrop-blur-md transition-all flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" /> View Dashboard
                </a>
              </>
            ) : (
              <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 p-6 rounded-2xl backdrop-blur-xl shadow-2xl text-left">
                <div className="flex justify-between text-xs font-mono font-bold text-white mb-3 tracking-widest uppercase">
                  <span className="text-cyan-400">{initStage}</span>
                  <span>{loadingProgress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(0,229,255,0.5)]" style={{ width: `${loadingProgress}%` }} />
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-3">Establishing secure link. Telemetry hooks active on port 3000.</p>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} className="mt-16 flex items-center justify-center gap-3 text-sm font-mono text-slate-500">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
            All systems operational · Secure connection established
          </motion.div>
        </div>
      </section>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <section id="dashboard" className="py-24 px-6 relative z-10">
        <FadeIn className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-slate-800/60 bg-slate-900/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] aspect-[16/9] flex flex-col group hover:border-cyan-500/30 transition-colors duration-500">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Header Mock */}
            <div className="h-16 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Shield className="w-4 h-4 text-cyan-400" /></div>
                <span className="text-sm font-semibold text-white">AEGIS Command</span>
              </div>
              <div className="hidden md:flex w-64 h-8 rounded-full bg-slate-900 border border-slate-800 items-center px-4 text-xs text-slate-500">⌘ Search Commands...</div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Hi, Commander</span>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-white font-bold">CP</div>
              </div>
            </div>

            {/* Body Mock */}
            <div className="flex-1 flex">
              <div className="hidden md:block w-64 border-r border-slate-800/80 bg-slate-950/30 p-6">
                <div className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">My Dashboard</div>
                <div className="space-y-2">
                  {['Operations', 'Intelligence', 'Surveillance', 'Routing'].map((item, i) => (
                    <div key={item} className={`px-4 py-2.5 rounded-lg text-sm font-medium ${i === 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400'}`}>{item}</div>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#030712]/50">
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/60 border border-cyan-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                    <div className="text-xs font-medium text-slate-400 mb-2">Active Threat Index</div>
                    <div className="text-3xl font-bold text-white flex items-center gap-3"><TrendingUp className="text-cyan-400 w-6 h-6" /> 78.5</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                    <div className="text-xs font-medium text-slate-400 mb-2">Units Deployed</div>
                    <div className="text-3xl font-bold text-white">42</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                    <div className="text-xs font-medium text-slate-400 mb-2">Open Cases</div>
                    <div className="text-3xl font-bold text-white">156</div>
                  </div>
                </div>
                <div className="md:col-span-3 flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center">
                  <MapPin className="w-12 h-12 text-slate-700 mb-4" />
                  <span className="text-sm font-medium text-slate-500">Ahmedabad Sector Grid Live Visualization</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-sm font-medium text-slate-500 mt-8">Trusted by Gujarat Police · Powered by Machine Learning</p>
        </FadeIn>
      </section>

      {/* ─── STATS BAR ─── */}
      <section id="stats" className="py-20 border-y border-white/5 bg-slate-900/20 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
          {stats.map((stat, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm md:text-base font-medium text-slate-400">{stat.label}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="py-24 md:py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Accelerate operations with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">intelligent prevention.</span>
            </h2>
            <p className="text-lg text-slate-400">A comprehensive suite of AI-powered tools designed to transform reactive policing into proactive, data-driven law enforcement.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="h-full p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(0,229,255,0.15)] group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${feature.color} bg-opacity-10 shadow-lg relative z-10`}>
                    <div className="w-full h-full bg-slate-950/80 rounded-2xl flex items-center justify-center m-[2px]">
                       <feature.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 relative z-10">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed relative z-10">{feature.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES ─── */}
      <section id="capabilities" className="py-24 md:py-32 px-6 relative z-10 bg-slate-900/20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">mission-critical</span> ops</h2>
            <p className="text-lg text-slate-400">Engineered for reliability, speed, and scale — from data ingestion to real-time field coordination.</p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {capabilities.map((cap, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="p-8 md:p-10 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,229,255,0.05)] group">
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <cap.icon className="w-7 h-7 text-cyan-400" />
                    </div>
                    <span className="px-4 py-2 rounded-full bg-slate-950 border border-slate-800 text-sm font-bold text-cyan-400">{cap.stat}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{cap.title}</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">{cap.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 px-6 relative z-10">
        <FadeIn className="max-w-5xl mx-auto text-center p-12 md:p-20 rounded-[3rem] bg-gradient-to-b from-slate-900 to-[#030712] border border-slate-800 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-1/2 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10 tracking-tight">Ready to transform law enforcement?</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 relative z-10">Experience the future of predictive policing. Initialize the AEGIS Command Center and gain real-time operational intelligence.</p>
          <button onClick={() => setIsInitializing(true)} className="relative z-10 px-10 py-5 rounded-full bg-white text-[#030712] hover:bg-cyan-50 font-extrabold text-lg shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mx-auto group">
            <Activity className="w-6 h-6" /> Launch Command Center <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 bg-[#030712] pt-20 pb-10 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Shield className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <span className="block text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase leading-none mb-1">Gujarat Police</span>
                  <span className="block text-sm font-bold text-white tracking-wide">AEGIS Command</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">AI-powered crime intelligence platform for the Ahmedabad Police Department. Predictive analytics meets real-time operations.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6">Platform</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#dashboard" className="hover:text-cyan-400 transition-colors">Dashboard</a></li>
                <li><a href="#capabilities" className="hover:text-cyan-400 transition-colors">Capabilities</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6">System</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Documentation</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">API Reference</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Status Page</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-600">
            <span>© 2026 Ahmedabad Police Department. All Rights Reserved.</span>
            <div className="flex gap-4 items-center">
              <span>PORT: <b className="text-slate-400">3000</b></span>
              <span>|</span>
              <span>LATENCY: <b className="text-slate-400">12ms</b></span>
              <span>|</span>
              <span>REGION: GUJARAT, IND</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
