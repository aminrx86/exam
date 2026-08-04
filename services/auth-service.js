const { getDB } = require('../database/db');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

// ایجاد کاربر ادمین پیش‌فرض (اگر وجود نداشته باشد)
async function createAdminUser(username, password) {
    const db = getDB();
    const stmt = db.prepare('SELECT id FROM admins WHERE username = ?');
    const existing = stmt.get(username);
    if (!existing) {
        const hash = bcrypt.hashSync(password, 10);
        const insert = db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)');
        insert.run(username, hash);
        logger.info(`کاربر ادمین با نام ${username} ایجاد شد`);
        // لاگ
        logAdminAction(1, 'ایجاد کاربر', `کاربر ${username} ساخته شد`);
        return true;
    }
    return false;
}

// اعتبارسنجی ورود
async function validateAdminLogin(password) {
    const db = getDB();
    const stmt = db.prepare('SELECT id, password_hash FROM admins WHERE username = ?');
    const admin = stmt.get('admin');
    if (!admin) {
        return { success: false, message: 'کاربر ادمین یافت نشد' };
    }
    const isValid = bcrypt.compareSync(password, admin.password_hash);
    if (isValid) {
        // لاگ ورود موفق
        logAdminAction(admin.id, 'ورود موفق', 'ورود به پنل مدیریت');
        return { success: true };
    } else {
        // لاگ تلاش ناموفق
        logAdminAction(null, 'تلاش ناموفق ورود', `رمز عبور اشتباه`);
        return { success: false, message: 'رمز عبور اشتباه است' };
    }
}

// ثبت لاگ
function logAdminAction(adminId, action, details) {
    try {
        const db = getDB();
        const stmt = db.prepare(`
            INSERT INTO admin_logs (admin_id, action, details, ip_address)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(adminId, action, details, '127.0.0.1');
    } catch (err) {
        logger.error('خطا در ثبت لاگ:', err);
    }
}

module.exports = {
    createAdminUser,
    validateAdminLogin,
    logAdminAction
};