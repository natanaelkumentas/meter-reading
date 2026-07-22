'use client';

import React, { useState, useRef, useTransition } from 'react';
import { saveDailyReadings } from './actions';
import Link from 'next/link';
import CalendarModal from '@/components/CalendarModal';
import Toast from '@/components/Toast';

export default function InputForm() {
  const [dateStr, setDateStr] = useState('');
  
  // Enable checkboxes for TX1 and TX2
  const [enableTx1, setEnableTx1] = useState(true);
  const [enableTx2, setEnableTx2] = useState(true);

  // TX1 Supply Inputs
  const [tx1_v5, setTx1_v5] = useState('');
  const [tx1_v15, setTx1_v15] = useState('');
  const [tx1_vNeg15, setTx1_vNeg15] = useState('');

  // TX2 Supply Inputs
  const [tx2_v5, setTx2_v5] = useState('');
  const [tx2_v15, setTx2_v15] = useState('');
  const [tx2_vNeg15, setTx2_vNeg15] = useState('');

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
    value = value.replace(/[^0-9/]/g, ''); // Allow only digits and slashes
    if (value.length === 4 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 7 && value.split('/').length === 2) {
      value = value + '/';
    }
    if (value.length <= 10) {
      setDateStr(value);
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

  // Submit handler for saving TX1 and TX2 together
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    if (!isValidDate(dateStr)) {
      setStatus({
        type: 'error',
        message: 'Please enter a valid date in format YYYY/MM/DD or select from calendar.',
      });
      return;
    }

    if (!enableTx1 && !enableTx2) {
      setStatus({
        type: 'error',
        message: 'Please enable and fill in voltage values for at least TX1 or TX2.',
      });
      return;
    }

    let tx1Data: { val_plus_5: number; val_plus_15: number; val_minus_15: number } | undefined;
    if (enableTx1) {
      const num5 = parseFloat(tx1_v5);
      const num15 = parseFloat(tx1_v15);
      const numNeg15 = parseFloat(tx1_vNeg15);
      if (isNaN(num5) || isNaN(num15) || isNaN(numNeg15)) {
        setStatus({
          type: 'error',
          message: 'All TX1 voltage values must be valid numbers.',
        });
        return;
      }
      tx1Data = {
        val_plus_5: num5,
        val_plus_15: num15,
        val_minus_15: numNeg15,
      };
    }

    let tx2Data: { val_plus_5: number; val_plus_15: number; val_minus_15: number } | undefined;
    if (enableTx2) {
      const num5 = parseFloat(tx2_v5);
      const num15 = parseFloat(tx2_v15);
      const numNeg15 = parseFloat(tx2_vNeg15);
      if (isNaN(num5) || isNaN(num15) || isNaN(numNeg15)) {
        setStatus({
          type: 'error',
          message: 'All TX2 voltage values must be valid numbers.',
        });
        return;
      }
      tx2Data = {
        val_plus_5: num5,
        val_plus_15: num15,
        val_minus_15: numNeg15,
      };
    }

    startTransition(async () => {
      const dbDate = dateStr.replace(/\//g, '-');
      const res = await saveDailyReadings({
        date: dbDate,
        tx1: tx1Data,
        tx2: tx2Data,
      });

      if (res.success) {
        setStatus({
          type: 'success',
          message: 'Telemetry data successfully logged to Supabase!',
        });
        // Clear all form inputs automatically
        setDateStr('');
        setTx1_v5('');
        setTx1_v15('');
        setTx1_vNeg15('');
        setTx2_v5('');
        setTx2_v15('');
        setTx2_vNeg15('');
      } else {
        setStatus({
          type: 'error',
          message: res.error || 'Failed to submit telemetry data.',
        });
      }
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Power Telemetry Input
        </h1>
        <p className="section-desc" style={{ margin: '0.5rem auto 0 auto' }}>
          Record daily power supply voltages for TX1 and TX2 together in a single entry.
        </p>
      </div>

      <div className="card">
        <div className="form-title">
          <span>📝</span> New Telemetry Entry
        </div>

        <form onSubmit={handleSubmit}>
          {/* Date Picker Section */}
          <div className="form-group full-width" style={{ marginBottom: '2rem' }}>
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
            <span className="helper-text">Format: YYYY/MM/DD or select date from popup calendar.</span>
          </div>

          {/* Grid Layout for TX1 & TX2 Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* TX1 SECTION CARD */}
            <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: `1px solid ${enableTx1 ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-color)'}`, borderRadius: '16px', padding: '1.5rem', opacity: enableTx1 ? 1 : 0.6, transition: 'var(--transition-smooth)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📡 TX1
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableTx1}
                    onChange={(e) => setEnableTx1(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Include TX1
                </label>
              </div>

              {enableTx1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="tx1_v5" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 +5 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx1_v5"
                      className="input-control"
                      placeholder="e.g. 5.02"
                      step="0.01"
                      value={tx1_v5}
                      onChange={(e) => setTx1_v5(e.target.value)}
                      disabled={isPending}
                      required={enableTx1}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tx1_v15" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 +15 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx1_v15"
                      className="input-control"
                      placeholder="e.g. 15.11"
                      step="0.01"
                      value={tx1_v15}
                      onChange={(e) => setTx1_v15(e.target.value)}
                      disabled={isPending}
                      required={enableTx1}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tx1_vNeg15" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 -15 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx1_vNeg15"
                      className="input-control"
                      placeholder="e.g. -14.98"
                      step="0.01"
                      value={tx1_vNeg15}
                      onChange={(e) => setTx1_vNeg15(e.target.value)}
                      disabled={isPending}
                      required={enableTx1}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* TX2 SECTION CARD */}
            <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: `1px solid ${enableTx2 ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-color)'}`, borderRadius: '16px', padding: '1.5rem', opacity: enableTx2 ? 1 : 0.6, transition: 'var(--transition-smooth)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📡 TX2
                </h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableTx2}
                    onChange={(e) => setEnableTx2(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Include TX2
                </label>
              </div>

              {enableTx2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="tx2_v5" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 +5 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx2_v5"
                      className="input-control"
                      placeholder="e.g. 4.98"
                      step="0.01"
                      value={tx2_v5}
                      onChange={(e) => setTx2_v5(e.target.value)}
                      disabled={isPending}
                      required={enableTx2}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tx2_v15" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 +15 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx2_v15"
                      className="input-control"
                      placeholder="e.g. 15.05"
                      step="0.01"
                      value={tx2_v15}
                      onChange={(e) => setTx2_v15(e.target.value)}
                      disabled={isPending}
                      required={enableTx2}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tx2_vNeg15" className="form-label" style={{ fontSize: '0.8rem' }}>
                      🔋 -15 VOLT SUPPLY (V)
                    </label>
                    <input
                      type="number"
                      id="tx2_vNeg15"
                      className="input-control"
                      placeholder="e.g. -15.02"
                      step="0.01"
                      value={tx2_vNeg15}
                      onChange={(e) => setTx2_vNeg15(e.target.value)}
                      disabled={isPending}
                      required={enableTx2}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Save Button */}
          <div className="form-group full-width">
            <button type="submit" className="btn" disabled={isPending} style={{ padding: '1.1rem', fontSize: '1.05rem' }}>
              {isPending ? 'Logging Telemetry Data...' : '⚡ Save Telemetry Data (TX1 & TX2)'}
            </button>
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

      <Toast
        type={status.type}
        message={status.message}
        onClose={() => setStatus({ type: null, message: '' })}
      />
    </div>
  );
}
