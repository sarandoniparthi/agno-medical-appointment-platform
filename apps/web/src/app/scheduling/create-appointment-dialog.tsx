import { useEffect, useState } from 'react';
import type { Catalog, PatientOption, SchedulingApi } from './api';

export function CreateAppointmentDialog({ api, catalog, onClose, onCreated }: {
  api: SchedulingApi; catalog: Catalog; onClose: () => void; onCreated: () => Promise<void>;
}) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState(catalog.doctors[0]?.id ?? '');
  const [clinicId, setClinicId] = useState(catalog.clinics[0]?.id ?? '');
  const [appointmentTypeId, setAppointmentTypeId] = useState(catalog.appointmentTypes[0]?.id ?? '');
  const [startAt, setStartAt] = useState('2026-08-25T10:00');
  useEffect(() => { void api.searchPatients('').then((items) => { setPatients(items); setPatientId(items[0]?.id ?? ''); }); }, [api]);
  return <div className="dialog-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-label="New appointment">
    <button className="dialog-close" aria-label="Close" onClick={onClose}>×</button><p className="eyebrow">Direct scheduling</p><h2>New appointment</h2>
    <form onSubmit={(event) => { event.preventDefault(); void api.createAppointment({ patientId, doctorId: doctorId || catalog.doctors[0]?.id || '', clinicId: clinicId || catalog.clinics[0]?.id || '', appointmentTypeId: appointmentTypeId || catalog.appointmentTypes[0]?.id || '', startAt: new Date(startAt).toISOString(), idempotencyKey: crypto.randomUUID() }).then(onCreated); }}>
      <label>Patient<select aria-label="Patient" required value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.schedulingCode}</option>)}</select></label>
      <label>Doctor<select aria-label="Appointment doctor" required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>{catalog.doctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
      <label>Clinic<select aria-label="Appointment clinic" required value={clinicId} onChange={(event) => setClinicId(event.target.value)}>{catalog.clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Appointment type<select aria-label="Appointment type" required value={appointmentTypeId} onChange={(event) => setAppointmentTypeId(event.target.value)}>{catalog.appointmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Start time<input aria-label="Start time" type="datetime-local" required value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
      <div className="dialog-actions"><button className="primary" type="submit" disabled={!patientId}>Create appointment</button></div>
    </form>
  </section></div>;
}
