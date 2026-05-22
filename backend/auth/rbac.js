// rbac.js — server-side role gate. Never trust the client.
// Roles per ERD §8: employee, pm_lead, management, operations, admin.

const { requireSession } = require('./session');

const ROLES = ['employee', 'pm_lead', 'management', 'operations', 'admin'];

function requireRole(...allowed) {
  return (req, res, next) => {
    requireSession(req, res, (err) => {
      if (err) return next(err);
      const role = req.user?.role;
      if (!ROLES.includes(role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unknown role' } });
      if (allowed.length && !allowed.includes(role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Requires one of: ${allowed.join(', ')}` } });
      }
      next();
    });
  };
}

module.exports = { ROLES, requireRole };
