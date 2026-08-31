const express = require('express');
const { getDb } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { verifyApiKey } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all worker routes (localhost bypass allows Electron internal traffic)
router.use(verifyApiKey);

let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  try {
    bcrypt = require('bcrypt');
  } catch (e2) {}
}

// Helper: hash a plaintext password with bcrypt
function hashPassword(plainText) {
  if (!plainText || !bcrypt) return plainText;
  if (String(plainText).startsWith('$2')) return plainText; // Already hashed
  try {
    return bcrypt.hashSync(String(plainText).trim(), 10);
  } catch (e) {
    console.error('bcrypt hash error:', e);
    return plainText;
  }
}

// Helper: compare password against stored (handles AES-encrypted, bcrypt hash, and legacy plaintext)
function comparePassword(inputPass, storedPass) {
  if (!inputPass || !storedPass) return false;
  const input = String(inputPass).trim();
  const stored = String(storedPass).trim();

  // If stored with AES ENC:: prefix, decrypt first
  const decryptedStored = stored.startsWith('ENC::') ? decrypt(stored) : stored;

  // Try bcrypt comparison if stored was a bcrypt hash ($2...)
  if (decryptedStored.startsWith('$2') && bcrypt) {
    try {
      return bcrypt.compareSync(input, decryptedStored);
    } catch (e) {
      return false;
    }
  }

  // Exact password match
  return decryptedStored === input;
}

// GET all workers
router.get('/all', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM workers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => {
      const decRole = decrypt(r.role) || r.role || 'Cashier';
      const isMasterAdminRole = decRole === 'master_admin' || r.id === 'master-admin-01';
      return {
        ...r,
        username: decrypt(r.username) || r.username,
        name: decrypt(r.name) || r.name,
        phone: decrypt(r.phone) || r.phone,
        password: decrypt(r.password) || r.password,
        role: isMasterAdminRole ? 'master_admin' : decRole,
        counter: decrypt(r.counter) || r.counter || (isMasterAdminRole ? 'Master Dashboard' : 'Counter 1'),
        canCancelBills: !!r.canCancelBills,
        canAccessMarketing: !!r.canAccessMarketing,
      };
    });
    res.json(formatted);
  });
});

// LOGIN worker / admin with database authentication
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  const db = getDb();

  db.all('SELECT * FROM workers', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const workersList = rows || [];

    // Find matched worker by username, phone, or id (case-insensitive)
    let matched = workersList.find((w) => {
      const u = String(decrypt(w.username) || w.username || '').trim().toLowerCase();
      const p = String(decrypt(w.phone) || w.phone || '').trim().toLowerCase();
      const id = String(w.id || '').trim().toLowerCase();
      return u === cleanUser || p === cleanUser || id === cleanUser;
    });

    if (!matched) {
      return res.status(401).json({ success: false, message: 'Invalid Account ID or Password. Account does not exist.' });
    }

    const storedPass = String(matched.password || '').trim();
    let isPasswordValid = false;

    // Cryptographic verification (bcrypt hash comparison or stored hash)
    if (storedPass && comparePassword(cleanPass, storedPass)) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Account ID or Password. Please check and try again.',
      });
    }

    const workerRole = decrypt(matched.role) || matched.role || 'Cashier';
    const isMasterAdminRole = workerRole === 'master_admin' || matched.id === 'master-admin-01';
    const isAdminRole =
      workerRole === 'Admin' ||
      workerRole === 'admin' ||
      workerRole === 'Owner' ||
      workerRole === 'owner';

    res.json({
      success: true,
      worker: {
        id: matched.id,
        username: decrypt(matched.username) || matched.username,
        name: decrypt(matched.name) || matched.name,
        phone: decrypt(matched.phone) || matched.phone,
        password: decrypt(matched.password) || matched.password,
        role: isMasterAdminRole ? 'master_admin' : isAdminRole ? 'admin' : 'cashier',
        counter: decrypt(matched.counter) || matched.counter || (isMasterAdminRole ? 'Master Dashboard' : isAdminRole ? 'Admin 1' : '1'),
        canCancelBills: !!matched.canCancelBills,
        canAccessMarketing: !!matched.canAccessMarketing,
      },
    });
  });
});

// CREATE / UPDATE worker
router.post('/', (req, res) => {
  const { id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing } = req.body;
  const db = getDb();
  const workerId = id || `w-${Date.now()}`;

  // Determine if password was provided (non-empty string)
  const hasNewPassword = password !== undefined && password !== null && String(password).trim() !== '';
  const finalPassword = hasNewPassword ? encrypt(String(password).trim()) : null;

  // Check if this worker already exists in DB — use UPDATE for existing, INSERT for new
  db.get('SELECT id, password FROM workers WHERE id = ?', [workerId], (findErr, existingRow) => {
    if (findErr) return res.status(500).json({ error: findErr.message });

    if (existingRow) {
      // UPDATE existing worker — only update password if a new one was provided
      const updateFields = [
        'username = ?',
        'name = ?',
        'phone = ?',
        'role = ?',
        'counter = ?',
        'canCancelBills = ?',
        'canAccessMarketing = ?',
      ];
      const updateValues = [
        username,
        name,
        encrypt(phone || ''),
        role || 'cashier',
        counter || (role === 'master_admin' ? 'Master Dashboard' : 'Counter 1'),
        canCancelBills ? 1 : 0,
        canAccessMarketing ? 1 : 0,
      ];

      if (hasNewPassword && finalPassword) {
        updateFields.push('password = ?');
        updateValues.push(finalPassword);
      }

      updateValues.push(workerId); // WHERE clause

      db.run(
        `UPDATE workers SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues,
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          console.log(`✅ Worker updated: ${username} (id: ${workerId}), password changed: ${hasNewPassword}`);
          const storedOrUpdatedPass = hasNewPassword ? String(password).trim() : (decrypt(existingRow.password) || existingRow.password);
          res.json({
            success: true,
            worker: {
              id: workerId,
              username,
              name,
              phone,
              password: storedOrUpdatedPass,
              role: role || 'cashier',
              counter: counter || (role === 'master_admin' ? 'Master Dashboard' : 'Counter 1'),
              canCancelBills: !!canCancelBills,
              canAccessMarketing: !!canAccessMarketing,
            },
          });
        }
      );
    } else {
      // INSERT new worker — password is required
      const plainPass = hasNewPassword ? String(password).trim() : '1234';
      const insertPassword = encrypt(plainPass);

      db.run(
        `INSERT INTO workers (id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workerId,
          username,
          insertPassword,
          name,
          encrypt(phone || ''),
          role || 'cashier',
          counter || (role === 'master_admin' ? 'Master Dashboard' : 'Counter 1'),
          canCancelBills ? 1 : 0,
          canAccessMarketing ? 1 : 0,
        ],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          console.log(`✅ Worker created: ${username} (id: ${workerId})`);
          res.json({
            success: true,
            worker: {
              id: workerId,
              username,
              name,
              phone,
              password: plainPass,
              role: role || 'cashier',
              counter: counter || (role === 'master_admin' ? 'Master Dashboard' : 'Counter 1'),
              canCancelBills: !!canCancelBills,
              canAccessMarketing: !!canAccessMarketing,
            },
          });
        }
      );
    }
  });
});

// DELETE worker
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM workers WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;

