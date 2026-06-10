/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Clock3, Filter, RefreshCw, FileClock, ChevronRight } from "lucide-react";
import { fetchAuditLogs } from "../api/apiClient";
import { AuditLogEntry } from "../types";

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((log) => log.action.startsWith(filter));
  }, [logs, filter]);

  const metrics = useMemo(() => {
    const byAction = logs.reduce<Record<string, number>>((acc, log) => {
      const actionRoot = log.action.split(".")[0];
      acc[actionRoot] = (acc[actionRoot] || 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.length,
      crime: byAction.crime || 0,
      route: byAction.route || 0,
      other: Math.max(0, logs.length - (byAction.crime || 0) - (byAction.route || 0)),
    };
  }, [logs]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-blue-500 font-semibold mb-1">Operations History</div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AUDIT LOGS</h2>
        </div>
        <button
          onClick={loadLogs}
          className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs font-mono text-slate-200 hover:border-blue-500/40 hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">Total Entries</div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{metrics.total}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">Crime Events</div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{metrics.crime}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">Route Events</div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{metrics.route}</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">Other</div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{metrics.other}</div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-xs uppercase tracking-widest font-mono text-slate-400">Filter Stream</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "crime", "route", "alert"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border transition-colors ${
                  filter === item
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {visibleLogs.length === 0 ? (
            <div className="text-center py-14 text-sm font-mono text-slate-500">
              {isLoading ? "Loading audit trail..." : "No audit records match this filter."}
            </div>
          ) : (
            visibleLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <FileClock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white font-mono">{log.action}</span>
                        <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {log.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{log.resource}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-2 flex items-center gap-2">
                        <Clock3 className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <span>{log.user_id || "system"}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                </div>

                {log.changes && (
                  <pre className="mt-4 text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
