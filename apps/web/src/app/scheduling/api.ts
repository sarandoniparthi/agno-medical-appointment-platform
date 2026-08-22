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
export interface AgentCandidate { id: string; doctor_display_name: string; clinic_name: string; start_at: string; end_at: string; explanation: string; availability_score: number; preference_score: number; continuity_score: number }
export interface AgentWorkflow { run_id: string; action?: 'create'|'reschedule'|'cancel'; status: 'running'|'input_required'|'approval_required'|'approved'|'completed'|'rejected'|'failed'; candidates: AgentCandidate[]; context: Record<string, unknown>; requirement?: { id: string; status: string; expires_at: string } }

export interface SchedulingApi {
  listCalendar(query: CalendarQuery): Promise<AppointmentView[]>;
  getCatalog(): Promise<Catalog>;
  searchPatients(query: string): Promise<PatientOption[]>;
  createAppointment(command: CreateAppointmentCommand): Promise<AppointmentMutationResult>;
  rescheduleAppointment(id: string, command: Omit<RescheduleAppointmentCommand, 'appointmentId'>): Promise<AppointmentMutationResult>;
  cancelAppointment(id: string, command: Omit<CancelAppointmentCommand, 'appointmentId'>): Promise<AppointmentMutationResult>;
  startWorkflow(request: string): Promise<AgentWorkflow>;
  getWorkflow(runId: string): Promise<AgentWorkflow>;
  respondToWorkflow(runId: string, response: 'approve'|'reject'|'edit'|'find_more', payload?: Record<string, unknown>): Promise<AgentWorkflow>;
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
  startWorkflow: (workflowRequest) => request('/workflows', { method: 'POST', body: JSON.stringify({ request: workflowRequest }) }),
  getWorkflow: (runId) => request(`/workflows/${runId}`),
  respondToWorkflow: (runId, response, payload = {}) => request(`/workflows/${runId}/responses`, { method: 'POST', body: JSON.stringify({ response, payload }) }),
};
