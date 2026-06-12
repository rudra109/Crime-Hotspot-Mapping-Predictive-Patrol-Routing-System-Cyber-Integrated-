/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  MapPinned,
  Menu,
  Navigation,
  Shield,
  ShieldCheck,
  X,
  Activity,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onEnterDashboard: () => void;
}

const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-2xl border border-gov-border bg-white p-5 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">{label}</div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-gov-navy">{value}</div>
      <div className="mt-2 text-sm text-gov-charcoal/80">{sublabel}</div>
    </div>
  );
}

export default function LandingPage({ onEnterDashboard }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!starting) return;

    const stages = [
      "Authenticating command session",
      "Loading Ahmedabad zones",
      "Syncing incident data",
      "Preparing patrol view",
      "Finalizing secure workspace",
    ];

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 4, 100);
        const index = Math.min(stages.length - 1, Math.floor((next / 100) * stages.length));
        setStage(stages[index]);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => onEnterDashboard(), 250);
        }
        return next;
      });
    }, 45);

    return () => window.clearInterval(timer);
  }, [starting, onEnterDashboard]);

  const stats = [
    { value: "24/7", label: "Live monitoring" },
    { value: "4", label: "Data sources unified" },
    { value: "6", label: "Police zones tracked" },
    { value: "1", label: "Command view" },
  ];

  const pillars = [
    {
      icon: Building2,
      title: "Integrated crime data",
      description: "FIRs, complaints, patrol logs, and cybercrime records in a single operational layer.",
    },
    {
      icon: MapPinned,
      title: "GIS crime mapping",
      description: "Interactive Ahmedabad map with hotspot layers, risk zones, and area drill-down.",
    },
    {
      icon: BarChart3,
      title: "Predictive analytics",
      description: "Temporal trends, hotspot forecasts, and zone risk scoring based on history.",
    },
    {
      icon: Navigation,
      title: "Patrol routing",
      description: "Dispatch-ready patrol planning with route guidance and real-time incident response.",
    },
  ];

  const workflow = [
    "Ingest and normalize police data",
    "Map incidents by area and severity",
    "Predict risk zones and hotspots",
    "Recommend unit deployment",
  ];

  return (
    <div className="min-h-screen bg-gov-gray text-gov-charcoal overflow-x-hidden">
      <div className="absolute inset-0 -z-10 bg-gov-gray" />
      <div className="absolute inset-0 -z-10 opacity-30 bg-[linear-gradient(rgba(0,48,135,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,48,135,0.05)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <header className={`sticky top-0 z-50 border-b transition-all ${scrolled ? "border-gov-border bg-white shadow-sm" : "border-transparent bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gov-border bg-white">
              <Shield className="h-5 w-5 text-gov-navy" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Ahmedabad Police</div>
              <div className="text-sm font-semibold text-gov-navy">Crime Intelligence Command Center</div>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#pillars" className="text-sm text-gov-charcoal/80 hover:text-gov-navy font-bold">Capabilities</a>
            <a href="#workflow" className="text-sm text-gov-charcoal/80 hover:text-gov-navy font-bold">Workflow</a>
            <a href="#dashboard" className="text-sm text-gov-charcoal/80 hover:text-gov-navy font-bold">Dashboard</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setStarting(true)}
              className="rounded-full bg-gov-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gov-navy/90"
            >
              Open Command Center
            </button>
          </div>

          <button className="md:hidden text-gov-charcoal" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-gov-border bg-white px-6 py-4 shadow-sm md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#pillars" className="text-sm text-gov-charcoal/80 font-bold">Capabilities</a>
              <a href="#workflow" className="text-sm text-gov-charcoal/80 font-bold">Workflow</a>
              <a href="#dashboard" className="text-sm text-gov-charcoal/80 font-bold">Dashboard</a>
              <button
                onClick={() => setStarting(true)}
                className="mt-2 rounded-xl bg-gov-navy px-4 py-2.5 text-sm font-semibold text-white"
              >
                Open Command Center
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="max-w-2xl">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border border-gov-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gov-navy shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-gov-red" />
                GIS-enabled policing platform
              </div>
            </FadeIn>

            <FadeIn delay={0.08} className="mt-6">
              <h1 className="text-4xl font-extrabold tracking-tight text-gov-navy md:text-6xl">
                Crime hotspot mapping and patrol routing for modern police operations
              </h1>
            </FadeIn>

            <FadeIn delay={0.16} className="mt-6">
              <p className="text-lg font-serif leading-8 text-gov-charcoal md:text-xl">
                A unified Ahmedabad police workspace for incident ingestion, GIS visualization,
                hotspot prediction, route planning, and real-time operational alerts.
              </p>
            </FadeIn>

            <FadeIn delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStarting(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gov-navy px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gov-navy/90"
              >
                Launch Dashboard <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#pillars"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gov-border bg-white px-6 py-3.5 text-sm font-semibold text-gov-navy transition hover:bg-gov-gray"
              >
                View Capabilities <ChevronRight className="h-4 w-4" />
              </a>
            </FadeIn>

            <FadeIn delay={0.3} className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((stat) => (
                <React.Fragment key={stat.label}>
                  <StatCard value={stat.value} label={stat.label} sublabel="Operational live data" />
                </React.Fragment>
              ))}
            </FadeIn>
          </div>

          <FadeIn delay={0.12}>
            <div className="rounded-[2rem] border border-gov-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-gov-border pb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Command Preview</div>
                  <div className="mt-1 text-base font-semibold text-gov-navy">Ahmedabad Police Operations</div>
                </div>
                <div className="rounded-full border border-gov-border bg-gov-gray px-3 py-1 text-[11px] font-semibold text-green-600">
                  Secure link active
                </div>
              </div>

              {starting ? (
                <div className="py-10">
                  <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-gov-charcoal/60">
                    <span>{stage || "Preparing command session"}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gov-gray">
                    <div className="h-full rounded-full bg-gov-red transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 text-sm text-gov-charcoal font-serif">
                    Loading crime data, risk indicators, and patrol resources.
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-gov-border bg-gov-gray p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gov-navy">
                      <MapPinned className="h-4 w-4 text-gov-navy" />
                      Live GIS view
                    </div>
                    <div className="mt-3 h-36 rounded-xl border border-gov-border bg-white" />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gov-border bg-gov-gray p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Active incidents</div>
                      <div className="mt-2 text-3xl font-extrabold text-gov-navy">18</div>
                    </div>
                    <div className="rounded-2xl border border-gov-border bg-gov-gray p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Highest risk zone</div>
                      <div className="mt-2 text-lg font-semibold text-gov-navy">Vastrapur</div>
                      <div className="mt-1 text-sm text-gov-charcoal">High severity trend detected</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        </section>

        <section id="pillars" className="mx-auto max-w-7xl px-6 py-8 lg:py-16">
          <FadeIn className="mb-8 max-w-2xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Core capabilities</div>
            <h2 className="mt-3 text-2xl font-bold text-gov-navy md:text-4xl">Built for police supervisors and field operations</h2>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <React.Fragment key={pillar.title}>
                  <FadeIn delay={index * 0.08}>
                    <div className="h-full rounded-3xl border border-gov-border bg-white p-6 shadow-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gov-border bg-gov-gray text-gov-navy">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-gov-navy">{pillar.title}</h3>
                      <p className="mt-3 text-sm font-serif leading-7 text-gov-charcoal/80">{pillar.description}</p>
                    </div>
                  </FadeIn>
                </React.Fragment>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-6 py-8 lg:py-16">
          <FadeIn className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-gov-border bg-white p-8 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Decision workflow</div>
              <h2 className="mt-3 text-2xl font-bold text-gov-navy md:text-3xl">From data capture to patrol deployment</h2>
              <p className="mt-4 text-sm font-serif leading-7 text-gov-charcoal/80">
                The system is designed to support the full operational chain: ingest incident data,
                normalize and map it, predict risk, recommend patrols, and keep supervisors informed in real time.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-2xl border border-gov-border bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-navy">Step {index + 1}</div>
                  <div className="mt-3 text-base font-semibold text-gov-charcoal">{step}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        <section id="dashboard" className="mx-auto max-w-7xl px-6 py-10 lg:py-16">
          <FadeIn className="rounded-[2rem] border border-gov-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gov-border pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Dashboard preview</div>
                <h2 className="mt-2 text-2xl font-bold text-gov-navy">Command-center layout for operations and analytics</h2>
              </div>
              <button
                onClick={() => setStarting(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gov-border bg-gov-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-gov-navy/90"
              >
                Open live workspace <Activity className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="rounded-2xl border border-gov-border bg-gov-gray p-5 lg:col-span-4">
                <div className="text-xs font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Today</div>
                <div className="mt-3 text-3xl font-extrabold text-gov-navy">42 incidents</div>
                <div className="mt-2 text-sm text-gov-charcoal/80">8 high risk alerts, 14 patrol updates.</div>
              </div>
              <div className="rounded-2xl border border-gov-border bg-gov-gray p-5 lg:col-span-4">
                <div className="text-xs font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Deployments</div>
                <div className="mt-3 text-3xl font-extrabold text-gov-navy">12 units</div>
                <div className="mt-2 text-sm text-gov-charcoal/80">Patrol coverage centered on high-risk areas.</div>
              </div>
              <div className="rounded-2xl border border-gov-border bg-gov-gray p-5 lg:col-span-4">
                <div className="text-xs font-bold uppercase tracking-[0.28em] text-gov-charcoal/60">Signal</div>
                <div className="mt-3 text-3xl font-extrabold text-gov-navy">Operational</div>
                <div className="mt-2 text-sm text-gov-charcoal/80">Secure system link, live data, audit trail enabled.</div>
              </div>
            </div>
          </FadeIn>
        </section>
      </main>
    </div>
  );
}
