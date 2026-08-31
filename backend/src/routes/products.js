const express = require('express');
const { getDb } = require('../db/database');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all product routes
router.use(verifyApiKey);

// GET all products
router.get('/', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map(r => {
      let parsedSizes = [];
      try {
        parsedSizes = typeof r.sizes === 'string' ? JSON.parse(r.sizes) : (r.sizes || []);
      } catch (e) {
        parsedSizes = [];
      }
      return {
        ...r,
        sizes: parsedSizes,
      };
    });
    res.json(formatted);
  });
});

// CREATE / UPDATE product
router.post('/', (req, res) => {
  const { id, code, name, category, sizes, price, mrp, stock, barcode } = req.body;
  const db = getDb();
  const prodId = id || `prod-${Date.now()}`;
  const sizesJson = JSON.stringify(Array.isArray(sizes) ? sizes : []);

  db.run(
    `INSERT INTO products (id, code, name, category, sizes, price, mrp, stock, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       code = excluded.code,
       name = excluded.name,
       category = excluded.category,
       sizes = excluded.sizes,
       price = excluded.price,
       mrp = excluded.mrp,
       stock = excluded.stock,
       barcode = excluded.barcode`,
    [prodId, code, name, category, sizesJson, Number(price) || 0, Number(mrp) || 0, Number(stock) || 0, barcode],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: prodId,
        code,
        name,
        category,
        sizes: Array.isArray(sizes) ? sizes : [],
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        stock: Number(stock) || 0,
        barcode,
      });
    }
  );
});

// DELETE product
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;
