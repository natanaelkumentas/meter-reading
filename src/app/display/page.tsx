'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { getReadings, saveDailyReadings, deleteDailyReading, ReadingRecord } from '../actions';
import Link from 'next/link';
import CalendarModal from '@/components/CalendarModal';
import Toast from '@/components/Toast';

interface GroupedDailyReading {
  date: string;
  tx1?: ReadingRecord;
  tx2?: ReadingRecord;
}

export default function DisplayPage() {
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast feedback state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const [isPending, startTransition] = useTransition();

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // all, TX1, TX2
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Pagination States (Default: 10 entries per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  // EDIT MODAL STATE
  const [editingRow, setEditingRow] = useState<GroupedDailyReading | null>(null);
  const [editTx1_v5, setEditTx1_v5] = useState('');
  const [editTx1_v15, setEditTx1_v15] = useState('');
  const [editTx1_vNeg15, setEditTx1_vNeg15] = useState('');
  const [editTx2_v5, setEditTx2_v5] = useState('');
  const [editTx2_v15, setEditTx2_v15] = useState('');
  const [editTx2_vNeg15, setEditTx2_vNeg15] = useState('');
  const [hasTx1, setHasTx1] = useState(true);
  const [hasTx2, setHasTx2] = useState(true);

  // DELETE CONFIRM MODAL STATE
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  // Fetch readings on mount & re-fetch helper
  const loadData = async () => {
    setLoading(true);
    setError('');
    const res = await getReadings();
    if (res.success) {
      setReadings(res.data);
    } else {
      setError(res.error || 'Failed to load telemetry records.');
    }
    setLoading(false);
  };

  useEffect(() => {
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

  // Extract unique years for Year dropdown
  const uniqueYears = useMemo(() => {
    const years = readings.map((r) => r.date.split('-')[0]);
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [readings]);

  // Compute tolerance classes (Warning if values deviate by >5% from nominal)
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

      // 2. Date Filter
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

  // Reset page to 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedDate, selectedCategory, pageSize]);

  // Pagination Math
  const totalEntries = groupedReadings.length;
  const numericPageSize = pageSize === 'all' ? totalEntries : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalEntries / (numericPageSize || 1)));

  const startIndex = (currentPage - 1) * (numericPageSize || 1);
  const endIndex = Math.min(startIndex + (numericPageSize || totalEntries), totalEntries);

  const paginatedReadings = useMemo(() => {
    if (pageSize === 'all') return groupedReadings;
    return groupedReadings.slice(startIndex, endIndex);
  }, [groupedReadings, pageSize, startIndex, endIndex]);

  // Open Edit Modal for a row
  const handleOpenEdit = (row: GroupedDailyReading) => {
    setEditingRow(row);
    setHasTx1(!!row.tx1);
    setHasTx2(!!row.tx2);

    setEditTx1_v5(row.tx1 ? String(row.tx1.val_plus_5) : '');
    setEditTx1_v15(row.tx1 ? String(row.tx1.val_plus_15) : '');
    setEditTx1_vNeg15(row.tx1 ? String(row.tx1.val_minus_15) : '');

    setEditTx2_v5(row.tx2 ? String(row.tx2.val_plus_5) : '');
    setEditTx2_v15(row.tx2 ? String(row.tx2.val_plus_15) : '');
    setEditTx2_vNeg15(row.tx2 ? String(row.tx2.val_minus_15) : '');
  };

  // Save Edit Changes (UPDATE)
  const handleSaveEdit = async () => {
    if (!editingRow) return;

    if (!hasTx1 && !hasTx2) {
      setToast({ type: 'error', message: 'Please select at least TX1 or TX2 to save values.' });
      return;
    }

    let tx1Data: { val_plus_5: number; val_plus_15: number; val_minus_15: number } | undefined;
    if (hasTx1) {
      const v5 = parseFloat(editTx1_v5);
      const v15 = parseFloat(editTx1_v15);
      const vNeg15 = parseFloat(editTx1_vNeg15);
      if (isNaN(v5) || isNaN(v15) || isNaN(vNeg15)) {
        setToast({ type: 'error', message: 'All TX1 values must be valid numbers.' });
        return;
      }
      tx1Data = { val_plus_5: v5, val_plus_15: v15, val_minus_15: vNeg15 };
    }

    let tx2Data: { val_plus_5: number; val_plus_15: number; val_minus_15: number } | undefined;
    if (hasTx2) {
      const v5 = parseFloat(editTx2_v5);
      const v15 = parseFloat(editTx2_v15);
      const vNeg15 = parseFloat(editTx2_vNeg15);
      if (isNaN(v5) || isNaN(v15) || isNaN(vNeg15)) {
        setToast({ type: 'error', message: 'All TX2 values must be valid numbers.' });
        return;
      }
      tx2Data = { val_plus_5: v5, val_plus_15: v15, val_minus_15: vNeg15 };
    }

    startTransition(async () => {
      const res = await saveDailyReadings({
        date: editingRow.date,
        tx1: tx1Data,
        tx2: tx2Data,
      });

      if (res.success) {
        setToast({ type: 'success', message: `Telemetry for ${formatDateToSlash(editingRow.date)} updated!` });
        setEditingRow(null);
        await loadData();
      } else {
        setToast({ type: 'error', message: res.error || 'Failed to update record.' });
      }
    });
  };

  // Confirm Delete (DELETE)
  const handleConfirmDelete = async () => {
    if (!deletingDate) return;
    const dateToDelete = deletingDate;
    setDeletingDate(null);

    startTransition(async () => {
      const res = await deleteDailyReading(dateToDelete);
      if (res.success) {
        setReadings((prev) => prev.filter((r) => r.date !== dateToDelete));
        setToast({ type: 'success', message: `Telemetry for ${formatDateToSlash(dateToDelete)} deleted.` });
        await loadData();
      } else {
        setToast({ type: 'error', message: res.error || 'Failed to delete record.' });
      }
    });
  };

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
      <div style={{ marginBottom: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          Telemetry Logs & History
        </h1>
        <p className="section-desc" style={{ margin: '0.5rem auto 1.5rem auto' }}>
          Daily power supply readings organized by date with side-by-side TX1 and TX2 columns.
        </p>
        
        <Link href="/" className="btn" style={{ width: 'auto', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>➕</span> New Telemetry Entry
        </Link>
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
              Year
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

          {/* Selection Filter */}
          <div className="form-group">
            <label htmlFor="filter-category" className="form-label" style={{ fontSize: '0.75rem' }}>
              Selection
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
                  <th style={{ width: '120px' }}>Date</th>

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

                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReadings.map((row) => {
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

                      {/* CRUD Actions Column (Edit / Delete) */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div className="table-action-group">
                          <button
                            type="button"
                            className="btn"
                            style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: 'none' }}
                            onClick={() => handleOpenEdit(row)}
                            title="Edit Record"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-error)', boxShadow: 'none' }}
                            onClick={() => setDeletingDate(row.date)}
                            title="Delete Record"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS BAR */}
          <div className="pagination-container">
            <div className="pagination-info">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'all' ? 'all' : parseInt(val, 10));
                }}
                className="input-control"
                style={{ width: 'auto', display: 'inline-block', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              >
                <option value={5}>5</option>
                <option value={10}>10 (Default)</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">All</option>
              </select>
              <span>
                Showing {totalEntries === 0 ? 0 : startIndex + 1}–{endIndex} of {totalEntries} entries
              </span>
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                « First
              </button>
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                ‹ Prev
              </button>

              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalEntries === 0}
                title="Next Page"
              >
                Next ›
              </button>
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalEntries === 0}
                title="Last Page"
              >
                Last »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL POPUP */}
      {editingRow && (
        <div className="modal-backdrop" onClick={() => setEditingRow(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="calendar-header">
              <div className="cal-title">
                ✏️ Edit Telemetry: {formatDateToSlash(editingRow.date)}
              </div>
              <button type="button" className="cal-nav-btn" onClick={() => setEditingRow(null)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              
              {/* TX1 EDIT SECTION */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>📡 TX1</span>
                  <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input type="checkbox" checked={hasTx1} onChange={(e) => setHasTx1(e.target.checked)} /> Include TX1
                  </label>
                </div>
                {hasTx1 && (
                  <div className="edit-grid-3">
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>+5V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx1_v5} onChange={(e) => setEditTx1_v5(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>+15V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx1_v15} onChange={(e) => setEditTx1_v15(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>-15V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx1_vNeg15} onChange={(e) => setEditTx1_vNeg15(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* TX2 EDIT SECTION */}
              <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>📡 TX2</span>
                  <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input type="checkbox" checked={hasTx2} onChange={(e) => setHasTx2(e.target.checked)} /> Include TX2
                  </label>
                </div>
                {hasTx2 && (
                  <div className="edit-grid-3">
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>+5V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx2_v5} onChange={(e) => setEditTx2_v5(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>+15V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx2_v15} onChange={(e) => setEditTx2_v15(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>-15V</label>
                      <input type="number" step="0.01" className="input-control" value={editTx2_vNeg15} onChange={(e) => setEditTx2_vNeg15(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none' }} onClick={() => setEditingRow(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={handleSaveEdit} disabled={isPending}>
                {isPending ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingDate && (
        <div className="modal-backdrop" onClick={() => setDeletingDate(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="calendar-header">
              <div className="cal-title" style={{ color: 'var(--color-error)' }}>
                ⚠️ Delete Telemetry Log
              </div>
              <button type="button" className="cal-nav-btn" onClick={() => setDeletingDate(null)}>
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '1rem 0 1.5rem 0', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete telemetry records for <strong>{formatDateToSlash(deletingDate)}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', boxShadow: 'none' }} onClick={() => setDeletingDate(null)}>
                Cancel
              </button>
              <button type="button" className="btn" style={{ background: 'var(--color-error)' }} onClick={handleConfirmDelete} disabled={isPending}>
                {isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => setSelectedDate(date)}
      />

      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ type: null, message: '' })}
      />

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
