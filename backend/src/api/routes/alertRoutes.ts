import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { evaluateIncidentForAlert } from '../../services/alert-service';
import { broadcastEvent } from '../../realtime/socket';

const router = Router();
const STORE = path.join(__dirname, '..', '..', 'data', 'alerts-store.json');

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf-8')); } catch { return []; }
}
function writeStore(data: any) { fs.writeFileSync(STORE, JSON.stringify(data, null, 2), 'utf-8'); }

router.get('/', (_req, res) => {
  const alerts = readStore();
  res.json({ alerts });
});

router.post('/ingest', (req, res) => {
  const payload = req.body;
  const alerts = readStore();
  const created = { id: `alert-${Date.now()}`, ...payload, timestamp: new Date().toISOString(), status: 'Pending' };
  alerts.unshift(created);
  writeStore(alerts);
  broadcastEvent('alert:new', created);
  res.status(201).json({ alert: created });
});

router.post('/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const { operatorId, operatorName, notes } = req.body;
  const alerts = readStore();
  const idx = alerts.findIndex((a: any) => a.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  alerts[idx].status = 'Acknowledged';
  alerts[idx].operatorId = operatorId;
  alerts[idx].operatorName = operatorName;
  alerts[idx].acknowledgedAt = new Date().toISOString();
  alerts[idx].notes = notes;
  writeStore(alerts);
  broadcastEvent('alert:update', alerts[idx]);
  res.json({ acknowledgment: alerts[idx] });
});

router.post('/:id/escalate', (req, res) => {
  const { id } = req.params;
  const { level, reason } = req.body;
  const alerts = readStore();
  const idx = alerts.findIndex((a: any) => a.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  alerts[idx].status = 'Escalated';
  alerts[idx].escalation = { level, reason, at: new Date().toISOString() };
  writeStore(alerts);
  broadcastEvent('alert:update', alerts[idx]);
  res.json({ alert: alerts[idx] });
});

router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  const alerts = readStore();
  const alert = alerts.find((a: any) => a.id === id);
  if (!alert) return res.status(404).json({ history: [] });
  // simple history stub
  res.json({ history: alert.history || [] });
});

router.post('/connectors/112', (req, res) => {
  // accept 112 emergency pushes
  const data = req.body;
  const alerts = readStore();
  const created = { id: `alert-112-${Date.now()}`, message: data.message || '112 Emergency', source: '112', timestamp: new Date().toISOString(), status: 'Pending' };
  alerts.unshift(created);
  writeStore(alerts);
  broadcastEvent('alert:new', created);
  res.status(201).json({ alert: created });
});

router.get('/connectors/112/logs', (_req, res) => {
  const data = readStore();
  const logs = data.filter((a: any) => a.source === '112');
  res.json({ logs });
});

export default router;
