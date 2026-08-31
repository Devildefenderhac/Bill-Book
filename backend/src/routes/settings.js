const express = require('express');
const { getDb, INITIAL_STORE_SETTINGS } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all settings routes
router.use(verifyApiKey);

function parseSettings(row) {
  if (!row) return INITIAL_STORE_SETTINGS;
  return {
    ...row,
    phone: decrypt(row.phone) || row.phone,
    gstin: decrypt(row.gstin) || row.gstin,
    upiId: decrypt(row.upiId) || row.upiId,
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

// UPDATE settings
router.post('/', (req, res) => {
  const { storeName, tagline, address, city, phone, gstin, upiId, upiName, billPrefix, receiptPaper, workerName } = req.body;
  const db = getDb();

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
      storeName,
      tagline,
      address,
      city,
      encrypt(phone || ''),
      encrypt(gstin || ''),
      encrypt(upiId || ''),
      upiName,
      billPrefix,
      receiptPaper,
      workerName,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, settings: req.body });
    }
  );
});

module.exports = router;
