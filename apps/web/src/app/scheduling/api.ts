import type {
  AppointmentMutationResult,
  AppointmentView,
  CalendarQuery,
  CancelAppointmentCommand,
  CreateAppointmentCommand,
  RescheduleAppointmentCommand,
} from '@scheduler/contracts';

export interface Catalog {
  clinics: Array<{ id: string; name: string; timezone: string; address: string }>;
  doctors: Array<{ id: string; displayName: string; specialty: string }>;
  appointmentTypes: Array<{ id: string; name: string; durationMinutes: number }>;
}

export interface PatientOption { id: string; schedulingCode: string; displayName: string }

export interface SchedulingApi {
  listCalendar(query: CalendarQuery): Promise<AppointmentView[]>;
  getCatalog(): Promise<Catalog>;
  searchPatients(query: string): Promise<PatientOption[]>;
  createAppointment(command: CreateAppointmentCommand): Promise<AppointmentMutationResult>;
  rescheduleAppointment(id: string, command: Omit<RescheduleAppointmentCommand, 'appointmentId'>): Promise<AppointmentMutationResult>;
  cancelAppointment(id: string, command: Omit<CancelAppointmentCommand, 'appointmentId'>): Promise<AppointmentMutationResult>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-correlation-id': crypto.randomUUID(), ...init?.headers },
  });
  if (!response.ok) throw new Error((await response.text()) || `Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const httpSchedulingApi: SchedulingApi = {
  listCalendar(query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => value && params.set(key, String(value)));
    return request(`/calendar?${params}`);
  },
  getCatalog: () => request('/catalog'),
  searchPatients: (query) => request(`/patients?query=${encodeURIComponent(query)}`),
  createAppointment: (command) => request('/appointments', { method: 'POST', body: JSON.stringify(command) }),
  rescheduleAppointment: (id, command) => request(`/appointments/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(command) }),
  cancelAppointment: (id, command) => request(`/appointments/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(command) }),
};
