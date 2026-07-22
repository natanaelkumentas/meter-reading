'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getReadings, ReadingRecord } from '../actions';
import Link from 'next/link';
import CalendarModal from '@/components/CalendarModal';

interface GroupedDailyReading {
  date: string;
  tx1?: ReadingRecord;
  tx2?: ReadingRecord;
}

export default function DisplayPage() {
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // all, TX1, TX2
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch readings on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      const res = await getReadings();
      if (res.success) {
        setReadings(res.data);
      } else {
        setError(res.error || 'Failed to load telemetry records.');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Format date from YYYY-MM-DD to YYYY/MM/DD
  const formatDateToSlash = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return dateStr;
  };

  // Extract unique years for Year Category dropdown
  const uniqueYears = useMemo(() => {
    const years = readings.map((r) => {
      return r.date.split('-')[0];
    });
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [readings]);

  // Compute tolerance classes
  // Warning if values deviate by more than 5% from nominal
  const getVoltageStatus = (value: number, nominal: number) => {
    const deviation = Math.abs((value - nominal) / nominal);
    if (deviation > 0.05) {
      return { class: 'voltage-val minus15', label: 'Alert' };
    }
    return { class: '', label: 'OK' };
  };

  // Group readings per day for dual-column (TX1 & TX2) display
  const groupedReadings = useMemo(() => {
    const map = new Map<string, GroupedDailyReading>();

    readings.forEach((r) => {
      // 1. Year Filter
      if (selectedYear !== 'all') {
        const rowYear = r.date.split('-')[0];
        if (rowYear !== selectedYear) return;
      }

      // 2. Date Filter (Accepts YYYY-MM-DD or YYYY/MM/DD)
      if (selectedDate.trim() !== '') {
        const cleanedDate = selectedDate.replace(/\//g, '-');
        if (r.date !== cleanedDate) return;
      }

      // 3. Category Filter
      if (selectedCategory !== 'all') {
        if (r.category !== selectedCategory) return;
      }

      const existing = map.get(r.date) || { date: r.date };
      if (r.category === 'TX2') {
        existing.tx2 = r;
      } else {
        existing.tx1 = r;
      }
      map.set(r.date, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [readings, selectedYear, selectedDate, selectedCategory]);

  // Helper to render supply voltages block
  const renderSupplyBlock = (record?: ReadingRecord) => {
    if (!record) {
      return (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
          — No Entry —
        </div>
      );
    }

    const s5 = getVoltageStatus(record.val_plus_5, 5.0);
    const s15 = getVoltageStatus(record.val_plus_15, 15.0);
    const sNeg15 = getVoltageStatus(record.val_minus_15, -15.0);

    return (
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-around', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            +5V
          </div>
          <div className={`voltage-val plus5 ${s5.class}`} style={{ fontSize: '0.95rem' }}>
            {record.val_plus_5.toFixed(2)} V
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            +15V
          </div>
          <div className={`voltage-val plus15 ${s15.class}`} style={{ fontSize: '0.95rem' }}>
            {record.val_plus_15.toFixed(2)} V
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            -15V
          </div>
          <div className={`voltage-val minus15 ${sNeg15.class}`} style={{ fontSize: '0.95rem' }}>
            {record.val_minus_15.toFixed(2)} V
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Telemetry Logs & History
        </h1>
        <p className="section-desc" style={{ margin: '0.5rem auto 0 auto' }}>
          Daily power supply readings organized by date with side-by-side TX1 and TX2 category columns.
        </p>
      </div>

      {/* Filter Control Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontWeight: 600 }}>
          🔍 Filter Records
        </h3>
        <div className="filter-bar">
          {/* Year Filter */}
          <div className="form-group">
            <label htmlFor="filter-year" className="form-label" style={{ fontSize: '0.75rem' }}>
              Category per Year
            </label>
            <select
              id="filter-year"
              className="input-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  Year {year}
                </option>
              ))}
            </select>
          </div>

          {/* Exact Date Filter */}
          <div className="form-group">
            <label htmlFor="filter-date" className="form-label" style={{ fontSize: '0.75rem' }}>
              Filter by Date
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                id="filter-date"
                className="input-control"
                placeholder="YYYY/MM/DD..."
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                style={{ width: 'auto', padding: '0 0.8rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                onClick={() => setIsCalendarOpen(true)}
                title="Open Calendar Picker"
              >
                📅
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="form-group">
            <label htmlFor="filter-category" className="form-label" style={{ fontSize: '0.75rem' }}>
              Category
            </label>
            <select
              id="filter-category"
              className="input-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Display Both (TX1 & TX2)</option>
              <option value="TX1">TX1 Only</option>
              <option value="TX2">TX2 Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Display */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading telemetry logs from database...</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>⚠️</span> {error}
        </div>
      ) : groupedReadings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📡</span>
            <h3>No Readings Found</h3>
            <p style={{ maxWidth: '400px', margin: '0.5rem 0 1.5rem 0' }}>
              No telemetry data matches your current filter criteria. Make a new data entry or clear filters to reset.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn"
                style={{ width: 'auto', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedDate('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </button>
              <Link href="/" className="btn" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                Add New Entry
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date</th>

                  {(selectedCategory === 'all' || selectedCategory === 'TX1') && (
                    <th style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.08)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                      TX1
                    </th>
                  )}

                  {(selectedCategory === 'all' || selectedCategory === 'TX2') && (
                    <th style={{ textAlign: 'center', background: 'rgba(6, 182, 212, 0.08)', borderRight: '1px solid var(--border-color)' }}>
                      TX2
                    </th>
                  )}

                  <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupedReadings.map((row) => {
                  // Evaluate status alerts for TX1 and TX2
                  let isAlert = false;

                  const checkDev = (rec?: ReadingRecord) => {
                    if (!rec) return false;
                    const dev5 = Math.abs((rec.val_plus_5 - 5.0) / 5.0);
                    const dev15 = Math.abs((rec.val_plus_15 - 15.0) / 15.0);
                    const devNeg15 = Math.abs((rec.val_minus_15 - -15.0) / -15.0);
                    return dev5 > 0.05 || dev15 > 0.05 || devNeg15 > 0.05;
                  };

                  if (selectedCategory === 'all') {
                    if (checkDev(row.tx1) || checkDev(row.tx2)) isAlert = true;
                  } else if (selectedCategory === 'TX1' && checkDev(row.tx1)) {
                    isAlert = true;
                  } else if (selectedCategory === 'TX2' && checkDev(row.tx2)) {
                    isAlert = true;
                  }

                  return (
                    <tr key={row.date}>
                      {/* Date Column */}
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', verticalAlign: 'middle' }}>
                        {formatDateToSlash(row.date)}
                      </td>

                      {/* TX1 Supply Column */}
                      {(selectedCategory === 'all' || selectedCategory === 'TX1') && (
                        <td style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                          {renderSupplyBlock(row.tx1)}
                        </td>
                      )}

                      {/* TX2 Supply Column */}
                      {(selectedCategory === 'all' || selectedCategory === 'TX2') && (
                        <td style={{ borderRight: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                          {renderSupplyBlock(row.tx2)}
                        </td>
                      )}

                      {/* Overall Daily Status */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          className="voltage-badge"
                          style={{
                            backgroundColor: isAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isAlert ? 'var(--color-error)' : 'var(--color-success)',
                            border: `1px solid ${isAlert ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}
                        >
                          {isAlert ? 'Alert' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Need to insert a new reading?{' '}
          <Link href="/" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Go back to Input Form &larr;
          </Link>
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate(date)}
      />
    </div>
  );
}
