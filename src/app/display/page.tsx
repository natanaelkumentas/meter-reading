'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getReadings, ReadingRecord } from '../actions';
import Link from 'next/link';

export default function DisplayPage() {
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedRail, setSelectedRail] = useState<string>('all'); // all, val_plus_5, val_plus_15, val_minus_15

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

  // Extract unique years for the Year Category dropdown
  const uniqueYears = useMemo(() => {
    const years = readings.map((r) => {
      // date is usually YYYY-MM-DD
      const year = r.date.split('-')[0];
      return year;
    });
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [readings]);

  // Compute tolerance classes
  // Warning if values deviate by more than 5% from nominal
  const getVoltageStatus = (value: number, nominal: number) => {
    const deviation = Math.abs((value - nominal) / nominal);
    if (deviation > 0.05) {
      return { class: 'voltage-val minus15', label: '⚠️ Alert (Outside 5%)' }; // reuse rose/red style
    }
    return { class: '', label: 'OK' };
  };

  // Filter data based on selections
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      // 1. Year Filter
      if (selectedYear !== 'all') {
        const rowYear = r.date.split('-')[0];
        if (rowYear !== selectedYear) return false;
      }

      // 2. Date Filter (Accepts YYYY-MM-DD or YYYY/MM/DD)
      if (selectedDate.trim() !== '') {
        const cleanedDate = selectedDate.replace(/\//g, '-'); // normalize to YYYY-MM-DD
        if (r.date !== cleanedDate) return false;
      }

      return true;
    });
  }, [readings, selectedYear, selectedDate]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Telemetry Logs & History
        </h1>
        <p className="section-desc" style={{ margin: '0.5rem auto 0 auto' }}>
          Inspect daily power supply rail logs. Filter readings by date, rail type, and year-based category.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontWeight: 600 }}>
          🔍 Filter Records
        </h3>
        <div className="filter-bar">
          {/* Year Category Filter */}
          <div className="form-group">
            <label htmlFor="filter-year" className="form-label" style={{ fontSize: '0.75rem' }}>
              Category (Year)
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
            <input
              type="text"
              id="filter-date"
              className="input-control"
              placeholder="YYYY/MM/DD or select..."
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <span className="helper-text" style={{ fontSize: '0.7rem' }}>Supports typing YYYY/MM/DD or YYYY-MM-DD</span>
          </div>

          {/* Power Supply Rail Column Filter */}
          <div className="form-group">
            <label htmlFor="filter-rail" className="form-label" style={{ fontSize: '0.75rem' }}>
              Power Rail Selection
            </label>
            <select
              id="filter-rail"
              className="input-control"
              value={selectedRail}
              onChange={(e) => setSelectedRail(e.target.value)}
            >
              <option value="all">Display All Supplies</option>
              <option value="val_plus_5">+5 VOLT SUPPLY Only</option>
              <option value="val_plus_15">+15 VOLT SUPPLY Only</option>
              <option value="val_minus_15">-15 VOLT SUPPLY Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }}>🔄</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading telemetry logs from database...</p>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>⚠️</span> {error}
        </div>
      ) : filteredReadings.length === 0 ? (
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
                  setSelectedRail('all');
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
                  <th>Date</th>
                  
                  {/* Conditionally display headers based on selectedRail */}
                  {(selectedRail === 'all' || selectedRail === 'val_plus_5') && (
                    <th>+5 VOLT SUPPLY</th>
                  )}
                  {(selectedRail === 'all' || selectedRail === 'val_plus_15') && (
                    <th>+15 VOLT SUPPLY</th>
                  )}
                  {(selectedRail === 'all' || selectedRail === 'val_minus_15') && (
                    <th>-15 VOLT SUPPLY</th>
                  )}
                  
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.map((row) => {
                  const status5 = getVoltageStatus(row.val_plus_5, 5.0);
                  const status15 = getVoltageStatus(row.val_plus_15, 15.0);
                  const statusNeg15 = getVoltageStatus(row.val_minus_15, -15.0);

                  // Row status is critical/warning if any active rail is deviating
                  let rowStatusText = 'Normal';
                  let isAlert = false;
                  
                  if (selectedRail === 'all') {
                    if (status5.class || status15.class || statusNeg15.class) {
                      rowStatusText = 'Deviation Alert';
                      isAlert = true;
                    }
                  } else if (selectedRail === 'val_plus_5' && status5.class) {
                    rowStatusText = 'Deviation Alert';
                    isAlert = true;
                  } else if (selectedRail === 'val_plus_15' && status15.class) {
                    rowStatusText = 'Deviation Alert';
                    isAlert = true;
                  } else if (selectedRail === 'val_minus_15' && statusNeg15.class) {
                    rowStatusText = 'Deviation Alert';
                    isAlert = true;
                  }

                  return (
                    <tr key={row.id}>
                      {/* Date */}
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatDateToSlash(row.date)}
                      </td>

                      {/* +5 VOLT SUPPLY */}
                      {(selectedRail === 'all' || selectedRail === 'val_plus_5') && (
                        <td>
                          <div className={`voltage-val plus5 ${status5.class}`}>
                            {row.val_plus_5.toFixed(2)} V
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nominal: 5.00V</div>
                        </td>
                      )}

                      {/* +15 VOLT SUPPLY */}
                      {(selectedRail === 'all' || selectedRail === 'val_plus_15') && (
                        <td>
                          <div className={`voltage-val plus15 ${status15.class}`}>
                            {row.val_plus_15.toFixed(2)} V
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nominal: 15.00V</div>
                        </td>
                      )}

                      {/* -15 VOLT SUPPLY */}
                      {(selectedRail === 'all' || selectedRail === 'val_minus_15') && (
                        <td>
                          <div className={`voltage-val minus15 ${statusNeg15.class}`}>
                            {row.val_minus_15.toFixed(2)} V
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nominal: -15.00V</div>
                        </td>
                      )}

                      {/* Status Check badge */}
                      <td>
                        <span
                          className="voltage-badge"
                          style={{
                            backgroundColor: isAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isAlert ? 'var(--color-error)' : 'var(--color-success)',
                            border: `1px solid ${isAlert ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}
                        >
                          {rowStatusText}
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
    </div>
  );
}
