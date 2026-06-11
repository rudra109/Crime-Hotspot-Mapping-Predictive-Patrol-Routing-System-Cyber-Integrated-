/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Radio, MapPin, Cpu, Users, BarChart3, ChevronRight, Activity,
  Eye, Navigation, Lock, Zap, Globe, Database, Layers,
  ArrowRight, Menu, X, Play, Star, TrendingUp, AlertTriangle
} from "lucide-react";

interface LandingPageProps {
  onEnterDashboard: () => void;
}

/* ─────────────────── Animated Counter ─────────────────── */
function AnimatedCounter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
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
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────── Floating Particles ─────────────────── */
function FloatingParticles() {
  return (
    <div className="landing-particles" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="landing-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }}
        />
      ))}
    </div>
  );
}

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
      gradient: "landing-feature-gradient-1"
    },
    {
      icon: Navigation,
      title: "Predictive Patrol Routing",
      description: "Optimal route generation using ML engines ensures patrol units cover maximum ground while prioritizing high-risk zones dynamically.",
      gradient: "landing-feature-gradient-2"
    },
    {
      icon: Globe,
      title: "Real-Time Threat Mapping",
      description: "Live geospatial visualization with interactive heatmaps, incident overlays, and sector-level threat indices for immediate situational awareness.",
      gradient: "landing-feature-gradient-3"
    },
    {
      icon: Cpu,
      title: "Intelligent Automation",
      description: "Automated dispatch protocols, AI-generated tactical briefings, and smart alert escalation reduce response time by up to 40%.",
      gradient: "landing-feature-gradient-1"
    },
    {
      icon: Eye,
      title: "Surveillance Integration",
      description: "Unified surveillance mesh connects CCTV feeds, drone fleet telemetry, and sensor networks into a single command interface.",
      gradient: "landing-feature-gradient-2"
    },
    {
      icon: Lock,
      title: "Cyber Threat Defense",
      description: "Integrated cybercrime monitoring with encrypted communications, anomaly detection, and forensic audit trail capabilities.",
      gradient: "landing-feature-gradient-3"
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
    <div className="landing-root">
      <FloatingParticles />

      {/* ─── NAVBAR ─── */}
      <nav className={`landing-navbar ${scrolled ? "landing-navbar-scrolled" : ""}`}>
        <div className="landing-navbar-inner">
          <div className="landing-navbar-brand">
            <div className="landing-logo-icon">
              <Shield className="landing-logo-svg" />
            </div>
            <div>
              <span className="landing-brand-label">Gujarat Police</span>
              <span className="landing-brand-name">AEGIS Command</span>
            </div>
          </div>

          <div className="landing-nav-links">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="landing-nav-link">
                {link.label}
              </a>
            ))}
          </div>

          <div className="landing-nav-actions">
            <button
              onClick={() => setIsInitializing(true)}
              className="landing-btn-primary"
            >
              Launch Console
              <ArrowRight className="landing-btn-icon" />
            </button>
          </div>

          <button
            className="landing-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="landing-mobile-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => { setMobileMenuOpen(false); setIsInitializing(true); }}
              className="landing-btn-primary landing-mobile-cta"
            >
              Launch Console
              <ArrowRight className="landing-btn-icon" />
            </button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden="true" />
        <div className="landing-hero-grid-bg" aria-hidden="true" />

        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Zap className="landing-badge-icon" />
            <span>AI-Powered Crime Intelligence Platform</span>
          </div>

          <h1 className="landing-hero-title">
            Safeguard Your City Using{" "}
            <span className="landing-gradient-text">
              AI-Driven Predictive Policing
            </span>
          </h1>

          <p className="landing-hero-desc">
            An intelligent command platform that unifies crime hotspot mapping,
            predictive patrol routing, and real-time threat analysis — empowering
            Ahmedabad Police with data-driven decision making.
          </p>

          <div className="landing-hero-buttons">
            {!isInitializing ? (
              <>
                <button
                  id="btn-initialize-system"
                  onClick={() => setIsInitializing(true)}
                  className="landing-btn-hero-primary"
                >
                  <Activity className="landing-btn-icon" />
                  <span>Initialize Command Center</span>
                  <ChevronRight className="landing-btn-icon landing-btn-chevron" />
                </button>
                <a href="#dashboard" className="landing-btn-hero-secondary">
                  <Play className="landing-btn-icon" />
                  <span>View Dashboard</span>
                </a>
              </>
            ) : (
              <div className="landing-init-loader">
                <div className="landing-init-header">
                  <span className="landing-init-stage">{initStage}</span>
                  <span className="landing-init-pct">{loadingProgress}%</span>
                </div>
                <div className="landing-init-bar-bg">
                  <div className="landing-init-bar-fill" style={{ width: `${loadingProgress}%` }} />
                </div>
                <p className="landing-init-sub">
                  Establishing secure link. Telemetry hooks active on port 3000.
                </p>
              </div>
            )}
          </div>

          <div className="landing-hero-status">
            <span className="landing-status-dot" />
            <span>All systems operational · Secure connection established</span>
          </div>
        </div>
      </section>

      {/* ─── DASHBOARD PREVIEW ─── */}
      <section id="dashboard" className="landing-section landing-dashboard-section">
        <div className="landing-dashboard-glow" aria-hidden="true" />
        <div className="landing-container">
          <div className="landing-dashboard-card">
            {/* Mock Dashboard Header */}
            <div className="landing-dash-header">
              <div className="landing-dash-header-left">
                <div className="landing-dash-logo-mini">
                  <Shield className="landing-dash-logo-svg" />
                </div>
                <span className="landing-dash-brand">AEGIS Command</span>
              </div>
              <div className="landing-dash-search">
                <span>⌘</span> Search Commands...
              </div>
              <div className="landing-dash-header-right">
                <span className="landing-dash-greeting">Hi, Commander</span>
                <div className="landing-dash-avatar">CP</div>
              </div>
            </div>

            {/* Mock Dashboard Body */}
            <div className="landing-dash-body">
              <div className="landing-dash-sidebar">
                <h3 className="landing-dash-sidebar-title">My Dashboard</h3>
                <div className="landing-dash-tabs">
                  <span className="landing-dash-tab landing-dash-tab-active">Operations</span>
                  <span className="landing-dash-tab">Intelligence</span>
                  <span className="landing-dash-tab">Surveillance</span>
                  <span className="landing-dash-tab">Routing</span>
                </div>

                {/* Mini Chart */}
                <div className="landing-dash-chart">
                  <div className="landing-dash-chart-title">Crime Trends</div>
                  <div className="landing-dash-chart-bars">
                    {[65, 45, 80, 55, 90, 70, 40, 85, 60, 75, 50, 95].map((h, i) => (
                      <div key={i} className="landing-dash-chart-bar-wrapper">
                        <div
                          className="landing-dash-chart-bar"
                          style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="landing-dash-main">
                <div className="landing-dash-stat-card landing-dash-stat-highlight">
                  <div className="landing-dash-stat-label">Active Threat Index</div>
                  <div className="landing-dash-stat-value">
                    <TrendingUp className="landing-dash-stat-icon" />
                    78.5
                  </div>
                  <div className="landing-dash-stat-sub">+12% from yesterday</div>
                </div>
                <div className="landing-dash-stat-card">
                  <div className="landing-dash-stat-label">Units Deployed</div>
                  <div className="landing-dash-stat-value">42</div>
                </div>
                <div className="landing-dash-stat-card">
                  <div className="landing-dash-stat-label">Open Cases</div>
                  <div className="landing-dash-stat-value">156</div>
                </div>
                {/* Map Preview */}
                <div className="landing-dash-map">
                  <div className="landing-dash-map-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="landing-dash-map-zone">
                        <div className={`landing-dash-map-dot ${i < 2 ? 'landing-dash-map-dot-danger' : i < 4 ? 'landing-dash-map-dot-warn' : 'landing-dash-map-dot-safe'}`} />
                        <span>Zone {i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="landing-dash-map-label">
                    <MapPin className="landing-dash-map-icon" /> Ahmedabad Sector Grid
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="landing-trusted-text">
          Trusted by Gujarat Police · Powered by Machine Learning
        </p>
      </section>

      {/* ─── STATS BAR ─── */}
      <section id="stats" className="landing-section landing-stats-section">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="landing-stat-item">
                <div className="landing-stat-value">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="landing-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="landing-section landing-features-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              Accelerate your operations with{" "}
              <span className="landing-gradient-text">
                intelligent crime prevention.
              </span>
            </h2>
            <p className="landing-section-subtitle">
              A comprehensive suite of AI-powered tools designed to transform
              reactive policing into proactive, data-driven law enforcement.
            </p>
          </div>

          <div className="landing-features-grid">
            {features.map((feature, i) => (
              <div key={i} className="landing-feature-card">
                <div className={`landing-feature-icon-wrap ${feature.gradient}`}>
                  <feature.icon className="landing-feature-icon" />
                </div>
                <h3 className="landing-feature-title">{feature.title}</h3>
                <p className="landing-feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CAPABILITIES ─── */}
      <section id="capabilities" className="landing-section landing-capabilities-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">
              Built for{" "}
              <span className="landing-gradient-text">mission-critical</span>{" "}
              operations
            </h2>
            <p className="landing-section-subtitle">
              Every component is engineered for reliability, speed, and scale —
              from data ingestion to real-time field coordination.
            </p>
          </div>

          <div className="landing-capabilities-grid">
            {capabilities.map((cap, i) => (
              <div key={i} className="landing-capability-card">
                <div className="landing-capability-header">
                  <div className="landing-capability-icon-wrap">
                    <cap.icon className="landing-capability-icon" />
                  </div>
                  <span className="landing-capability-stat">{cap.stat}</span>
                </div>
                <h3 className="landing-capability-title">{cap.title}</h3>
                <p className="landing-capability-desc">{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="landing-section landing-cta-section">
        <div className="landing-cta-glow" aria-hidden="true" />
        <div className="landing-container">
          <div className="landing-cta-card">
            <h2 className="landing-cta-title">
              Ready to transform law enforcement?
            </h2>
            <p className="landing-cta-desc">
              Experience the future of predictive policing. Initialize the AEGIS
              Command Center and gain real-time operational intelligence.
            </p>
            <button
              onClick={() => setIsInitializing(true)}
              className="landing-btn-hero-primary landing-cta-btn"
            >
              <Activity className="landing-btn-icon" />
              <span>Launch Command Center</span>
              <ArrowRight className="landing-btn-icon" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-left">
            <div className="landing-navbar-brand">
              <div className="landing-logo-icon">
                <Shield className="landing-logo-svg" />
              </div>
              <div>
                <span className="landing-brand-label">Gujarat Police</span>
                <span className="landing-brand-name">AEGIS Command</span>
              </div>
            </div>
            <p className="landing-footer-desc">
              AI-powered crime intelligence platform for the Ahmedabad Police
              Department. Predictive analytics meets real-time operations.
            </p>
          </div>

          <div className="landing-footer-links-group">
            <div className="landing-footer-col">
              <h4 className="landing-footer-col-title">Platform</h4>
              <a href="#features" className="landing-footer-link">Features</a>
              <a href="#dashboard" className="landing-footer-link">Dashboard</a>
              <a href="#capabilities" className="landing-footer-link">Capabilities</a>
            </div>
            <div className="landing-footer-col">
              <h4 className="landing-footer-col-title">System</h4>
              <span className="landing-footer-link">Documentation</span>
              <span className="landing-footer-link">API Reference</span>
              <span className="landing-footer-link">Status Page</span>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <div className="landing-container landing-footer-bottom-inner">
            <span>© 2026 Ahmedabad Police Department. All Rights Reserved.</span>
            <div className="landing-footer-meta">
              <span>PORT: <b>3000</b></span>
              <span className="landing-footer-sep">|</span>
              <span>LATENCY: <b>12ms</b></span>
              <span className="landing-footer-sep">|</span>
              <span>REGION: GUJARAT, IND</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
