const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'system.log');

function log(level, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
    // همچنین در کنسول نمایش بده
    console.log(line.trim());
}

function info(message) { log('info', message); }
function warn(message) { log('warn', message); }
function error(message, err) {
    if (err) {
        log('error', `${message} - ${err.message}`);
        if (err.stack) console.error(err.stack);
    } else {
        log('error', message);
    }
}

module.exports = {
    info,
    warn,
    error,
    log
};