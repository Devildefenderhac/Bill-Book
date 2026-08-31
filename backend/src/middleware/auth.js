// POS API Security Key Protection Middleware
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

  // Accept valid API key or local desktop app internal requests
  if (clientKey === POS_API_KEY || isLocalhost) {
    return next();
  }

  // Reject unauthorized external calls
  return res.status(403).json({
    error: 'Access Denied: Invalid or missing POS API Key.',
  });
}

module.exports = {
  verifyApiKey,
  POS_API_KEY,
};

