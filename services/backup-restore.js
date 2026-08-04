const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { getDatabasePath, closeDB } = require('../database/db');

async function createBackup(targetZipPath) {
    const zip = new JSZip();
    const dbPath = getDatabasePath();
    const dbData = fs.readFileSync(dbPath);
    zip.file(path.basename(dbPath), dbData);

    const assetsDir = path.join(__dirname, '..', 'assets');
    if (fs.existsSync(assetsDir)) {
        const addFolder = (basePath, zipFolder) => {
            const entries = fs.readdirSync(basePath, { withFileTypes: true });
            entries.forEach(entry => {
                const entryPath = path.join(basePath, entry.name);
                if (entry.isDirectory()) {
                    const child = zipFolder.folder(entry.name);
                    addFolder(entryPath, child);
                } else if (entry.isFile()) {
                    zipFolder.file(entry.name, fs.readFileSync(entryPath));
                }
            });
        };
        const assetsZipFolder = zip.folder('assets');
        addFolder(assetsDir, assetsZipFolder);
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(targetZipPath, content);
    return targetZipPath;
}

async function restoreBackup(zipFilePath) {
    closeDB();
    const zip = await JSZip.loadAsync(fs.readFileSync(zipFilePath));
    const dbPath = getDatabasePath();

    const databaseFileName = path.basename(dbPath);
    const dbFileEntry = zip.file(databaseFileName);
    if (!dbFileEntry) {
        throw new Error('فایل دیتابیس در فایل پشتیبان یافت نشد');
    }
    const dbData = await dbFileEntry.async('nodebuffer');
    fs.writeFileSync(dbPath, dbData);

    const assetsPath = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
    }

    const assetsFolder = zip.folder('assets');
    if (assetsFolder) {
        const files = Object.keys(zip.files).filter(name => name.startsWith('assets/'));
        for (const entryName of files) {
            const entry = zip.file(entryName);
            if (!entry) continue;
            const relativePath = path.relative('assets', entryName);
            const outputPath = path.join(assetsPath, relativePath);
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const fileData = await entry.async('nodebuffer');
            fs.writeFileSync(outputPath, fileData);
        }
    }

    return true;
}

module.exports = {
    createBackup,
    restoreBackup
};