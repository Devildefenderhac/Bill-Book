const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, getDb, INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS } = require('./db/database');
const { verifyApiKey } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware with large payload support for encrypted backups
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialise DB
initDb();

// Routes
const productsRouter = require('./routes/products');
const workersRouter = require('./routes/workers');
const settingsRouter = require('./routes/settings');
const transactionsRouter = require('./routes/transactions');
const backupRouter = require('./routes/backup');
const printerRouter = require('./routes/printer');

app.use('/api/products', productsRouter);
app.use('/api/workers', workersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/thermal-printer', printerRouter);

// Sequential next bill number generator (secured)
app.get('/api/next-bill-number', verifyApiKey, (req, res) => {
  const db = getDb();
  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  const dateStr = `${d}${m}${y}`;

  db.get('SELECT billPrefix FROM settings WHERE id = 1', [], (sErr, sRow) => {
    const prefix = (sRow && sRow.billPrefix) || 'BILL-';
    const pattern = `${prefix}${dateStr}-%`;

    db.all('SELECT billNo FROM transactions WHERE billNo LIKE ?', [pattern], (err, rows) => {
      let maxSeq = 0;
      (rows || []).forEach((row) => {
        if (row.billNo) {
          const parts = row.billNo.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      });
      const seq = maxSeq + 1;
      const billNo = `${prefix}${dateStr}-${String(seq).padStart(4, '0')}`;
      res.json({ billNo });
    });
  });
});

// Factory reset - Accessible and executable exclusively for Master Admin (secured)
app.post('/api/factory-reset', verifyApiKey, (req, res) => {
  const db = getDb();

  // Find existing Master Admin record to preserve credentials
  db.get(
    `SELECT * FROM workers WHERE role = 'master_admin' OR id = 'master-admin-01' OR username = 'devil7061' LIMIT 1`,
    [],
    (err, masterRow) => {
      const preservedMaster = masterRow || {
        id: 'master-admin-01',
        username: 'devil7061',
        password: 'password',
        name: 'Devil Master Admin',
        phone: '9876543210',
        role: 'master_admin',
        counter: 'Master Dashboard',
        canCancelBills: 1,
        canAccessMarketing: 1,
      };

      db.serialize(() => {
        db.run('DELETE FROM transactions');
        db.run('DELETE FROM products');
        db.run('DELETE FROM settings');
        db.run('DELETE FROM workers');

        // Preserve ONLY the Master Admin account
        const wStmt = db.prepare(
          'INSERT INTO workers (id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        wStmt.run([
          preservedMaster.id || 'master-admin-01',
          preservedMaster.username || 'devil7061',
          preservedMaster.password || 'password',
          preservedMaster.name || 'Devil Master Admin',
          preservedMaster.phone || '',
          'master_admin',
          'Master Dashboard',
          1,
          1,
        ]);
        wStmt.finalize();

        // Reset Settings to initial clean store profile
        const s = INITIAL_STORE_SETTINGS;
        db.run(
          `INSERT INTO settings (id, storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.storeName, s.tagline, s.address, s.city, s.phone, s.gstin, s.upiId, s.upiName, s.billPrefix, s.receiptPaper, preservedMaster.name || 'Store Owner']
        );

        res.json({
          success: true,
          message: 'Factory reset completed. All sales data, products, and user accounts deleted. Master Admin preserved.',
        });
      });
    }
  );
});


// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`🛠️  Backend listening on http://localhost:${PORT}`);
});
