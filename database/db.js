const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Database = require('better-sqlite3');

let db = null;
const DB_DIR = app && app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
const DB_PATH = process.env.EXAM_DB_PATH || path.join(DB_DIR, 'exam.db');

function getDatabasePath() {
    return DB_PATH;
}

// تابع برای ایجاد اتصال
function getDB() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

// مقداردهی اولیه: ایجاد جداول
function initDatabase() {
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const db = getDB();
    // اجرای اسکریپت schema (تقسیم به دستورات جداگانه)
    const statements = schemaSQL.split(';').filter(s => s.trim());
    for (let stmt of statements) {
        try {
            db.exec(stmt);
        } catch (err) {
            console.error('خطا در اجرای دستور SQL:', err.message);
        }
    }
    return db;
}

// بستن دیتابیس (در زمان خروج)
function closeDB() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    getDB,
    initDatabase,
    getDatabasePath,
    closeDB
};