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

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: CalendarModalProps) {
  // Step state: 'year' -> 'month' -> 'day'
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  
  const [chosenYear, setChosenYear] = useState<number>(new Date().getFullYear());
  const [chosenMonth, setChosenMonth] = useState<number>(new Date().getMonth());
  
  // Year grid pagination (shows 12 years per grid)
  const [decadeStart, setDecadeStart] = useState<number>(
    Math.floor(new Date().getFullYear() / 10) * 10 - 1
  );

  // Whenever modal opens, start at 'year' selection step
  useEffect(() => {
    if (isOpen) {
      setStep('year');
      if (selectedDate && /^\d{4}\/\d{2}\/\d{2}$/.test(selectedDate)) {
        const parts = selectedDate.split('/');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        setChosenYear(y);
        setChosenMonth(m);
        setDecadeStart(Math.floor(y / 10) * 10 - 1);
      } else {
        const now = new Date();
        setChosenYear(now.getFullYear());
        setChosenMonth(now.getMonth());
        setDecadeStart(Math.floor(now.getFullYear() / 10) * 10 - 1);
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  // 12-year window for Year Selection Grid
  const yearsGrid = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  // Days in month calculation for Step 3
  const daysInMonth = new Date(chosenYear, chosenMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(chosenYear, chosenMonth, 1).getDay();

  const handleSelectYear = (year: number) => {
    setChosenYear(year);
    setStep('month'); // Advance to Month Selection
  };

  const handleSelectMonth = (monthIndex: number) => {
    setChosenMonth(monthIndex);
    setStep('day'); // Advance to Date Selection
  };

  const handleSelectDay = (day: number) => {
    const mm = String(chosenMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${chosenYear}/${mm}/${dd}`;
    onSelectDate(formatted);
    onClose();
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === chosenYear &&
      today.getMonth() === chosenMonth &&
      today.getDate() === day
    );
  };

  const isDaySelected = (day: number) => {
    if (!selectedDate || !/^\d{4}\/\d{2}\/\d{2}$/.test(selectedDate)) return false;
    const parts = selectedDate.split('/');
    return (
      parseInt(parts[0], 10) === chosenYear &&
      parseInt(parts[1], 10) - 1 === chosenMonth &&
      parseInt(parts[2], 10) === day
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', fontSize: '0.8rem' }}>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              background: step === 'year' ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              color: step === 'year' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600
            }}
            onClick={() => setStep('year')}
          >
            1. Year {step !== 'year' ? `(${chosenYear})` : ''}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              cursor: step !== 'year' ? 'pointer' : 'not-allowed',
              background: step === 'month' ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              color: step === 'month' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600
            }}
            onClick={() => step !== 'year' && setStep('month')}
          >
            2. Month {step === 'day' ? `(${MONTH_SHORT_NAMES[chosenMonth]})` : ''}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              background: step === 'day' ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              color: step === 'day' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600
            }}
          >
            3. Date
          </span>
        </div>

        {/* STEP 1: YEAR SELECTION */}
        {step === 'year' && (
          <div>
            <div className="calendar-header">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setDecadeStart(decadeStart - 10)}
                title="Previous Decade"
              >
                &larr;
              </button>
              <div className="cal-title">
                Select Year ({decadeStart} - {decadeStart + 11})
              </div>
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setDecadeStart(decadeStart + 10)}
                title="Next Decade"
              >
                &rarr;
              </button>
            </div>

            <div className="cal-selection-grid">
              {yearsGrid.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`cal-selection-btn ${yr === chosenYear ? 'active' : ''}`}
                  onClick={() => handleSelectYear(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: MONTH SELECTION */}
        {step === 'month' && (
          <div>
            <div className="calendar-header">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setStep('year')}
                title="Back to Year Selection"
              >
                &larr;
              </button>
              <div className="cal-title">
                {chosenYear} - Select Month
              </div>
              <div style={{ width: '36px' }} /> {/* Spacer */}
            </div>

            <div className="cal-selection-grid">
              {MONTH_NAMES.map((monthName, idx) => (
                <button
                  key={monthName}
                  type="button"
                  className={`cal-selection-btn ${idx === chosenMonth ? 'active' : ''}`}
                  onClick={() => handleSelectMonth(idx)}
                >
                  {MONTH_SHORT_NAMES[idx]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: DATE SELECTION */}
        {step === 'day' && (
          <div>
            <div className="calendar-header">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setStep('month')}
                title="Back to Month Selection"
              >
                &larr;
              </button>
              <div
                className="cal-title"
                style={{ cursor: 'pointer' }}
                onClick={() => setStep('month')}
                title="Click to change month or year"
              >
                {MONTH_NAMES[chosenMonth]} {chosenYear}
              </div>
              <div style={{ width: '36px' }} />
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="calendar-day-head">
                  {wd}
                </div>
              ))}

              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`blank-${idx}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const selectedClass = isDaySelected(day) ? 'selected' : '';
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
          </div>
        )}

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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
