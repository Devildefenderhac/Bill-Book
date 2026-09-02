const express = require('express');
const { getDb, saveLiveSnapshot, INITIAL_STORE_SETTINGS } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all settings routes
router.use(verifyApiKey);

function parseSettings(row) {
  if (!row) return INITIAL_STORE_SETTINGS;
  return {
    ...row,
    address: decrypt(row.address) || row.address,
    city: decrypt(row.city) || row.city,
    phone: decrypt(row.phone) || row.phone,
    gstin: decrypt(row.gstin) || row.gstin,
    upiId: decrypt(row.upiId) || row.upiId,
    upiName: decrypt(row.upiName) || row.upiName,
  };
}

// GET settings
router.get('/', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json(INITIAL_STORE_SETTINGS);
    res.json(parseSettings(row));
  });
});

// UPDATE settings (with strict compulsory fields validation)
router.post('/', (req, res) => {
  const { storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName } = req.body;
  const db = getDb();

  const cleanStoreName = (storeName || '').trim();
  const cleanAddress = (address || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanUpiId = (upiId || '').trim();

  if (!cleanStoreName) {
    return res.status(400).json({ error: 'Store Name is compulsory' });
  }

  if (!cleanAddress) {
    return res.status(400).json({ error: 'Mall Address is compulsory' });
  }

  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Contact Phone must be exactly 10 digits' });
  }

  if (!cleanUpiId || !cleanUpiId.includes('@')) {
    return res.status(400).json({ error: 'Valid Store UPI VPA ID is compulsory' });
  }

  db.run(
    `INSERT INTO settings (id, storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       storeName = excluded.storeName,
       tagline = excluded.tagline,
       address = excluded.address,
       city = excluded.city,
       phone = excluded.phone,
       gstin = excluded.gstin,
       upiId = excluded.upiId,
       upiName = excluded.upiName,
       billPrefix = excluded.billPrefix,
       receiptPaper = excluded.receiptPaper,
       workerName = excluded.workerName`,
    [
      cleanStoreName,
      tagline || '',
      encrypt(cleanAddress),
      encrypt(city || ''),
      encrypt(cleanPhone),
      encrypt(gstin || ''),
      encrypt(cleanUpiId),
      encrypt(upiName || ''),
      billPrefix || 'BILL-',
      receiptPaper || '80mm',
      workerName || 'Cashier Counter 1',
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      saveLiveSnapshot(db);
      res.json({ success: true, settings: req.body });
    }
  );
});

module.exports = router;

