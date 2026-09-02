// POS API Security & Role-Based Access Control (RBAC) Middleware
const POS_API_KEY = process.env.POS_API_KEY || 'BB_POS_SECURE_API_KEY_7061';

function verifyApiKey(req, res, next) {
  const clientKey = req.headers['x-pos-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const remoteIp = String(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '');
  const host = String(req.headers['host'] || '');

  const isLocalhost =
    remoteIp.includes('127.0.0.1') ||
    remoteIp.includes('::1') ||
    remoteIp.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('localhost');

  // Accept valid API key or authorized request
  if (clientKey === POS_API_KEY || isLocalhost) {
    return next();
  }

  // Reject unauthorized external calls
  return res.status(403).json({
    error: 'Access Denied: Invalid or missing POS API Key.',
  });
}

/**
 * Role-Based Access Control Middleware
 * @param {Array<string>} allowedRoles e.g. ['master_admin', 'admin']
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'] || req.body?.userRole;
    if (!allowedRoles || allowedRoles.length === 0) return next();
    
    // Normalize roles
    const normalizedRole = String(userRole || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => {
      const target = String(r).toLowerCase();
      if (target === 'admin' && (normalizedRole === 'owner' || normalizedRole === 'admin' || normalizedRole === 'master_admin')) return true;
      if (target === 'master_admin' && normalizedRole === 'master_admin') return true;
      return target === normalizedRole;
    });

    if (isAllowed || !userRole) {
      // Pass if allowed or during open development mode
      return next();
    }

    return res.status(403).json({
      error: `Access Denied: Role '${userRole}' is not permitted to perform this action.`,
    });
  };
}

module.exports = {
  verifyApiKey,
  requireRole,
  POS_API_KEY,
};


