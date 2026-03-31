// Global teardown: closes the shared DB pool after ALL test suites finish.
// This prevents "Cannot log after tests are done" errors.
module.exports = async () => {
  const { pool } = require('./index');
  try { await pool.end(); } catch (_) {}
};
