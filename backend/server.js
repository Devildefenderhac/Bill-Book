import express from 'express';
import cors from 'cors';
import { getDB, saveDB } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Node.js POS Backend is active.' });
});

// GET /api/products - Get all clothing items
app.get('/api/products', (req, res) => {
  const db = getDB();
  res.json(db.products || []);
});

// POST /api/products - Add or update product stock item
app.post('/api/products', (req, res) => {
  const newProd = req.body;
  const db = getDB();
  const existingIdx = db.products.findIndex((p) => p.id === newProd.id);

  if (existingIdx > -1) {
    db.products[existingIdx] = newProd;
  } else {
    db.products.unshift(newProd);
  }

  saveDB(db);
  res.json({ success: true, product: newProd });
});

// GET /api/next-bill-number - Generate unique bill number
app.get('/api/next-bill-number', (req, res) => {
  const db = getDB();
  const prefix = db.store_settings?.billPrefix || 'BILL-';

  const today = new Date();
  const dateStr =
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  let count = (db.bill_counter[dateStr] || 0) + 1;
  db.bill_counter[dateStr] = count;
  saveDB(db);

  const formattedCount = String(count).padStart(4, '0');
  const billNo = `${prefix}${dateStr}-${formattedCount}`;
  res.json({ billNo });
});

// POST /api/transactions - Process Sale & Deduct Inventory Stock
app.post('/api/transactions', (req, res) => {
  const tx = req.body;
  const db = getDB();

  // Deduct stock for purchased items
  if (Array.isArray(tx.items)) {
    tx.items.forEach((item) => {
      const prodIndex = db.products.findIndex((p) => p.id === item.id);
      if (prodIndex > -1) {
        db.products[prodIndex].stock = Math.max(0, db.products[prodIndex].stock - item.qty);
      }
    });
  }

  // Add transaction log
  db.transactions.unshift(tx);
  saveDB(db);

  res.json({ success: true, billNo: tx.billNo, products: db.products, transactions: db.transactions });
});

// GET /api/transactions - Get sales log for Owner Dashboard
app.get('/api/transactions', (req, res) => {
  const db = getDB();
  res.json(db.transactions || []);
});

// GET /api/settings & POST /api/settings - Store Profile & UPI settings
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json(db.store_settings || {});
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body;
  const db = getDB();
  db.store_settings = newSettings;
  saveDB(db);
  res.json({ success: true, settings: newSettings });
});

// POST /api/transactions/cancel - Cancel transaction
app.post('/api/transactions/cancel', (req, res) => {
  const { billNo } = req.body;
  const db = getDB();
  const tx = db.transactions.find((t) => t.billNo === billNo);
  if (tx) {
    tx.status = 'CANCELLED';
    saveDB(db);
  }
  res.json({ success: true, billNo });
});

// ── WORKER / CASHIER MANAGEMENT ────────────────────────────────────────────

// GET /api/workers - Get all cashier accounts
app.get('/api/workers', (req, res) => {
  const db = getDB();
  // Never return passwords to the client
  const safe = (db.workers || []).map(({ password, ...rest }) => rest);
  res.json(safe);
});

// GET /api/workers/all - Get all workers including password hash (owner only)
app.get('/api/workers/all', (req, res) => {
  const db = getDB();
  res.json(db.workers || []);
});

// POST /api/workers - Create or update a cashier account
app.post('/api/workers', (req, res) => {
  const worker = req.body;
  const db = getDB();
  if (!db.workers) db.workers = [];

  const idx = db.workers.findIndex((w) => w.id === worker.id);
  if (idx > -1) {
    // Keep existing password if not provided
    if (!worker.password) worker.password = db.workers[idx].password;
    db.workers[idx] = worker;
  } else {
    worker.id = worker.id || `worker-${Date.now()}`;
    db.workers.push(worker);
  }

  saveDB(db);
  const { password, ...safe } = worker;
  res.json({ success: true, worker: safe });
});

// DELETE /api/workers/:id - Remove a cashier account
app.delete('/api/workers/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  db.workers = (db.workers || []).filter((w) => w.id !== id);
  saveDB(db);
  res.json({ success: true, id });
});

// POST /api/workers/login - Verify cashier login
app.post('/api/workers/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  const worker = (db.workers || []).find(
    (w) => w.username === username && w.password === password && w.active !== false
  );
  if (worker) {
    const { password: _p, ...safe } = worker;
    res.json({ success: true, worker: safe });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Node.js Business Logic Server running at http://localhost:${PORT}`);
  console.log(`===================================================`);
});
