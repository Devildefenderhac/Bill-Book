import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Cloud,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Mail,
  HardDrive,
  Calendar,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';

const API_BASE = import.meta.env?.VITE_API_BASE || "http://127.0.0.1:5000/api";

const safeFetchJson = async (url, options = {}) => {
  const headers = {
    "x-pos-api-key": "BB_POS_SECURE_API_KEY_7061",
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 80)}`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP Error ${res.status}`);
  }
  return data;
};

export default function BackupRestoreModal({ isOpen, onClose, onReloadData = () => {} }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual', 'snapshots', 'cloud'
  const [snapshots, setSnapshots] = useState([]);
  const [cloudSettings, setCloudSettings] = useState({
    enabled: false,
    destination: 'BOTH',
    frequency: 'WEEKLY',
    syncDayOfWeek: 1,
    syncDayOfMonth: 1,
    customDays: 3,
    adminEmail: '',
    smtpUser: '',
    smtpPass: '',
    gdriveWebhook: '',
    autoSyncTime: '22:00',
    lastSyncAt: null,
    lastSyncStatus: null,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [importedFile, setImportedFile] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOpen) {
      fetchSnapshots();
      fetchCloudSettings();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  const fetchSnapshots = async () => {
    try {
      const data = await safeFetchJson(`${API_BASE}/backup/snapshots`);
      setSnapshots(data);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    }
  };

  const fetchCloudSettings = async () => {
    try {
      const data = await safeFetchJson(`${API_BASE}/backup/cloud-settings`);
      setCloudSettings(data);
    } catch (err) {
      console.error('Failed to fetch cloud settings:', err);
    }
  };

  // Layer 1: Export .billbook.bak file
  const handleExportBackup = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/backup/export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const filename = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'Store_Backup.billbook.bak';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMessage('📥 Encrypted backup file downloaded successfully!');
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Layer 1: Import .billbook.bak file
  const handleImportBackup = async (e) => {
    e.preventDefault();
    if (!importedFile) return;

    if (!window.confirm('⚠️ WARNING: Restoring from a backup file will replace your current store data. Are you sure you want to proceed?')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = event.target.result;
        const data = await safeFetchJson(`${API_BASE}/backup/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });

        setMessage(`⚡ Store database restored successfully! (${data.storeName})`);
        onReloadData();
      } catch (err) {
        setError('Failed to import backup: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(importedFile);
  };

  // Layer 2: Rollback to Selected Snapshot
  const handleRollbackSnapshot = async (filename) => {
    if (!window.confirm(`Restore store database to daily snapshot (${filename})?`)) return;

    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const data = await safeFetchJson(`${API_BASE}/backup/snapshots/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      setMessage(`⚡ Successfully restored database to snapshot ${filename}`);
      onReloadData();
    } catch (err) {
      setError('Rollback error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Layer 3: Save Cloud Sync Settings
  const handleSaveCloudSettings = async (e, triggerSync = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const data = await safeFetchJson(`${API_BASE}/backup/cloud-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudSettings),
      });

      if (triggerSync) {
        setMessage('💾 Settings saved. Triggering backup email sync...');
        await handleTriggerCloudSync();
      } else {
        setMessage('☁️ Cloud Sync settings updated successfully! Click "Sync Now to Cloud ⚡" to send backup email now.');
      }
    } catch (err) {
      setError('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Layer 3: Manual Cloud Sync Trigger
  const handleTriggerCloudSync = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const data = await safeFetchJson(`${API_BASE}/backup/cloud-sync`, {
        method: 'POST',
      });
      const recipient = cloudSettings.recipientEmail || cloudSettings.adminEmail || cloudSettings.smtpUser || cloudSettings.senderEmail;
      setMessage(`⚡ Backup email sent successfully to ${recipient || 'your address'}! Please check your inbox and Spam folder.`);
      fetchCloudSettings();
    } catch (err) {
      setError('Cloud sync error: ' + err.message);
      fetchCloudSettings();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '720px', width: '92%', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', padding: '8px', borderRadius: '10px', color: '#fff' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>Disaster Recovery & Encrypted Backup</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Protect sales history, inventory, Udhar, and staff accounts against device crash</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Status Alerts */}
        {message && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#34d399', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', color: 'var(--accent-rose)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="owner-subtabs-bar" style={{ marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button className={`nav-tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
            <Download size={15} /> <span>Layer 1: 1-Click Export & Restore</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`} onClick={() => setActiveTab('snapshots')}>
            <Clock size={15} /> <span>Layer 2: Daily Local Snapshots</span>
          </button>
          <button className={`nav-tab-btn ${activeTab === 'cloud' ? 'active' : ''}`} onClick={() => setActiveTab('cloud')}>
            <Cloud size={15} /> <span>Layer 3: Auto Internet Cloud Sync</span>
          </button>
        </div>

        {/* TAB 1: 1-Click Encrypted Export & Restore */}
        {activeTab === 'manual' && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="var(--accent-emerald)" />
                <span>Download AES-256 Encrypted Backup File</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                Generates a single encrypted <code>.billbook.bak</code> file containing all sales receipts, inventory stock, staff accounts, pending Udhar, and store settings. Save this file to a USB flash drive or external disk.
              </div>
              <button onClick={handleExportBackup} disabled={loading} className="checkout-btn" style={{ marginTop: '14px', padding: '10px 20px', width: 'auto', fontSize: '13px' }}>
                <Download size={16} /> <span>{loading ? 'Exporting...' : 'Download Store Backup (.billbook.bak)'}</span>
              </button>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--accent-blue)" />
                <span>Restore Store Database from Backup File</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                Restores complete store sales history and configuration when setting up the app on a new laptop, desktop, or fresh Windows installation.
              </div>

              <form onSubmit={handleImportBackup} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="file"
                  accept=".bak,.json"
                  onChange={(e) => setImportedFile(e.target.files[0])}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '8px' }}
                />
                <button type="submit" disabled={loading || !importedFile} className="checkout-btn" style={{ padding: '10px 20px', width: 'auto', fontSize: '13px', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' }}>
                  <Upload size={16} /> <span>{loading ? 'Restoring...' : 'Restore Database from Selected File'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: Daily Local Snapshots */}
        {activeTab === 'snapshots' && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The system automatically takes a daily snapshot of your store database every 24 hours (retaining a rolling 30-day history). Select any day's snapshot to roll back.
            </div>

            <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Snapshot Date</th>
                    <th>File Name</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                        No daily snapshots recorded yet. First snapshot will create automatically at 11:59 PM.
                      </td>
                    </tr>
                  ) : (
                    snapshots.map((snap) => (
                      <tr key={snap.filename}>
                        <td style={{ fontWeight: '700', color: 'var(--accent-amber)' }}>📅 {snap.date}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{snap.filename}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(snap.createdAt).toLocaleString('en-IN')}</td>
                        <td>
                          <button
                            onClick={() => handleRollbackSnapshot(snap.filename)}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'var(--accent-blue)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Rollback Database ⚡
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Auto Internet Cloud Sync */}
        {activeTab === 'cloud' && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Internet Connection & Trigger Banner */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, color: isOnline ? '#34d399' : 'var(--accent-amber)', fontSize: '12px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span>{isOnline ? '🌐 Network Connected: Automatic Cloud Sync Engine Active' : '📡 System Offline: Backup tasks will auto-sync when internet connects'}</span>
                {cloudSettings.lastSyncAt && (
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: 'normal' }}>
                    Last Sync Attempt: {new Date(cloudSettings.lastSyncAt).toLocaleString('en-IN')} ({cloudSettings.lastSyncStatus}) - {cloudSettings.lastSyncMessage}
                  </div>
                )}
              </div>
              <button onClick={handleTriggerCloudSync} disabled={loading || !isOnline} style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--accent-blue)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {loading ? 'Syncing...' : 'Sync Now to Cloud / Email ⚡'}
              </button>
            </div>

            <form onSubmit={(e) => handleSaveCloudSettings(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="enableCloud"
                  checked={cloudSettings.enabled}
                  onChange={(e) => setCloudSettings({ ...cloudSettings, enabled: e.target.checked })}
                />
                <label htmlFor="enableCloud" style={{ fontSize: '14px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>Enable Automated Cloud & Email Backup Sync</label>
              </div>

              <div className="form-row-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="form-group">
                  <label className="form-label">Sync Destination</label>
                  <select
                    className="form-control"
                    value={cloudSettings.destination}
                    onChange={(e) => setCloudSettings({ ...cloudSettings, destination: e.target.value })}
                  >
                    <option value="BOTH">Both Google Drive & Email</option>
                    <option value="EMAIL">Email Delivery Only</option>
                    <option value="GDRIVE">Google Drive Sync Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Auto Sync Frequency</label>
                  <select
                    className="form-control"
                    value={cloudSettings.frequency}
                    onChange={(e) => setCloudSettings({ ...cloudSettings, frequency: e.target.value })}
                  >
                    <option value="DAILY">Daily (Every 24 Hours)</option>
                    <option value="WEEKLY">Weekly (Select Day & Week of Month)</option>
                    <option value="MONTHLY">Monthly (Select Month & Date)</option>
                    <option value="YEARLY">Yearly / Annual (Select Month & Date)</option>
                    <option value="CUSTOM">Custom Days Interval (Every N Days)</option>
                  </select>
                </div>

                {cloudSettings.frequency === 'WEEKLY' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Week of Month</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncWeekOfMonth || "EVERY"}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncWeekOfMonth: e.target.value })}
                      >
                        <option value="EVERY">Every Week</option>
                        <option value="1">1st Week of Month (Days 1-7)</option>
                        <option value="2">2nd Week of Month (Days 8-14)</option>
                        <option value="3">3rd Week of Month (Days 15-21)</option>
                        <option value="4">4th Week of Month (Days 22-28)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Day of Week</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncDayOfWeek ?? 1}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncDayOfWeek: parseInt(e.target.value) })}
                      >
                        <option value={1}>Every Monday</option>
                        <option value={2}>Every Tuesday</option>
                        <option value={3}>Every Wednesday</option>
                        <option value={4}>Every Thursday</option>
                        <option value={5}>Every Friday</option>
                        <option value={6}>Every Saturday</option>
                        <option value={0}>Every Sunday</option>
                      </select>
                    </div>
                  </>
                )}

                {cloudSettings.frequency === 'MONTHLY' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Select Month</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncMonthOfYear || "ALL"}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncMonthOfYear: e.target.value })}
                      >
                        <option value="ALL">Every Month</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date of Month</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncDayOfMonth ?? 1}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncDayOfMonth: parseInt(e.target.value) })}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}{day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'} of Month
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {cloudSettings.frequency === 'YEARLY' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Annual Month</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncMonthOfYear || "1"}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncMonthOfYear: e.target.value })}
                      >
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Annual Date</label>
                      <select
                        className="form-control"
                        value={cloudSettings.syncDayOfMonth ?? 1}
                        onChange={(e) => setCloudSettings({ ...cloudSettings, syncDayOfMonth: parseInt(e.target.value) })}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}{day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'} of Month
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {cloudSettings.frequency === 'CUSTOM' && (
                  <div className="form-group">
                    <label className="form-label">Repeat Every (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="form-control"
                      value={cloudSettings.customDays || 3}
                      onChange={(e) => setCloudSettings({ ...cloudSettings, customDays: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Auto Sync Scheduled Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={cloudSettings.autoSyncTime || "22:00"}
                    onChange={(e) => setCloudSettings({ ...cloudSettings, autoSyncTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Sender Gmail Address (Outbound SMTP)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. yourstore@gmail.com"
                    value={cloudSettings.senderEmail || cloudSettings.smtpUser || ""}
                    onChange={(e) => setCloudSettings({ ...cloudSettings, senderEmail: e.target.value, smtpUser: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gmail 16-Char App Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={cloudSettings.smtpPass || ""}
                    onChange={(e) => setCloudSettings({ ...cloudSettings, smtpPass: e.target.value })}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>Google App Passwords</a>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px 12px', color: '#93c5fd', lineHeight: '1.4' }}>
                💡 <strong>Why hasn't the email arrived?</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  <li>Saving settings saves configuration. Click <strong>"Sync Now to Cloud / Email ⚡"</strong> or <strong>"Save & Send Email Now"</strong> to trigger email delivery immediately.</li>
                  <li>Gmail requires a <strong>16-character App Password</strong> (generated from your Google Account Security settings). Regular login passwords are rejected by Gmail.</li>
                  <li>Check your <strong>Spam / Junk</strong> folder for emails from <em>Bill Book Backup Engine</em>.</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Recipient Email Address (Inbox to receive backups)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. owner@gmail.com (or same as sender)"
                  value={cloudSettings.recipientEmail || cloudSettings.adminEmail || ""}
                  onChange={(e) => setCloudSettings({ ...cloudSettings, recipientEmail: e.target.value, adminEmail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Google Drive Webhook / API App Endpoint (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={cloudSettings.gdriveWebhook || ""}
                  onChange={(e) => setCloudSettings({ ...cloudSettings, gdriveWebhook: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Paste Google Apps Script web app URL to auto-save backup files directly into your Google Drive folder.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button type="submit" disabled={loading} className="checkout-btn" style={{ padding: '10px 20px', width: 'auto', fontSize: '13px', background: 'var(--bg-card-light)', border: '1px solid var(--border-color)', color: '#fff' }}>
                  <Cloud size={16} /> <span>{loading ? 'Saving...' : 'Save Settings Only'}</span>
                </button>
                <button type="button" onClick={(e) => handleSaveCloudSettings(e, true)} disabled={loading || !isOnline} className="checkout-btn" style={{ padding: '10px 20px', width: 'auto', fontSize: '13px', background: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-teal))' }}>
                  <Mail size={16} /> <span>{loading ? 'Processing...' : 'Save & Send Backup Email Now ⚡'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
