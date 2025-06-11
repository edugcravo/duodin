import React, { useState, useEffect } from 'react';
import './Calendar.css';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_VISIBLE_EVENTS = 3;

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('coupleCalendarEvents');
    return saved ? JSON.parse(saved) : [];
  });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ date: '', title: '', startTime: '09:00', endTime: '10:00' });

  useEffect(() => {
    localStorage.setItem('coupleCalendarEvents', JSON.stringify(events));
  }, [events]);

  // Date helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const startOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = startOfMonth.getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openModal = day => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setFormData({ date: `${year}-${mm}-${dd}`, title: '', startTime: '09:00', endTime: '10:00' });
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);
  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const saveEvent = e => {
    e.preventDefault();
    setEvents(prev => [...prev, { id: crypto.randomUUID(), ...formData }]);
    closeModal();
  };
  const deleteEvent = id => setEvents(prev => prev.filter(ev => ev.id !== id));

  // Render cell events with limit and "+N" indicator
  const renderEvents = day => {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayEvents = events
      .filter(ev => ev.date === key)
      .sort((a,b) => a.startTime.localeCompare(b.startTime));

    const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
    const extraCount = dayEvents.length - MAX_VISIBLE_EVENTS;

    return (
      <>
        {visible.map(ev => (
          <div key={ev.id} className="event-item">
            <span className="event-time">{ev.startTime}</span>
            <span className="event-title">{ev.title}</span>
            <button onClick={() => deleteEvent(ev.id)} className="event-delete">×</button>
          </div>
        ))}
        {extraCount > 0 && (
          <div className="more-events">+{extraCount} mais</div>
        )}
      </>
    );
  };

  // Build grid cells
  const renderDays = () => {
    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push(<div key={`blank-${i}`} className="day blank" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      cells.push(
        <div key={d} className={`day${isToday ? ' today' : ''}`} onClick={() => openModal(d)}>
          <div className="day-header">
            <span className="date-number">{d}</span>
          </div>
          <div className="events-container">
            {renderEvents(d)}
          </div>
        </div>
      );
    }
    return cells;
  };

  // Sidebar upcoming
  const upcoming = [...events]
    .sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  return (
    <div className="calendar-wrapper">
      <div className="calendar-container">
        <header className="calendar-header">
          <button onClick={prevMonth} className="nav-btn">«</button>
          <h2>{currentDate.toLocaleString('pt-BR',{month:'long', year:'numeric'})}</h2>
          <button onClick={nextMonth} className="nav-btn">»</button>
        </header>

        <div className="weekdays">{DAYS_OF_WEEK.map(d => <div key={d} className="weekday">{d}</div>)}</div>
        <div className="days-grid">{renderDays()}</div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>⚠️ Planeje sua Tragédia - {formData.date}</h3>
              <form onSubmit={saveEvent} className="event-form">
                <label>Título:
                  <input type="text" name="title" value={formData.title} onChange={handleFormChange} required />
                </label>
                <div className="time-range">
                  <label>Início:
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleFormChange} required />
                  </label>
                  <label>Fim:
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleFormChange} required />
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-save">Salvar</button>
                  <button onClick={closeModal} type="button" className="btn-cancel">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <aside className="events-sidebar">
        <h3>Próximas Tragédias</h3>
        {upcoming.length ? upcoming.map(ev => (
          <div key={ev.id} className="upcoming-item">
            <div><strong>{ev.date}</strong> às <strong>{ev.startTime}</strong></div>
            <div className="upcoming-title">{ev.title}</div>
          </div>
        )) : <p>Nenhuma calamidade programada.</p>}
      </aside>
    </div>
  );
}
