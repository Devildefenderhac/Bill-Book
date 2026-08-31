const express = require('express');
const { getDb } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all transaction routes
router.use(verifyApiKey);

function parseTx(row) {
  if (!row) return null;
  let items = [];
  let returnDetails = null;
  let settlementDetails = null;
  let settledHistory = [];
  try {
    items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
  } catch (e) {
    items = [];
  }
  try {
    returnDetails = typeof row.returnDetails === 'string' ? JSON.parse(row.returnDetails) : row.returnDetails;
  } catch (e) {}
  try {
    settlementDetails = typeof row.settlementDetails === 'string' ? JSON.parse(row.settlementDetails) : row.settlementDetails;
    if (settlementDetails) {
      if (Array.isArray(settlementDetails.history)) {
        settledHistory = settlementDetails.history;
      } else if (settlementDetails.amountPaid) {
        settledHistory = [{
          amount: Number(settlementDetails.amountPaid) || 0,
          paymentMode: settlementDetails.settlementPaymentMode || 'CASH',
          settledBy: settlementDetails.settledBy || 'Store Owner',
          timestamp: settlementDetails.timestamp,
        }];
      }
    }
  } catch (e) {}

  return {
    ...row,
    customerName: decrypt(row.customerName) || row.customerName,
    customerPhone: decrypt(row.customerPhone) || row.customerPhone,
    upiRefNo: decrypt(row.upiRefNo) || row.upiRefNo,
    cardRefNo: decrypt(row.cardRefNo) || row.cardRefNo,
    items,
    returnDetails,
    settlementDetails,
    settledHistory,
  };
}

// GET all transactions
router.get('/', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM transactions ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json((rows || []).map(parseTx));
  });
});

// PROCESS new transaction / sale (with automatic unique billNo assignment & deduplication)
router.post('/', (req, res) => {
  const tx = req.body;
  const db = getDb();

  const today = new Date();
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  const dateStr = `${d}${m}${y}`;

  db.get('SELECT billPrefix FROM settings WHERE id = 1', [], (sErr, sRow) => {
    const prefix = (sRow && sRow.billPrefix) || 'BILL-';
    const pattern = `${prefix}${dateStr}-%`;

    db.all('SELECT id, billNo, timestamp FROM transactions WHERE billNo LIKE ?', [pattern], (allErr, rows) => {
      let finalBillNo = tx.billNo;
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

      const existingMatch = (rows || []).find((r) => r.billNo === finalBillNo);

      // If billNo is empty or already taken by another transaction, generate next unique sequence
      if (!finalBillNo || (existingMatch && existingMatch.timestamp !== tx.timestamp)) {
        maxSeq++;
        finalBillNo = `${prefix}${dateStr}-${String(maxSeq).padStart(4, '0')}`;
      }

      const itemsJson = JSON.stringify(tx.items || []);
      const returnDetailsJson = tx.returnDetails ? JSON.stringify(tx.returnDetails) : null;
      const settlementDetailsJson = tx.settlementDetails ? JSON.stringify(tx.settlementDetails) : null;

      // Upsert transaction
      db.run(
        `INSERT INTO transactions (
          billNo, timestamp, customerName, customerPhone, items,
          subtotal, discount, grandTotal, paymentMode, paymentStatus,
          pendingAmount, advanceAmount, cashTendered, changeReturned,
          upiRefNo, cardRefNo, workerName, status, printCount, returnDetails, settlementDetails
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(billNo) DO UPDATE SET
          status = excluded.status,
          items = excluded.items,
          subtotal = excluded.subtotal,
          discount = excluded.discount,
          grandTotal = excluded.grandTotal,
          paymentMode = excluded.paymentMode,
          paymentStatus = excluded.paymentStatus,
          pendingAmount = excluded.pendingAmount,
          advanceAmount = excluded.advanceAmount,
          cashTendered = excluded.cashTendered,
          changeReturned = excluded.changeReturned,
          returnDetails = COALESCE(excluded.returnDetails, transactions.returnDetails),
          settlementDetails = COALESCE(excluded.settlementDetails, transactions.settlementDetails)`,
        [
          finalBillNo,
          tx.timestamp || new Date().toISOString(),
          encrypt(tx.customerName || 'Walk-in Customer'),
          encrypt(tx.customerPhone || ''),
          itemsJson,
          Number(tx.subtotal) || 0,
          Number(tx.discount) || 0,
          Number(tx.grandTotal) || 0,
          tx.paymentMode || 'CASH',
          tx.paymentStatus || 'PAID',
          Number(tx.pendingAmount) || 0,
          Number(tx.advanceAmount) || 0,
          Number(tx.cashTendered) || 0,
          Number(tx.changeReturned) || 0,
          encrypt(tx.upiRefNo || ''),
          encrypt(tx.cardRefNo || ''),
          tx.workerName || 'Store Owner',
          tx.status || 'COMPLETED',
          Number(tx.printCount) || 1,
          returnDetailsJson,
          settlementDetailsJson,
        ],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // Deduct stock for sold items
          if (Array.isArray(tx.items)) {
            tx.items.forEach((item) => {
              if (item.id && (item.qty || item.quantity)) {
                db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [Number(item.qty || item.quantity) || 1, item.id]);
              }
            });
          }

          // Return updated products and transactions
          db.all('SELECT * FROM products ORDER BY created_at DESC', [], (pErr, prodRows) => {
            db.all('SELECT * FROM transactions ORDER BY timestamp DESC', [], (tErr, txRows) => {
              const prods = (prodRows || []).map((r) => {
                let sizes = [];
                try { sizes = JSON.parse(r.sizes); } catch (e) {}
                return { ...r, sizes };
              });
              const txs = (txRows || []).map(parseTx);
              res.json({ success: true, billNo: finalBillNo, products: prods, transactions: txs });
            });
          });
        }
      );
    });
  });
});

// CANCEL transaction
router.post('/cancel', (req, res) => {
  const { billNo, id } = req.body;
  const db = getDb();

  db.get('SELECT * FROM transactions WHERE billNo = ? OR id = ?', [billNo, id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Transaction not found' });
    const tx = parseTx(row);

    db.run("UPDATE transactions SET status = 'CANCELLED' WHERE billNo = ? OR id = ?", [billNo, id], function (uErr) {
      if (uErr) return res.status(500).json({ error: uErr.message });

      // Restore stock
      if (Array.isArray(tx.items)) {
        tx.items.forEach((item) => {
          if (item.id && item.quantity) {
            db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [Number(item.quantity) || 1, item.id]);
          }
        });
      }

      res.json({ success: true });
    });
  });
});

// UNCANCEL transaction
router.post('/uncancel', (req, res) => {
  const { billNo, id } = req.body;
  const db = getDb();

  db.get('SELECT * FROM transactions WHERE billNo = ? OR id = ?', [billNo, id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Transaction not found' });
    const tx = parseTx(row);

    db.run("UPDATE transactions SET status = 'COMPLETED' WHERE billNo = ? OR id = ?", [billNo, id], function (uErr) {
      if (uErr) return res.status(500).json({ error: uErr.message });

      // Re-deduct stock
      if (Array.isArray(tx.items)) {
        tx.items.forEach((item) => {
          if (item.id && item.quantity) {
            db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [Number(item.quantity) || 1, item.id]);
          }
        });
      }

      res.json({ success: true });
    });
  });
});

// RETURN transaction items
router.post('/return', (req, res) => {
  const { billNo, returnedItems, workerName, refundMode, upiRefundRef, originalPaymentMode, refundTotal } = req.body;
  const db = getDb();

  db.get('SELECT * FROM transactions WHERE billNo = ?', [billNo], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Transaction not found' });
    const originalTx = parseTx(row);

    const totalBilledQty = (originalTx.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    const totalReturnedQty = (returnedItems || []).reduce((s, i) => s + Number(i.returnQty || i.returnedQty || i.quantity || 1), 0);
    const newStatus = totalReturnedQty >= totalBilledQty ? 'RETURNED' : 'PARTIALLY_RETURNED';

    const updatedItems = (originalTx.items || []).map((item) => {
      const ret = (returnedItems || []).find((r) => r.id === item.id);
      return ret ? { ...item, returnedQty: Number(ret.returnQty || ret.returnedQty || 1) } : item;
    });

    const returnDetails = {
      returnedItems,
      returnedBy: workerName,
      refundMode,
      upiRefundRef,
      originalPaymentMode,
      refundAmount: Number(refundTotal) || (returnedItems || []).reduce((s, i) => s + (Number(i.returnQty || i.returnedQty || 1) * (Number(i.price) || 0)), 0),
      timestamp: new Date().toISOString(),
    };

    db.run(
      "UPDATE transactions SET status = ?, items = ?, returnDetails = ? WHERE billNo = ?",
      [newStatus, JSON.stringify(updatedItems), JSON.stringify(returnDetails), billNo],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });

        // Restore stock for returned items
        if (Array.isArray(returnedItems)) {
          returnedItems.forEach((item) => {
            const qtyToRestore = Number(item.returnQty || item.returnedQty || item.quantity || item.qty || 1);
            if (item.id) {
              db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [qtyToRestore, item.id]);
            }
          });
        }

        const returnTx = {
          ...originalTx,
          status: newStatus,
          items: updatedItems,
          returnDetails,
          refundAmount: returnDetails.refundAmount,
          refundMode,
          upiRefundRef,
          originalPaymentMode,
        };

        res.json({ success: true, originalTx: returnTx, returnTx });
      }
    );
  });
});

// SETTLE pending transaction
router.post('/settle', (req, res) => {
  const { billNo, id, amountPaid, paymentMode, settledBy } = req.body;
  const db = getDb();

  db.get('SELECT * FROM transactions WHERE billNo = ? OR id = ?', [billNo, id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Transaction not found' });
    const currentPending = Number(row.pendingAmount) || 0;
    const currentAdvance = Number(row.advanceAmount) || 0;
    const paid = Number(amountPaid) || 0;
    const newPending = Math.max(0, currentPending - paid);
    const newAdvance = currentAdvance + paid;
    const newStatus = newPending === 0 ? 'PAID' : 'PENDING';

    let prevHistory = [];
    try {
      const prevDetails = typeof row.settlementDetails === 'string' ? JSON.parse(row.settlementDetails) : row.settlementDetails;
      if (prevDetails && Array.isArray(prevDetails.history)) {
        prevHistory = prevDetails.history;
      } else if (prevDetails && prevDetails.amountPaid) {
        prevHistory = [{
          amount: Number(prevDetails.amountPaid) || 0,
          paymentMode: prevDetails.settlementPaymentMode || 'CASH',
          settledBy: prevDetails.settledBy || 'Store Owner',
          timestamp: prevDetails.timestamp,
        }];
      }
    } catch (e) {}

    const newEntry = {
      amount: paid,
      paymentMode: paymentMode || 'CASH',
      settledBy: settledBy || 'Store Owner',
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...prevHistory, newEntry];

    const settlementDetails = {
      settledBy: settledBy || 'Store Owner',
      amountPaid: paid,
      settlementPaymentMode: paymentMode,
      timestamp: newEntry.timestamp,
      history: updatedHistory,
    };

    db.run(
      `UPDATE transactions
       SET pendingAmount = ?, advanceAmount = ?, paymentStatus = ?, settlementDetails = ?
       WHERE billNo = ? OR id = ?`,
      [newPending, newAdvance, newStatus, JSON.stringify(settlementDetails), billNo, id],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({
          success: true,
          newPending,
          newAdvance,
          paymentStatus: newStatus,
          settledHistory: updatedHistory,
        });
      }
    );
  });
});

// INCREMENT print count
router.post('/increment-print', (req, res) => {
  const { id, billNo } = req.body;
  const db = getDb();

  db.run(
    'UPDATE transactions SET printCount = COALESCE(printCount, 0) + 1 WHERE id = ? OR billNo = ?',
    [id, billNo],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM transactions WHERE id = ? OR billNo = ?', [id, billNo], (gErr, row) => {
        res.json({ success: true, tx: parseTx(row) });
      });
    }
  );
});

module.exports = router;
