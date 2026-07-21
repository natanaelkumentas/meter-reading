'use client';

import React, { useState, useEffect } from 'react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // Format: YYYY/MM/DD or empty
  onSelectDate: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: CalendarModalProps) {
  const [viewDate, setViewDate] = useState<Date>(new Date());

  // Initialize view date based on selectedDate prop or current date
  useEffect(() => {
    if (selectedDate && /^\d{4}\/\d{2}\/\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('/');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      setViewDate(new Date(y, m, d));
    } else {
      setViewDate(new Date());
    }
  }, [selectedDate, isOpen]);

  if (!isOpen) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${currentYear}/${mm}/${dd}`;
    onSelectDate(formatted);
    onClose();
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate || !/^\d{4}\/\d{2}\/\d{2}$/.test(selectedDate)) return false;
    const parts = selectedDate.split('/');
    return (
      parseInt(parts[0], 10) === currentYear &&
      parseInt(parts[1], 10) - 1 === currentMonth &&
      parseInt(parts[2], 10) === day
    );
  };

  // Generate blank offset slots for previous month padding
  const blanks = Array.from({ length: firstDayOfWeek });
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing when clicking inside modal
      >
        {/* Header with Month/Year Navigation */}
        <div className="calendar-header">
          <button type="button" className="cal-nav-btn" onClick={handlePrevMonth} title="Previous Month">
            &larr;
          </button>
          <div className="cal-title">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </div>
          <button type="button" className="cal-nav-btn" onClick={handleNextMonth} title="Next Month">
            &rarr;
          </button>
        </div>

        {/* Weekdays Row */}
        <div className="calendar-grid">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="calendar-day-head">
              {wd}
            </div>
          ))}

          {/* Empty offset slots */}
          {blanks.map((_, idx) => (
            <div key={`blank-${idx}`} />
          ))}

          {/* Day number buttons */}
          {dayNumbers.map((day) => {
            const selectedClass = isSelected(day) ? 'selected' : '';
            const todayClass = isToday(day) ? 'today' : '';
            return (
              <button
                key={day}
                type="button"
                className={`calendar-day-btn ${selectedClass} ${todayClass}`}
                onClick={() => handleSelectDay(day)}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Footer controls */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="cal-today-btn"
            onClick={() => {
              const now = new Date();
              const yyyy = now.getFullYear();
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const dd = String(now.getDate()).padStart(2, '0');
              onSelectDate(`${yyyy}/${mm}/${dd}`);
              onClose();
            }}
          >
            Select Today
          </button>
          <button type="button" className="cal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
