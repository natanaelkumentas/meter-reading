'use client';

import React, { useState, useRef, useTransition } from 'react';
import { addReading } from './actions';
import Link from 'next/link';
import CalendarModal from '@/components/CalendarModal';

export default function InputForm() {
  const [dateStr, setDateStr] = useState('');
  const [val5, setVal5] = useState('');
  const [val15, setVal15] = useState('');
  const [valNeg15, setValNeg15] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Status feedback state
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const [isPending, startTransition] = useTransition();
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Parse YYYY/MM/DD to check if it's a valid date
  const isValidDate = (str: string) => {
    const regex = /^\d{4}\/\d{2}\/\d{2}$/;
    if (!regex.test(str)) return false;

    const parts = str.split('/');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    );
  };

  // Convert Date object to YYYY/MM/DD
  const formatDateToSlash = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  // Set default date to today
  const setToday = () => {
    const today = new Date();
    setDateStr(formatDateToSlash(today));
    setStatus({ type: null, message: '' });
  };

  // Handles text input date change
  const handleDateTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Auto-insert slashes for easier typing
    value = value.replace(/[^0-9/]/g, ''); // Allow only digits and slashes
    if (value.length === 4 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 7 && value.split('/').length === 2) {
      value = value + '/';
    }
    
    // Cap length at 10 (yyyy/mm/dd)
    if (value.length <= 10) {
      setDateStr(value);
    }
  };

  // Trigger hidden calendar picker
  const handleCalendarClick = () => {
    if (hiddenDateInputRef.current) {
      try {
        hiddenDateInputRef.current.showPicker();
      } catch (err) {
        // Fallback for older browsers
        hiddenDateInputRef.current.click();
      }
    }
  };

  // Handle value selection from hidden calendar picker
  const handleHiddenDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value; // YYYY-MM-DD
    if (rawVal) {
      const parts = rawVal.split('-');
      const formatted = `${parts[0]}/${parts[1]}/${parts[2]}`;
      setDateStr(formatted);
      setStatus({ type: null, message: '' });
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    // Validate date format
    if (!isValidDate(dateStr)) {
      setStatus({
        type: 'error',
        message: 'Please enter a valid date in the format YYYY/MM/DD or use the calendar.',
      });
      return;
    }

    // Convert values
    const num5 = parseFloat(val5);
    const num15 = parseFloat(val15);
    const numNeg15 = parseFloat(valNeg15);

    if (isNaN(num5) || isNaN(num15) || isNaN(numNeg15)) {
      setStatus({
        type: 'error',
        message: 'All voltages must be valid numbers.',
      });
      return;
    }

    // Submitting through server action inside useTransition
    startTransition(async () => {
      // Reformat slash date to standard hyphen date for DB ingestion
      const dbDate = dateStr.replace(/\//g, '-');
      
      const res = await addReading({
        date: dbDate,
        val_plus_5: num5,
        val_plus_15: num15,
        val_minus_15: numNeg15,
      });

      if (res.success) {
        setStatus({
          type: 'success',
          message: 'Data successfully recorded and logged to Supabase!',
        });
        // Clear forms
        setDateStr('');
        setVal5('');
        setVal15('');
        setValNeg15('');
      } else {
        setStatus({
          type: 'error',
          message: res.error || 'Failed to submit telemetry data.',
        });
      }
    });
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Power Telemetry Input
        </h1>
        <p className="section-desc" style={{ margin: '0.5rem auto 0 auto' }}>
          Record daily power supply voltages (+5 VOLT SUPPLY, +15 VOLT SUPPLY, -15 VOLT SUPPLY) to database.
        </p>
      </div>

      <div className="card">
        <div className="form-title">
          <span>📝</span> New Telemetry Entry
        </div>

        {status.type === 'success' && (
          <div className="alert alert-success">
            <span style={{ fontSize: '1.2rem' }}>✓</span> {status.message}
          </div>
        )}

        {status.type === 'error' && (
          <div className="alert alert-error">
            <span style={{ fontSize: '1.2rem' }}>⚠️</span> {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            
            {/* Date Picker Input */}
            <div className="form-group full-width">
              <label htmlFor="date" className="form-label">
                Date Input
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  id="date"
                  className="input-control"
                  placeholder="YYYY/MM/DD"
                  value={dateStr}
                  onChange={handleDateTextChange}
                  disabled={isPending}
                  required
                />
                
                {/* Hidden Native Calendar Picker */}
                <input
                  type="date"
                  ref={hiddenDateInputRef}
                  onChange={handleHiddenDateChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className="btn"
                  style={{ width: 'auto', padding: '0 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                  title="Open Calendar Picker"
                  disabled={isPending}
                >
                  📅
                </button>

                <button
                  type="button"
                  onClick={setToday}
                  className="btn"
                  style={{ width: 'auto', padding: '0 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none', fontSize: '0.85rem' }}
                  disabled={isPending}
                >
                  Today
                </button>
              </div>
              <span className="helper-text">Format: YYYY/MM/DD or choose from calendar picker.</span>
            </div>

            {/* +5 VOLT SUPPLY Input */}
            <div className="form-group">
              <label htmlFor="val5" className="form-label">
                🔋 +5 VOLT SUPPLY (V)
              </label>
              <input
                type="number"
                id="val5"
                className="input-control"
                placeholder="e.g. 5.02"
                step="0.01"
                min="0"
                max="10"
                value={val5}
                onChange={(e) => setVal5(e.target.value)}
                disabled={isPending}
                required
              />
              <span className="helper-text">Nominal value: +5.00V</span>
            </div>

            {/* +15 VOLT SUPPLY Input */}
            <div className="form-group">
              <label htmlFor="val15" className="form-label">
                🔋 +15 VOLT SUPPLY (V)
              </label>
              <input
                type="number"
                id="val15"
                className="input-control"
                placeholder="e.g. 15.11"
                step="0.01"
                min="0"
                max="30"
                value={val15}
                onChange={(e) => setVal15(e.target.value)}
                disabled={isPending}
                required
              />
              <span className="helper-text">Nominal value: +15.00V</span>
            </div>

            {/* -15 VOLT SUPPLY Input */}
            <div className="form-group full-width">
              <label htmlFor="valNeg15" className="form-label">
                🔋 -15 VOLT SUPPLY (V)
              </label>
              <input
                type="number"
                id="valNeg15"
                className="input-control"
                placeholder="e.g. -14.98"
                step="0.01"
                min="-30"
                max="0"
                value={valNeg15}
                onChange={(e) => setValNeg15(e.target.value)}
                disabled={isPending}
                required
              />
              <span className="helper-text">Nominal value: -15.00V (negative value required)</span>
            </div>

            {/* Submit Button */}
            <div className="form-group full-width" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn" disabled={isPending}>
                {isPending ? 'Logging Telemetry...' : '⚡ Log Telemetry Data'}
              </button>
            </div>

          </div>
        </form>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Want to view historical logs?{' '}
          <Link href="/display" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            Go to Telemetry History &rarr;
          </Link>
        </p>
      </div>
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={dateStr}
        onSelectDate={(selected) => {
          setDateStr(selected);
          setStatus({ type: null, message: '' });
        }}
      />
    </div>
  );
}
