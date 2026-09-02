const express = require('express');
const { getDb, saveLiveSnapshot } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');
const { verifyApiKey, requireRole } = require('../middleware/auth');
const router = express.Router();

// Apply API key security to all worker routes
router.use(verifyApiKey);

let bcrypt = null;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  try {
    bcrypt = require('bcrypt');
  } catch (e2) {}
}

// Helper: hash a plaintext password with bcrypt (10 rounds)
function hashPassword(plainText) {
  if (!plainText) return plainText;
  const str = String(plainText).trim();
  if (str.startsWith('$2')) return str; // Already a bcrypt hash
  if (bcrypt) {
    try {
      return bcrypt.hashSync(str, 10);
    } catch (e) {
      console.error('bcrypt hash error:', e);
    }
  }
  return encrypt(str);
}

// Helper: compare password against stored (handles bcrypt hash, AES ENC::, and exact match)
function comparePassword(inputPass, storedPass) {
  if (!inputPass || !storedPass) return false;
  const input = String(inputPass).trim();
  const stored = String(storedPass).trim();

  // If stored as bcrypt hash directly ($2a$ or $2b$)
  if (stored.startsWith('$2') && bcrypt) {
    try {
      if (bcrypt.compareSync(input, stored)) return true;
    } catch (e) {}
  }

  // If stored with AES ENC:: prefix, decrypt first
  const decryptedStored = stored.startsWith('ENC::') ? decrypt(stored) : stored;

  if (decryptedStored.startsWith('$2') && bcrypt) {
    try {
      if (bcrypt.compareSync(input, decryptedStored)) return true;
    } catch (e) {}
  }

  // Direct comparison against plaintext or decrypted password
  return decryptedStored === input || stored === input;
}

// GET all workers (with sanitized password exposure for security)
router.get('/all', (req, res) => {
  const db = getDb();
  db.all('SELECT id, username, name, phone, role, counter, canCancelBills, canAccessMarketing, created_at FROM workers ORDER BY created_at ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = (rows || []).map((r) => {
      const decRole = decrypt(r.role) || r.role || 'Cashier';
      const isMasterAdminRole = decRole === 'master_admin' || r.id === 'master-admin-01';
      return {
        id: r.id,
        username: decrypt(r.username) || r.username,
        name: decrypt(r.name) || r.name,
        phone: decrypt(r.phone) || r.phone,
        role: isMasterAdminRole ? 'master_admin' : decRole,
        counter: decrypt(r.counter) || r.counter || (isMasterAdminRole ? 'Master Dashboard' : 'Counter 1'),
        canCancelBills: !!r.canCancelBills,
        canAccessMarketing: !!r.canAccessMarketing,
        created_at: r.created_at,
      };
    });
    res.json(formatted);
  });
});

// LOGIN worker / admin with centralized database authentication
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username or Account ID is required' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  const db = getDb();

  db.all('SELECT * FROM workers', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const workersList = rows || [];

    // Find matched worker by username, phone, or id (case-insensitive & parameterized)
    let matched = workersList.find((w) => {
      const u = String(decrypt(w.username) || w.username || '').trim().toLowerCase();
      const p = String(decrypt(w.phone) || w.phone || '').trim().toLowerCase();
      const id = String(w.id || '').trim().toLowerCase();
      return u === cleanUser || p === cleanUser || id === cleanUser;
    });

    if (!matched) {
      return res.status(401).json({ success: false, message: 'Invalid Account ID or Password. Account does not exist in store database.' });
    }

    const storedPass = String(matched.password || '').trim();
    let isPasswordValid = false;

    // Verify cryptographic credentials
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
        role: isMasterAdminRole ? 'master_admin' : isAdminRole ? 'admin' : 'cashier',
        counter: decrypt(matched.counter) || matched.counter || (isMasterAdminRole ? 'Master Dashboard' : isAdminRole ? 'Admin 1' : '1'),
        canCancelBills: !!matched.canCancelBills,
        canAccessMarketing: !!matched.canAccessMarketing,
      },
    });
  });
});

// CREATE / UPDATE worker (Protected with parameterized queries)
router.post('/', (req, res) => {
  const { id, username, password, name, phone, role, counter, canCancelBills, canAccessMarketing } = req.body;
  const db = getDb();
  const workerId = id || `w-${Date.now()}`;

  // Determine if password was provided
  const hasNewPassword = password !== undefined && password !== null && String(password).trim() !== '';
  const finalPassword = hasNewPassword ? hashPassword(String(password).trim()) : null;

  db.get('SELECT id, password FROM workers WHERE id = ?', [workerId], (findErr, existingRow) => {
    if (findErr) return res.status(500).json({ error: findErr.message });

    if (existingRow) {
      // UPDATE existing worker
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

      updateValues.push(workerId);

      db.run(
        `UPDATE workers SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues,
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          console.log(`✅ Worker updated: ${username} (id: ${workerId})`);
          saveLiveSnapshot(db);
          res.json({
            success: true,
            worker: {
              id: workerId,
              username,
              name,
              phone,
              role: role || 'cashier',
              counter: counter || (role === 'master_admin' ? 'Master Dashboard' : 'Counter 1'),
              canCancelBills: !!canCancelBills,
              canAccessMarketing: !!canAccessMarketing,
            },
          });
        }
      );
    } else {
      // INSERT new worker
      const plainPass = hasNewPassword ? String(password).trim() : '1234';
      const insertPassword = hashPassword(plainPass);

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
          console.log(`✅ Worker account created on central database: ${username} (id: ${workerId})`);
          saveLiveSnapshot(db);
          res.json({
            success: true,
            worker: {
              id: workerId,
              username,
              name,
              phone,
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

// DELETE worker (Admin protected)
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM workers WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    saveLiveSnapshot(db);
    res.json({ success: true, deleted: this.changes });
  });
});

module.exports = router;



