import type { AppointmentView } from '@scheduler/contracts';

export function CalendarGrid({ appointments, onSelect }: {
  appointments: AppointmentView[];
  onSelect: (appointment: AppointmentView) => void;
}) {
  const days = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date('2026-08-24T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + offset);
    return date;
  });
  return (
    <section className="calendar" aria-label="Appointment calendar">
      {days.map((day) => {
        const key = day.toISOString().slice(0, 10);
        const matches = appointments.filter((item) => item.startAt.slice(0, 10) === key);
        return <article className="calendar-day" key={key}>
          <header><strong>{day.toLocaleDateString('en-US', { weekday: 'short' })}</strong><span>{day.getUTCDate()}</span></header>
          <div className="day-slots">
            {matches.map((item) => <button className={`appointment appointment-${item.status}`} key={item.id} onClick={() => onSelect(item)} aria-label={`${item.patientDisplayName}, ${item.appointmentTypeName}`}>
              <time>{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: item.clinicTimezone }).format(new Date(item.startAt))}</time>
              <b>{item.patientDisplayName}</b><span>{item.doctorDisplayName}</span>
            </button>)}
            {matches.length === 0 && <span className="open-day">Open availability</span>}
          </div>
        </article>;
      })}
    </section>
  );
}
