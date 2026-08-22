export function AssistantPanel() {
  return <aside className="assistant-panel" aria-label="Scheduling assistant">
    <div className="assistant-heading"><span className="agent-dot"/><div><b>Scheduling agent</b><small>Ready for assisted scheduling</small></div></div>
    <div className="assistant-empty"><span>✦</span><h2>Plan an appointment</h2><p>Ask for a patient, specialty, clinic, or date. Candidate ranking and approval controls arrive in the next workflow milestone.</p></div>
    <label className="assistant-input">Request<textarea disabled placeholder="Schedule Maya with cardiology next week" /></label>
  </aside>;
}
