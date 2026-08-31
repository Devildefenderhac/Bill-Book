const sqlite3 = require('sqlite3').verbose();
const path = require('path');
let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch (e) { try { bcrypt = require('bcrypt'); } catch (e2) { } }

const dbPath = path.join(__dirname, 'database.sqlite');
let db;

const INITIAL_STORE_SETTINGS = {
  storeName: "ROYAL FASHION MALL",
  tagline: "Premier Clothing & Apparel Store",
  address: "Grand Central Mall, Ground Floor, Main Road",
  city: "New Delhi, 110001",
  phone: "+91 98765 43210",
  gstin: "07AAACR1234F1Z5",
  upiId: "royalfashion@upi",
  upiName: "Royal Fashion Mall",
  billPrefix: "BILL-",
  receiptPaper: "80mm",
  workerName: "Cashier Counter 1",
};

const INITIAL_PRODUCTS = [
  {
    id: "prod-001",
    code: "TSH-M-101",
    name: "Classic Crew Neck Cotton T-Shirt",
    category: "Men",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: 699,
    mrp: 1299,
    stock: 45,
    barcode: "890100100101",
  },
  {
    id: "prod-002",
    code: "JNS-M-102",
    name: "Slim Fit Stretch Denim Jeans",
    category: "Men",
    sizes: ["30", "32", "34", "36"],
    price: 1899,
    mrp: 2999,
    stock: 28,
    barcode: "890100100102",
  },
  {
    id: "prod-003",
    code: "SRT-M-103",
    name: "Pure Linen Casual Button Shirt",
    category: "Men",
    sizes: ["M", "L", "XL"],
    price: 1499,
    mrp: 2299,
    stock: 30,
    barcode: "890100100103",
  },
  {
    id: "prod-004",
    code: "DRS-W-201",
    name: "Floral Print Chiffon Midi Dress",
    category: "Women",
    sizes: ["S", "M", "L", "XL"],
    price: 2199,
    mrp: 3499,
    stock: 18,
    barcode: "890100100201",
  },
  {
    id: "prod-005",
    code: "TOP-W-202",
    name: "Satin V-Neck Elegant Blouse",
    category: "Women",
    sizes: ["XS", "S", "M", "L"],
    price: 999,
    mrp: 1699,
    stock: 35,
    barcode: "890100100202",
  },
  {
    id: "prod-006",
    code: "JNS-W-203",
    name: "High-Waist Wide Leg Denim",
    category: "Women",
    sizes: ["26", "28", "30", "32"],
    price: 1799,
    mrp: 2799,
    stock: 22,
    barcode: "890100100203",
  },
  {
    id: "prod-007",
    code: "KID-B-301",
    name: "Boys Cartoon Printed Cotton Set",
    category: "Kids",
    sizes: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"],
    price: 799,
    mrp: 1299,
    stock: 50,
    barcode: "890100100301",
  },
  {
    id: "prod-008",
    code: "KID-G-302",
    name: "Girls Embroidered Party Frock",
    category: "Kids",
    sizes: ["3-4Y", "5-6Y", "7-8Y"],
    price: 1299,
    mrp: 1999,
    stock: 25,
    barcode: "890100100302",
  },
  {
    id: "prod-009",
    code: "ETH-M-401",
    name: "Silk Blend Kurta Pyjama Set",
    category: "Ethnic",
    sizes: ["38", "40", "42", "44"],
    price: 2499,
    mrp: 3999,
    stock: 15,
    barcode: "890100100401",
  },
  {
    id: "prod-010",
    code: "ETH-W-402",
    name: "Designer Anarkali Suit with Dupatta",
    category: "Ethnic",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: 3499,
    mrp: 5999,
    stock: 12,
    barcode: "890100100402",
  },
  {
    id: "prod-011",
    code: "ACC-001",
    name: "Genuine Leather Reversible Belt",
    category: "Accessories",
    sizes: ["Free Size"],
    price: 599,
    mrp: 999,
    stock: 60,
    barcode: "890100100501",
  },
  {
    id: "prod-012",
    code: "ACC-002",
    name: "Cotton Ankle Socks Pack of 3",
    category: "Accessories",
    sizes: ["Free Size"],
    price: 299,
    mrp: 499,
    stock: 80,
    barcode: "890100100502",
  },
];

const INITIAL_TRANSACTIONS = [
  {
    billNo: "BILL-20260718-0001",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    items: [
      {
        id: "prod-001",
        code: "TSH-M-101",
        name: "Classic Crew Neck Cotton T-Shirt",
        category: "Men",
        size: "L",
        price: 699,
        mrp: 1299,
        quantity: 2,
        discountPercent: 0,
        total: 1398,
      },
      {
        id: "prod-002",
        code: "JNS-M-102",
        name: "Slim Fit Stretch Denim Jeans",
        category: "Men",
        size: "32",
        price: 1899,
        mrp: 2999,
        quantity: 1,
        discountPercent: 10,
        total: 1709.1,
      },
    ],
    subtotal: 3297,
    discount: 189.9,
    grandTotal: 3107.1,
    paymentMode: "UPI",
    paymentStatus: "PAID",
    pendingAmount: 0,
    advanceAmount: 0,
    cashTendered: 0,
    changeReturned: 0,
    upiRefNo: "UPI/620199283711",
    cardRefNo: "",
    workerName: "Store Owner",
    status: "COMPLETED",
    printCount: 1,
  },
  {
    billNo: "BILL-20260718-0002",
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    customerName: "Priya Patel",
    customerPhone: "9812345678",
    items: [
      {
        id: "prod-004",
        code: "DRS-W-201",
        name: "Floral Print Chiffon Midi Dress",
        category: "Women",
        size: "M",
        price: 2199,
        mrp: 3499,
        quantity: 1,
        discountPercent: 5,
        total: 2089.05,
      },
    ],
    subtotal: 2199,
    discount: 109.95,
    grandTotal: 2089.05,
    paymentMode: "CASH",
    paymentStatus: "PAID",
    pendingAmount: 0,
    advanceAmount: 0,
    cashTendered: 2100,
    changeReturned: 10.95,
    upiRefNo: "",
    cardRefNo: "",
    workerName: "Store Owner",
    status: "COMPLETED",
    printCount: 1,
  },
];

const INITIAL_WORKERS = [
  {
    id: "master-admin-01",
    username: "devil7061",
    // 🔒 Cryptographic bcrypt password hash
    password: "$2b$10$R/H3DR6oo55xuzoDpPbylO77V2G5PKhLa8VetT7xP/gmJqeMSjqSi",
    name: "Devil Master Admin",
    phone: "ENC::38c5f23cdc1d1afae8498d58328ad38b:d2c89ab72c2a1be1cb2ef9505ab3e78d",
    role: "master_admin",
    counter: "Master Dashboard",
    canCancelBills: 1,
    canAccessMarketing: 1,
  },
  {
    id: "worker-01",
    username: "yankit10",
    // 🔒 Cryptographic bcrypt password hash
    password: "$2b$10$De/TVfp8EyQDq1BVP5OpQeDEpnj7uNKS668z9bqizkI5SSZktiQsO",
    name: "Yankit",
    phone: "ENC::256a2b94b733b47ee0be29860b7ed865:b7c6ccbd4c94753bf0b746e3830935ff",
    role: "Cashier",
    counter: "1",
    canCancelBills: 1,
    canAccessMarketing: 1,
  },
  {
    id: "worker-02",
    username: "suchit10",
    // 🔒 Cryptographic bcrypt password hash
    password: "$2b$10$Vuvk/A6i4nzwOSJXM64l2O8C0GH07Ll3c72V3UmozxR/TTqu63zpm",
    name: "Suchit",
    phone: "ENC::918e85ed0ba66fd30438bc2dccf8ae92:b3dc55ad3d14ab42bbcbbdd43351dfda",
    role: "Admin",
    counter: "Admin 1",
    canCancelBills: 1,
    canAccessMarketing: 1,
  },
];

function initDb() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite DB:', err);
      process.exit(1);
    }
    console.log('📂 SQLite DB opened at', dbPath);
  });

  db.serialize(() => {
    // Workers / Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        phone TEXT,
        role TEXT,
        counter TEXT,
        canCancelBills INTEGER DEFAULT 0,
        canAccessMarketing INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Products Table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT NOT NULL,
        category TEXT,
        sizes TEXT,
        price REAL NOT NULL,
        mrp REAL,
        stock INTEGER NOT NULL DEFAULT 0,
        barcode TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Settings Table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        storeName TEXT,
        tagline TEXT,
        address TEXT,
        city TEXT,
        phone TEXT,
        gstin TEXT,
        upiId TEXT,
        upiName TEXT,
        billPrefix TEXT,
        receiptPaper TEXT,
        workerName TEXT
      )
    `);

    // Transactions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billNo TEXT UNIQUE,
        timestamp TEXT,
        customerName TEXT,
        customerPhone TEXT,
        items TEXT,
        subtotal REAL,
        discount REAL,
        grandTotal REAL,
        paymentMode TEXT,
        paymentStatus TEXT,
        pendingAmount REAL DEFAULT 0,
        advanceAmount REAL DEFAULT 0,
        cashTendered REAL DEFAULT 0,
        changeReturned REAL DEFAULT 0,
        upiRefNo TEXT,
        cardRefNo TEXT,
        workerName TEXT,
        status TEXT DEFAULT 'COMPLETED',
        printCount INTEGER DEFAULT 1,
        returnDetails TEXT,
        settlementDetails TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Seed workers only if empty — hash master admin password before storing
    db.get('SELECT COUNT(*) as count FROM workers', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO workers (id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        INITIAL_WORKERS.forEach((w) => {
          // Hash password with bcrypt before persisting to DB
          let hashedPass = w.password;
          if (bcrypt && w.password && !w.password.startsWith('$2')) {
            try { hashedPass = bcrypt.hashSync(w.password, 10); } catch (e) { }
          }
          stmt.run([w.id, w.username, hashedPass, w.name, w.phone, w.role, w.counter, w.canCancelBills, w.canAccessMarketing]);
        });
        stmt.finalize();
        console.log('✅ Seeded master admin with hashed password');
      }
    });

    // Seed settings
    db.get('SELECT COUNT(*) as count FROM settings', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const s = INITIAL_STORE_SETTINGS;
        db.run(
          `INSERT OR IGNORE INTO settings (id, storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.storeName, s.tagline, s.address, s.city, s.phone, s.gstin, s.upiId, s.upiName, s.billPrefix, s.receiptPaper, s.workerName]
        );
      }
    });

    // Seed products (all 12 products) if empty
    db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO products (id, code, name, category, sizes, price, mrp, stock, barcode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        INITIAL_PRODUCTS.forEach((p) => {
          stmt.run([p.id, p.code, p.name, p.category, JSON.stringify(p.sizes), p.price, p.mrp, p.stock, p.barcode]);
        });
        stmt.finalize();
      }
    });

    // Seed transactions if empty
    db.get('SELECT COUNT(*) as count FROM transactions', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO transactions (
            billNo, timestamp, customerName, customerPhone, items,
            subtotal, discount, grandTotal, paymentMode, paymentStatus,
            pendingAmount, advanceAmount, cashTendered, changeReturned,
            upiRefNo, cardRefNo, workerName, status, printCount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        INITIAL_TRANSACTIONS.forEach((tx) => {
          stmt.run([
            tx.billNo,
            tx.timestamp,
            tx.customerName,
            tx.customerPhone,
            JSON.stringify(tx.items),
            tx.subtotal,
            tx.discount,
            tx.grandTotal,
            tx.paymentMode,
            tx.paymentStatus,
            tx.pendingAmount,
            tx.advanceAmount,
            tx.cashTendered,
            tx.changeReturned,
            tx.upiRefNo,
            tx.cardRefNo,
            tx.workerName,
            tx.status,
            tx.printCount,
          ]);
        });
        stmt.finalize();
        console.log('✅ Seeded initial transactions');
      }
    });

    console.log('✅ Database schema and seeding initialized');
  });
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb, INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS, INITIAL_TRANSACTIONS };
