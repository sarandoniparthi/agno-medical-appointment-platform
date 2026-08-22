import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AppointmentView } from '@scheduler/contracts';
import { AdminWorkspace } from './admin-workspace';
import type { SchedulingApi } from './api';

const appointment: AppointmentView = {
  id: 'appointment-1', organizationId: 'org-1', patientId: 'patient-1',
  patientDisplayName: 'Maya Carter', doctorId: 'doctor-1',
  doctorDisplayName: 'Dr. Avery Shah', clinicId: 'clinic-1', clinicName: 'North Loop Clinic',
  clinicTimezone: 'America/Chicago', appointmentTypeId: 'type-1',
  appointmentTypeName: 'Follow-up', startAt: '2026-08-24T14:00:00.000Z',
  endAt: '2026-08-24T14:30:00.000Z', status: 'scheduled', version: 1,
};

function api(): SchedulingApi {
  return {
    listCalendar: vi.fn().mockResolvedValue([appointment]),
    getCatalog: vi.fn().mockResolvedValue({
      clinics: [{ id: 'clinic-1', name: 'North Loop Clinic', timezone: 'America/Chicago', address: 'Demo' }],
      doctors: [{ id: 'doctor-1', displayName: 'Dr. Avery Shah', specialty: 'Cardiology' }],
      appointmentTypes: [{ id: 'type-1', name: 'Follow-up', durationMinutes: 30 }],
    }),
    searchPatients: vi.fn().mockResolvedValue([{ id: 'patient-1', schedulingCode: 'PT-1001', displayName: 'Maya Carter' }]),
    createAppointment: vi.fn().mockResolvedValue({ appointment, replayed: false }),
    rescheduleAppointment: vi.fn().mockResolvedValue({ appointment, replayed: false }),
    cancelAppointment: vi.fn().mockResolvedValue({ appointment: { ...appointment, status: 'cancelled' }, replayed: false }),
    startWorkflow: vi.fn(),
    getWorkflow: vi.fn().mockRejectedValue(new Error('not found')),
    respondToWorkflow: vi.fn(),
  };
}

describe('AdminWorkspace', () => {
  beforeEach(() => localStorage.clear());
  it('loads a real calendar and refreshes it when filters change', async () => {
    const schedulingApi = api();
    render(<AdminWorkspace api={schedulingApi} />);

    expect(await screen.findByText('Maya Carter')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Clinic'), { target: { value: 'clinic-1' } });

    await waitFor(() => expect(schedulingApi.listCalendar).toHaveBeenCalledTimes(2));
    expect(vi.mocked(schedulingApi.listCalendar).mock.calls[1][0]).toMatchObject({ clinicId: 'clinic-1' });
  });

  it('cancels a selected appointment with a reason and refreshes the week', async () => {
    const schedulingApi = api();
    render(<AdminWorkspace api={schedulingApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /Maya Carter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));
    fireEvent.change(screen.getByLabelText('Cancellation reason'), { target: { value: 'Patient request' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    await waitFor(() => expect(schedulingApi.cancelAppointment).toHaveBeenCalledWith(
      'appointment-1', expect.objectContaining({ reason: 'Patient request', observedVersion: 1 }),
    ));
    expect(schedulingApi.listCalendar).toHaveBeenCalledTimes(2);
  });

  it('creates a direct appointment from the new request form', async () => {
    const schedulingApi = api();
    render(<AdminWorkspace api={schedulingApi} />);

    fireEvent.click(screen.getByRole('button', { name: /New request/ }));
    expect(await screen.findByRole('dialog', { name: 'New appointment' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '2026-08-25T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create appointment' }));

    await waitFor(() => expect(schedulingApi.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1', doctorId: 'doctor-1', clinicId: 'clinic-1',
        appointmentTypeId: 'type-1', startAt: '2026-08-25T15:00:00.000Z',
      }),
    ));
  });

  it('starts an agent workflow and requires approval before the appointment mutation', async () => {
    const schedulingApi = api();
    vi.mocked(schedulingApi.startWorkflow).mockResolvedValue({
      run_id: 'run-1', action: 'create', status: 'approval_required', context: {},
      requirement: { id: 'approval-1', status: 'pending', expires_at: '2026-08-22T21:00:00Z' },
      candidates: [{ id: 'slot-1', doctor_display_name: 'Dr. Avery Shah', clinic_name: 'North Loop Clinic', start_at: '2026-08-25T15:00:00Z', end_at: '2026-08-25T15:30:00Z', explanation: 'Conflict-free opening', availability_score: 50, preference_score: 30, continuity_score: 20 }],
    });
    vi.mocked(schedulingApi.respondToWorkflow).mockResolvedValue({
      run_id: 'run-1', action: 'create', status: 'completed', context: { appointment }, candidates: [],
    });
    render(<AdminWorkspace api={schedulingApi} />);

    fireEvent.change(screen.getByPlaceholderText(/Schedule Maya/), { target: { value: 'Schedule Maya with cardiology next week' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask agent' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve this slot' }));

    await waitFor(() => expect(schedulingApi.respondToWorkflow).toHaveBeenCalledWith(
      'run-1', 'approve', { candidate_id: 'slot-1' },
    ));
    expect(await screen.findByText('Appointment updated successfully.')).toBeTruthy();
  });
});
