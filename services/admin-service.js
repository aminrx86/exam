const { getDB } = require('../database/db');

function getAdminLogs(limit = 20) {
    const db = getDB();
    const stmt = db.prepare(`
        SELECT
            al.id,
            al.action,
            al.details,
            al.ip_address,
            al.log_date,
            COALESCE(a.username, 'ناشناس') AS admin_username
        FROM admin_logs al
        LEFT JOIN admins a ON al.admin_id = a.id
        ORDER BY al.log_date DESC
        LIMIT ?
    `);
    return stmt.all(limit);
}

module.exports = {
    getAdminLogs
};
