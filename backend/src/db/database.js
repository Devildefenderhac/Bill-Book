const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { encrypt, decrypt } = require('../utils/crypto');
let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch (e) { try { bcrypt = require('bcrypt'); } catch (e2) { } }

const dbPath = path.join(__dirname, 'database.sqlite');
let db;

const INITIAL_STORE_SETTINGS = {
  storeName: "ROYAL FASHION MALL",
  tagline: "Premier Clothing & Apparel Store",
  address: "ENC::f4532596c646227dbc33e95f9f595cab:ad62b8441ec1599c59406d6a40de0d723eed49a0decd1c678f3a061e4a9ff81b400b9ab077cfe7fcadf25a8dc9315870",
  city: "ENC::47e581ddac3eaeb7952d67a9bfb1ea6d:dc76c14a9cb573dc834086fb124f443f2ddf6fb79bea46a9fa5cfe56ecc1fcfa",
  phone: "ENC::29c5a93a0dade776af9f2da7e1d4e846:dabff5a675d57f5b0e74ac0d716e18af",
  gstin: "ENC::76dea13b38dd6eb8458617e8c7df044b:7b9a96ee6ae1125e7b4d43daef7dec0e",
  upiId: "ENC::f8ad1616630cf2a59f8bcc0f9a05b25e:1a038e77e97b5c249a0d0982b1eb575e95b6b7fc8c4143552199873137a5f99d",
  upiName: "ENC::07bcb4556aea5e2ee1612b7f3917e5a1:623a58b0eb0bb8af4b8dcd2495a9898f3671ceb686180bea2fd2657924f98a7f",
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
    customerName: "ENC::15efe0c0fe6e7851269004ee6818adbd:10557ee8f8df296271d34904792ed1d8",
    customerPhone: "ENC::29019d632aca43b8a8ad9d4eb9e52700:185ca8406447b471e0dd433d77a3c544",
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
    upiRefNo: "ENC::20d96e6b28e692fec8a7a5841fd89cf1:09da363d8a492edea8fae5d6b5f292f1c581d4610350888dbea379b07da57cf2",
    cardRefNo: "",
    workerName: "ENC::ce74329bfce13bc70159b8bf04d31c61:79cdeeeb8288c2f66831e0aa1aa22b8d",
    status: "COMPLETED",
    printCount: 1,
  },
  {
    billNo: "BILL-20260718-0002",
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    customerName: "ENC::2eb70bd23a02a3b708974606f282eb5b:402caba1588cc89f47ce034606801b4a",
    customerPhone: "ENC::c217f1a3f3552c1230c35113ae82a945:91afa4541e30b1a90c81b90894c07f50",
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
    workerName: "ENC::8edab74b69620c82da7da11bf6d694af:5d2de621a5d211376690225bb99f6fe2",
    status: "COMPLETED",
    printCount: 1,
  },
];

const INITIAL_WORKERS = [
  {
    id: "master-admin-01",
    username: "ENC::44fc56c902fe5e90e1bf7f02dfe78ec7:a3e0e91e3ea044ba14480b0817a0bc09",
    // 🔒 AES-256-CBC Encrypted Password
    password: "ENC::5f25fb6705d9063626be7ac82b060c22:0e369f87ce82932050523eaf92efa64b",
    name: "ENC::6e0cd35ee461a05dc843526aa254d0f2:e33d6b985b98ebeb70093322c76c13dc24d21f4a0494651f9bcb1135cb22230b",
    phone: "ENC::858945ced0d966f8e2bebb4a123d780a:552ead2ab06f013b625853e317b79281",
    role: "ENC::bbae6795a59f29fd132e493dde0af5bf:13986d2092a328596e3eafd22fbcc412",
    counter: "ENC::dcf3e844189687434b9df524a21a08fe:b378ce5df1b0fc07c17320039fab9bfbdaa36e94c503e06979f8a8a838e88c37",
    canCancelBills: 1,
    canAccessMarketing: 1,
  },
  {
    id: "worker-01",
    username: "ENC::c88e0454785c8c4be814c2d2136d8506:b53acfde039af4e994679e34b949e19f",
    // 🔒 AES-256-CBC Encrypted Password
    password: "ENC::91c59695eea69708ce9e50cca4476346:ee110c720a1371b589f67dff85bb870b",
    name: "ENC::c627f6b5530e749ba3dea59aadf84519:94b08afc8f707e2253712384c62c02f8",
    phone: "ENC::57a7f63afe7509eb0e68bf1ce3a6201d:e0ffc07cbedf744db17de665b57feabb",
    role: "ENC::c633625bca945ba925da5683bd99b634:79c087c30a62bc6b53dedc08587f28a4",
    counter: "ENC::7626cf7a025e8464bb397e31bf07f15d:c086e60a6f9f92e8786bf374a501037f",
    canCancelBills: 1,
    canAccessMarketing: 1,
  },
  {
    id: "worker-02",
    username: "ENC::035a6c2ec62335e032c70f91d5865954:6956fc80d16a01656f079f11c39fba2d",
    // 🔒 AES-256-CBC Encrypted Password
    password: "ENC::5b049a320318ab2c9694eb93aa3c4a00:9f5b02689804f83d1e521874a3639ec9",
    name: "ENC::f4ce7fcec9638456679614523488a2e7:6d2450d4136f3b880764cff09db1d93d",
    phone: "ENC::a77c28b26f7841c6da58da74ba3a43fe:82aa5b3cd9210ad3e15694b4fb26f1c6",
    role: "ENC::85cea7c88b2c6d1887243817e75e7b0d:1850e4e2a56c610d1bb7912711320c49",
    counter: "ENC::32f2ee29fd6da0d5d75ecf3eaef7f8a7:3210a7c6463e132f67b4821dbcb15785",
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

    // Safe column migrations for existing SQLite databases
    db.run("ALTER TABLE transactions ADD COLUMN returnDetails TEXT", () => { });
    db.run("ALTER TABLE transactions ADD COLUMN settlementDetails TEXT", () => { });
    db.run("ALTER TABLE transactions ADD COLUMN printCount INTEGER DEFAULT 1", () => { });

    // Seed workers only if empty
    db.get('SELECT COUNT(*) as count FROM workers', [], (err, row) => {
      if (!err && row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO workers (id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        INITIAL_WORKERS.forEach((w) => {
          stmt.run([
            w.id,
            decrypt(w.username) || w.username,
            w.password,
            decrypt(w.name) || w.name,
            w.phone,
            decrypt(w.role) || w.role,
            decrypt(w.counter) || w.counter,
            w.canCancelBills,
            w.canAccessMarketing
          ]);
        });
        stmt.finalize();
        console.log('✅ Seeded workers with encrypted data');
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
        console.log('✅ Seeded initial transactions with encrypted fields');
      }
    });

    console.log('✅ Database schema and seeding initialized');
  });
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb, INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS, INITIAL_WORKERS, INITIAL_TRANSACTIONS };
