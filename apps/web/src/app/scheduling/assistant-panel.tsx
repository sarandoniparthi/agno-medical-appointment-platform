import { useEffect, useState } from 'react';
import type { AgentWorkflow, SchedulingApi } from './api';

export function AssistantPanel({ api, onCompleted }: { api: SchedulingApi; onCompleted: () => Promise<void> }) {
  const [request, setRequest] = useState('');
  const [workflow, setWorkflow] = useState<AgentWorkflow>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const runId = localStorage.getItem('scheduling-workflow-run');
    if (runId) void api.getWorkflow(runId).then(setWorkflow).catch(() => localStorage.removeItem('scheduling-workflow-run'));
  }, [api]);
  useEffect(() => {
    if (!workflow || !['running', 'approved'].includes(workflow.status)) return;
    const timer = window.setInterval(() => void api.getWorkflow(workflow.run_id).then(setWorkflow), 2000);
    return () => window.clearInterval(timer);
  }, [api, workflow]);
  const start = async () => {
    if (!request.trim()) return;
    setBusy(true); setError('');
    try { const value = await api.startWorkflow(request); setWorkflow(value); localStorage.setItem('scheduling-workflow-run', value.run_id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Agent request failed'); }
    finally { setBusy(false); }
  };
  const respond = async (response: 'approve'|'reject'|'find_more', candidateId?: string) => {
    if (!workflow) return;
    setBusy(true); setError('');
    try {
      const value = await api.respondToWorkflow(workflow.run_id, response, candidateId ? { candidate_id: candidateId } : {});
      setWorkflow(value);
      if (value.status === 'completed') await onCompleted();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Workflow response failed'); }
    finally { setBusy(false); }
  };
  return <aside className="assistant-panel" aria-label="Scheduling assistant">
    <div className="assistant-heading"><span className="agent-dot"/><div><b>Scheduling agent</b><small>Approval-gated scheduling</small></div></div>
    {!workflow && <div className="assistant-empty"><span>✦</span><h2>Plan an appointment</h2><p>Ask to create, reschedule, or cancel. No change is made until you approve it.</p></div>}
    {workflow && <div className="agent-results"><p className="eyebrow">{workflow.action} · {workflow.status.replace('_', ' ')}</p>
      {workflow.candidates.map((candidate) => <article className="candidate" key={candidate.id}><b>{candidate.doctor_display_name}</b><span>{candidate.clinic_name}</span><time>{new Date(candidate.start_at).toLocaleString()}</time><small>{candidate.explanation}</small>{workflow.status === 'approval_required' && <button className="primary" disabled={busy} onClick={() => void respond('approve', candidate.id)}>Approve this slot</button>}</article>)}
      {workflow.action === 'cancel' && workflow.status === 'approval_required' && <button className="danger" disabled={busy} onClick={() => void respond('approve')}>Approve cancellation</button>}
      {workflow.status === 'approval_required' && <div className="agent-actions"><button disabled={busy} onClick={() => void respond('find_more')}>Find more</button><button disabled={busy} onClick={() => void respond('reject')}>Reject</button></div>}
      {workflow.status === 'completed' && <p className="success">Appointment updated successfully.</p>}
    </div>}
    {error && <p role="alert" className="error">{error}</p>}
    <label className="assistant-input">Request<textarea value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Schedule Maya with cardiology next week" /></label>
    <button className="primary full" disabled={busy || !request.trim()} onClick={() => void start()}>{busy ? 'Working…' : 'Ask agent'}</button>
  </aside>;
}
