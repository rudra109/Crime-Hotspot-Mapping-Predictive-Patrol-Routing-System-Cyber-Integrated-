import { pollFIRs } from '../connectors/firConnector';
import { pollComplaints } from '../connectors/complaintConnector';
import { pollPatrolLogs } from '../connectors/patrolConnector';
import { evaluateIncidentForAlert } from '../alert-service';
import { broadcastEvent } from '../../realtime/socket';

let running = false;

export async function runIngestionCycle() {
  if (running) return;
  running = true;
  try {
    const [firs, complaints, patrols] = await Promise.all([
      pollFIRs(), pollComplaints(), pollPatrolLogs()
    ]);

    const all = [...(firs || []), ...(complaints || []), ...(patrols || [])];
    for (const inc of all) {
      // Evaluate for alert and broadcast incident
      const alert = evaluateIncidentForAlert(inc);
      broadcastEvent('incident:new', inc);
      if (alert) {
        // already broadcast inside evaluateIncidentForAlert
      }
    }
  } catch (e) {
    console.error('Ingestion cycle failed', e);
  } finally {
    running = false;
  }
}

export function startScheduler(intervalMs = 30_000) {
  // initial run
  runIngestionCycle();
  setInterval(() => runIngestionCycle(), intervalMs);
}
