import { useCallback, useEffect, useState } from 'react';
import type { AppointmentStatus, AppointmentView, CalendarQuery } from '@scheduler/contracts';
import { type Catalog, httpSchedulingApi, type SchedulingApi } from './api';
import { AppointmentDialog } from './appointment-dialog';
import { AssistantPanel } from './assistant-panel';
import { CalendarGrid } from './calendar-grid';
import { CreateAppointmentDialog } from './create-appointment-dialog';
import './scheduling.css';

const WEEK = { from: '2026-08-24T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z' };

export function AdminWorkspace({ api = httpSchedulingApi }: { api?: SchedulingApi }) {
  const [catalog, setCatalog] = useState<Catalog>({ clinics: [], doctors: [], appointmentTypes: [] });
  const [appointments, setAppointments] = useState<AppointmentView[]>([]);
  const [filters, setFilters] = useState<Omit<CalendarQuery, 'from'|'to'>>({});
  const [selected, setSelected] = useState<AppointmentView>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setAppointments(await api.listCalendar({ ...WEEK, ...filters })); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load calendar'); }
  }, [api, filters]);
  useEffect(() => { void api.getCatalog().then(setCatalog); }, [api]);
  useEffect(() => { void load(); }, [load]);
  const updateFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value || undefined }));
  return <main className="workspace-shell">
    <header className="topbar"><div className="brand-mark">A</div><div><p className="eyebrow">Agno Health</p><h1>Appointment operations</h1></div><div className="admin-badge"><span>SA</span><div><b>Development Admin</b><small>Seeded workspace</small></div></div></header>
    <div className="workspace">
      <aside className="filter-rail"><p className="eyebrow">Calendar controls</p><h2>Schedule</h2><button className="primary full" onClick={() => setCreating(true)}>＋ New request</button>
        <label>Clinic<select aria-label="Clinic" value={filters.clinicId ?? ''} onChange={(event) => updateFilter('clinicId', event.target.value)}><option value="">All clinics</option>{catalog.clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Specialty<select aria-label="Specialty" value={filters.specialty ?? ''} onChange={(event) => updateFilter('specialty', event.target.value)}><option value="">All specialties</option>{[...new Set(catalog.doctors.map((item) => item.specialty))].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Doctor<select aria-label="Doctor" value={filters.doctorId ?? ''} onChange={(event) => updateFilter('doctorId', event.target.value)}><option value="">All doctors</option>{catalog.doctors.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        <label>Status<select aria-label="Status" value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value as AppointmentStatus)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <div className="legend"><span><i className="scheduled-dot"/>Scheduled</span><span><i className="completed-dot"/>Completed</span></div>
      </aside>
      <section className="calendar-panel"><div className="calendar-toolbar"><div><p className="eyebrow">Week view</p><h2>August 24–28, 2026</h2></div><div className="week-actions"><button aria-label="Previous week">‹</button><button>Today</button><button aria-label="Next week">›</button></div></div>{error && <p role="alert" className="error">{error}</p>}<CalendarGrid appointments={appointments} onSelect={setSelected}/></section>
      <AssistantPanel />
    </div>
    {selected && <AppointmentDialog appointment={selected} onClose={() => setSelected(undefined)} onCancel={async (reason) => { await api.cancelAppointment(selected.id, { reason, observedVersion: selected.version, idempotencyKey: crypto.randomUUID() }); setSelected(undefined); await load(); }} onReschedule={async (startAt) => { await api.rescheduleAppointment(selected.id, { startAt, observedVersion: selected.version, idempotencyKey: crypto.randomUUID() }); setSelected(undefined); await load(); }}/>} 
    {creating && <CreateAppointmentDialog api={api} catalog={catalog} onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await load(); }} />}
  </main>;
}
