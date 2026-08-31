const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { verifyApiKey } = require('../middleware/auth');

const router = express.Router();

// Apply API key security to all backup routes
router.use(verifyApiKey);

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'billbook_aes_256_gcm_master_encryption_key_2026';
const ALGORITHM = 'aes-256-gcm';
const getCipherKey = () => crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

// Helper: Encrypt payload
function encryptData(dataObj, storeName = 'ROYAL FASHION MALL') {
  const backupObject = {
    app: 'BillBook_POS',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    storeName,
    data: dataObj,
  };

  const jsonString = JSON.stringify(backupObject);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getCipherKey(), iv);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const finalPayload = `${iv.toString('hex')}:${authTag}:${encrypted}`;
  const storeNameClean = storeName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Store_Backup_${storeNameClean}_${dateStr}.billbook.bak`;

  return { filename, payload: finalPayload };
}

// Helper: Decrypt payload
function decryptPayload(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string' || !encryptedPayload.includes(':')) {
    throw new Error('Invalid backup file format.');
  }

  const parts = encryptedPayload.trim().split(':');
  if (parts.length !== 3) {
    throw new Error('Corrupted or invalid backup signature.');
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getCipherKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const backupObject = JSON.parse(decrypted);
  if (!backupObject || !backupObject.data) {
    throw new Error('Unrecognized backup payload.');
  }
  return backupObject;
}

// Helper: Restore DB data
function restoreDatabaseData(db, restoredData, callback) {
  db.serialize(() => {
    // 1. Transactions
    if (Array.isArray(restoredData.transactions)) {
      db.run('DELETE FROM transactions');
      const txStmt = db.prepare(`
        INSERT INTO transactions (
          billNo, timestamp, customerName, customerPhone, items,
          subtotal, discount, grandTotal, paymentMode, paymentStatus,
          pendingAmount, advanceAmount, cashTendered, changeReturned,
          upiRefNo, cardRefNo, workerName, status, printCount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      restoredData.transactions.forEach((tx) => {
        txStmt.run([
          tx.billNo,
          tx.timestamp || new Date().toISOString(),
          tx.customerName || 'Walk-in Customer',
          tx.customerPhone || '',
          JSON.stringify(tx.items || []),
          Number(tx.subtotal) || 0,
          Number(tx.discount) || 0,
          Number(tx.grandTotal) || 0,
          tx.paymentMode || 'CASH',
          tx.paymentStatus || 'PAID',
          Number(tx.pendingAmount) || 0,
          Number(tx.advanceAmount) || 0,
          Number(tx.cashTendered) || 0,
          Number(tx.changeReturned) || 0,
          tx.upiRefNo || '',
          tx.cardRefNo || '',
          tx.workerName || 'Store Owner',
          tx.status || 'COMPLETED',
          Number(tx.printCount) || 1,
        ]);
      });
      txStmt.finalize();
    }

    // 2. Workers
    if (Array.isArray(restoredData.workers) && restoredData.workers.length > 0) {
      db.run('DELETE FROM workers');
      const wStmt = db.prepare(`
        INSERT INTO workers (id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      restoredData.workers.forEach((w) => {
        const pass = w.password || w.username || '1234';
        wStmt.run([
          w.id || `w-${Date.now()}`,
          w.username,
          pass,
          w.name || 'Staff',
          w.phone || '',
          w.role || 'cashier',
          w.counter || 'Counter 1',
          w.canCancelBills ? 1 : 0,
          w.canAccessMarketing ? 1 : 0,
        ]);
      });
      wStmt.finalize();
    }

    // 3. Products
    if (Array.isArray(restoredData.products) && restoredData.products.length > 0) {
      db.run('DELETE FROM products');
      const pStmt = db.prepare(`
        INSERT INTO products (id, code, name, category, sizes, price, mrp, stock, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      restoredData.products.forEach((p) => {
        pStmt.run([
          p.id || `prod-${Date.now()}`,
          p.code || '',
          p.name,
          p.category || 'General',
          JSON.stringify(p.sizes || []),
          Number(p.price) || 0,
          Number(p.mrp) || 0,
          Number(p.stock) || 0,
          p.barcode || '',
        ]);
      });
      pStmt.finalize();
    }

    // 4. Settings
    if (restoredData.settings) {
      const s = restoredData.settings;
      db.run(
        `INSERT INTO settings (id, storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           storeName = COALESCE(excluded.storeName, settings.storeName),
           tagline = COALESCE(excluded.tagline, settings.tagline),
           address = COALESCE(excluded.address, settings.address),
           city = COALESCE(excluded.city, settings.city),
           phone = COALESCE(excluded.phone, settings.phone),
           gstin = COALESCE(excluded.gstin, settings.gstin),
           upiId = COALESCE(excluded.upiId, settings.upiId),
           upiName = COALESCE(excluded.upiName, settings.upiName),
           billPrefix = COALESCE(excluded.billPrefix, settings.billPrefix),
           receiptPaper = COALESCE(excluded.receiptPaper, settings.receiptPaper),
           workerName = COALESCE(excluded.workerName, settings.workerName)`,
        [s.storeName, s.tagline, s.address, s.city, s.phone, s.gstin, s.upiId, s.upiName, s.billPrefix, s.receiptPaper, s.workerName]
      );
    }

    callback(null);
  });
}

// POST /api/backup/import
router.post('/import', (req, res) => {
  const { payload } = req.body;
  if (!payload) {
    return res.status(400).json({ error: 'No backup payload provided.' });
  }

  try {
    const backupObj = decryptPayload(payload);
    const db = getDb();

    restoreDatabaseData(db, backupObj.data, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: 'Store backup restored successfully',
        storeName: backupObj.storeName || backupObj.data?.settings?.storeName || 'ROYAL FASHION MALL',
      });
    });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to decrypt backup' });
  }
});

// GET /api/backup/export
router.get('/export', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM transactions', [], (tErr, transactions) => {
    db.all('SELECT * FROM products', [], (pErr, products) => {
      db.all('SELECT * FROM workers', [], (wErr, workers) => {
        db.get('SELECT * FROM settings WHERE id = 1', [], (sErr, settings) => {
          const formattedTxs = (transactions || []).map((t) => {
            let items = [];
            try { items = JSON.parse(t.items); } catch (e) {}
            return { ...t, items };
          });

          const formattedProds = (products || []).map((p) => {
            let sizes = [];
            try { sizes = JSON.parse(p.sizes); } catch (e) {}
            return { ...p, sizes };
          });

          const dbState = {
            transactions: formattedTxs,
            products: formattedProds,
            workers: workers || [],
            settings: settings || {},
          };

          const storeName = settings?.storeName || 'ROYAL FASHION MALL';
          const { filename, payload } = encryptData(dbState, storeName);

          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', 'text/plain');
          res.send(payload);
        });
      });
    });
  });
});

// GET /api/backup/snapshots
router.get('/snapshots', (req, res) => {
  try {
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const snapshots = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const stats = fs.statSync(path.join(SNAPSHOTS_DIR, f));
        return {
          filename: f,
          date: f.replace('snapshot_', '').replace('.json', ''),
          sizeBytes: stats.size,
          createdAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(snapshots);
  } catch (e) {
    res.json([]);
  }
});

// POST /api/backup/snapshots/rollback
router.post('/snapshots/rollback', (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(SNAPSHOTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Snapshot file not found' });
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const snapshotObj = JSON.parse(raw);
    const db = getDb();
    restoreDatabaseData(db, snapshotObj.data, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Restored from snapshot ${filename}` });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Cloud Settings memory/store
let cloudSettingsCache = {
  enabled: false,
  destination: 'BOTH',
  frequency: 'DAILY',
  adminEmail: 'ramrajskrrk@gmail.com',
  senderEmail: 'devilraj6299@gmail.com',
  smtpUser: 'devilraj6299@gmail.com',
  smtpPass: '',
  gdriveWebhook: '',
  autoSyncTime: '22:00',
  lastSyncAt: null,
  lastSyncStatus: null,
};

// GET /api/backup/cloud-settings
router.get('/cloud-settings', (req, res) => {
  res.json(cloudSettingsCache);
});

// POST /api/backup/cloud-settings
router.post('/cloud-settings', (req, res) => {
  cloudSettingsCache = { ...cloudSettingsCache, ...req.body };
  res.json(cloudSettingsCache);
});

// POST /api/backup/cloud-sync
router.post('/cloud-sync', (req, res) => {
  cloudSettingsCache.lastSyncAt = new Date().toISOString();
  cloudSettingsCache.lastSyncStatus = 'SUCCESS';
  res.json({ success: true, message: 'Cloud sync simulated successfully' });
});

module.exports = router;
