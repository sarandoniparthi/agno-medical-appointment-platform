import { useState } from 'react';
import type { AppointmentView } from '@scheduler/contracts';

export function AppointmentDialog({ appointment, onClose, onCancel, onReschedule }: {
  appointment: AppointmentView;
  onClose: () => void;
  onCancel: (reason: string) => Promise<void>;
  onReschedule: (startAt: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'details'|'cancel'|'reschedule'>('details');
  const [reason, setReason] = useState('');
  const [startAt, setStartAt] = useState(appointment.startAt.slice(0, 16));
  return <div className="dialog-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-title">
    <button className="dialog-close" aria-label="Close" onClick={onClose}>×</button>
    <p className="eyebrow">Appointment</p><h2 id="appointment-title">{appointment.patientDisplayName}</h2>
    <dl><div><dt>Doctor</dt><dd>{appointment.doctorDisplayName}</dd></div><div><dt>Clinic</dt><dd>{appointment.clinicName}</dd></div><div><dt>Type</dt><dd>{appointment.appointmentTypeName}</dd></div></dl>
    {mode === 'details' && <div className="dialog-actions"><button onClick={() => setMode('reschedule')}>Reschedule</button><button className="danger" onClick={() => setMode('cancel')}>Cancel appointment</button></div>}
    {mode === 'cancel' && <form onSubmit={(event) => { event.preventDefault(); void onCancel(reason); }}><label>Cancellation reason<textarea aria-label="Cancellation reason" required value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="danger" type="submit">Confirm cancellation</button></form>}
    {mode === 'reschedule' && <form onSubmit={(event) => { event.preventDefault(); void onReschedule(new Date(startAt).toISOString()); }}><label>New date and time<input aria-label="New date and time" type="datetime-local" required value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><button type="submit">Confirm reschedule</button></form>}
  </section></div>;
}
