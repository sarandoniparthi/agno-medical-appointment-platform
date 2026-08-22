import { render } from '@testing-library/react';

import App from './app';
import type { SchedulingApi } from './scheduling/api';

const pending = new Promise<never>(() => undefined);
const api: SchedulingApi = {
  listCalendar: vi.fn(() => pending),
  getCatalog: vi.fn(() => pending),
  searchPatients: vi.fn().mockResolvedValue([]),
  createAppointment: vi.fn(),
  rescheduleAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
};

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App api={api} />);
    expect(baseElement).toBeTruthy();
  });

  it('shows the appointment operations workspace', () => {
    const { getByText } = render(<App api={api} />);
    expect(getByText('Appointment operations')).toBeTruthy();
  });
});
