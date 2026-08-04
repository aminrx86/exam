const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database/db');
const { createAdminUser, validateAdminLogin, logAdminAction } = require('./services/auth-service');
const logger = require('./utils/logger');

let mainWindow;
let splashWindow;

function createWindow() {
    // پنجره اصلی
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        show: false  // تا وقتی صفحه بارگذاری نشده نشان نده
    });

    // بارگذاری صفحه لاگین
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // وقتی صفحه آماده شد نمایش بده
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
    });

    // منوی برنامه (ساده)
    const menuTemplate = [
        {
            label: 'سیستم',
            submenu: [
                { label: 'خروج', role: 'quit' }
            ]
        },
        {
            label: 'نمایش',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // باز کردن لینک‌ها در مرورگر پیش‌فرض
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // مدیریت بسته شدن
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// پنجره اسپلش (اختیاری)
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));
}

// راه‌اندازی برنامه
app.whenReady().then(async () => {
    // ایجاد دیتابیس و جداول
    try {
        await initDatabase();
        // ایجاد کاربر پیش‌فرض ادمین (در صورت عدم وجود)
        await createAdminUser('admin', '123456');
        logger.info('سیستم راه‌اندازی شد');
    } catch (err) {
        logger.error('خطا در راه‌اندازی دیتابیس:', err);
        app.quit();
        return;
    }

    // ایجاد پنجره اصلی
    createWindow();

    // در مک وقتی اپلیکیشن فعال شود پنجره بساز (اگر نباشد)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// خروج از برنامه وقتی همه پنجره‌ها بسته شوند (به جز در مک)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ========== ارتباط با فرآیند رندر (IPC) ==========

// احراز هویت
ipcMain.handle('login-admin', async (event, password) => {
    try {
        const result = await validateAdminLogin(password);
        if (result.success) {
            // ایجاد session (ساده: ذخیره در main process)
            global.adminSession = {
                loggedIn: true,
                timestamp: Date.now()
            };
            return { success: true };
        } else {
            return { success: false, message: result.message };
        }
    } catch (err) {
        logger.error('خطا در ورود:', err);
        return { success: false, message: 'خطای داخلی' };
    }
});

// بررسی وضعیت session
ipcMain.handle('check-session', async () => {
    if (global.adminSession && global.adminSession.loggedIn) {
        // اگر بیش از ۳۰ دقیقه از ورود گذشته باشد، منقضی شود
        if (Date.now() - global.adminSession.timestamp > 30 * 60 * 1000) {
            global.adminSession.loggedIn = false;
            return { loggedIn: false };
        }
        global.adminSession.timestamp = Date.now();
        return { loggedIn: true };
    }
    return { loggedIn: false };
});

// خروج از پنل
ipcMain.handle('logout-admin', async () => {
    if (global.adminSession) {
        global.adminSession.loggedIn = false;
    }
    return { success: true };
});

// سایر سرویس‌ها از طریق IPC به renderer متصل می‌شوند
// در ادامه هر ماژول سرویس‌های خود را اضافه می‌کند

logger.info('main.js بارگذاری شد');

// سرویس‌ها
const questionBank = require('./services/question-bank');
const examEngine = require('./services/exam-engine');
const examSession = require('./services/exam-session');
const reportService = require('./services/report-service');
const pdfGenerator = require('./services/pdf-generator');
const backupRestore = require('./services/backup-restore');
const adminService = require('./services/admin-service');

// دریافت همه سوالات
ipcMain.handle('db-getAllQuestions', async () => {
    try {
        return questionBank.getAllQuestions();
    } catch (err) {
        logger.error('خطا در دریافت سوالات:', err);
        return [];
    }
});

// افزودن سوال جدید
ipcMain.handle('db-addQuestion', async (event, questionData) => {
    try {
        const id = questionBank.addQuestion(questionData);
        return { success: true, id };
    } catch (err) {
        logger.error('خطا در افزودن سوال:', err);
        return { success: false, message: err.message };
    }
});

// ویرایش سوال
ipcMain.handle('db-updateQuestion', async (event, id, questionData) => {
    try {
        questionBank.updateQuestion(id, questionData);
        return { success: true };
    } catch (err) {
        logger.error('خطا در ویرایش سوال:', err);
        return { success: false, message: err.message };
    }
});

// حذف سوال
ipcMain.handle('db-deleteQuestion', async (event, id) => {
    try {
        questionBank.deleteQuestion(id);
        return { success: true };
    } catch (err) {
        logger.error('خطا در حذف سوال:', err);
        return { success: false, message: err.message };
    }
});

// فیلتر سوالات
ipcMain.handle('db-getQuestionsByFilter', async (event, filter) => {
    try {
        return questionBank.getQuestionsByFilter(filter);
    } catch (err) {
        logger.error('خطا در فیلتر سوالات:', err);
        return [];
    }
});
ipcMain.handle('db-exportQuestions', async () => {
    try {
        const filePath = questionBank.exportQuestionsToExcel();
        return { success: true, path: filePath };
    } catch (err) {
        return { success: false, message: err.message };
    }
});
// دریافت همه آزمون‌ها
ipcMain.handle('db-getAllExams', async () => {
    try {
        return examEngine.getAllExams();
    } catch (err) {
        logger.error('خطا در دریافت آزمون‌ها:', err);
        return [];
    }
});

// دریافت یک آزمون با شناسه
ipcMain.handle('db-getExamById', async (event, id) => {
    try {
        return examEngine.getExamById(id);
    } catch (err) {
        logger.error('خطا در دریافت آزمون:', err);
        return null;
    }
});

// دریافت سوالات آزمون
ipcMain.handle('db-getExamQuestions', async (event, examId) => {
    try {
        return examEngine.getExamQuestions(examId);
    } catch (err) {
        logger.error('خطا در دریافت سوالات آزمون:', err);
        return [];
    }
});

// ایجاد آزمون دستی
ipcMain.handle('db-createManualExam', async (event, examData, questionIds) => {
    try {
        const id = examEngine.createManualExam(examData, questionIds);
        return { success: true, id };
    } catch (err) {
        logger.error('خطا در ایجاد آزمون دستی:', err);
        return { success: false, message: err.message };
    }
});

// ایجاد آزمون تصادفی
ipcMain.handle('db-createRandomExam', async (event, examData, criteria) => {
    try {
        const id = examEngine.generateRandomExam(examData, criteria);
        return { success: true, id };
    } catch (err) {
        logger.error('خطا در ایجاد آزمون تصادفی:', err);
        return { success: false, message: err.message };
    }
});

// حذف آزمون
ipcMain.handle('db-deleteExam', async (event, id) => {
    try {
        examEngine.deleteExam(id);
        logAdminAction(1, 'حذف آزمون', `آزمون با شناسه ${id} حذف شد`);
        return { success: true };
    } catch (err) {
        logger.error('خطا در حذف آزمون:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('db-getAllParticipants', async () => {
    try {
        return examSession.getAllParticipants();
    } catch (err) {
        logger.error('خطا در دریافت شرکت‌کنندگان:', err);
        return [];
    }
});

ipcMain.handle('db-searchParticipants', async (event, keyword) => {
    try {
        return examSession.searchParticipants(keyword);
    } catch (err) {
        logger.error('خطا در جستجوی شرکت‌کننده‌ها:', err);
        return [];
    }
});

ipcMain.handle('db-getParticipantDetails', async (event, participantId) => {
    try {
        return examSession.getParticipantDetails(participantId);
    } catch (err) {
        logger.error('خطا در دریافت جزئیات شرکت‌کننده:', err);
        return null;
    }
});

ipcMain.handle('db-getSystemStats', async () => {
    try {
        return reportService.getSystemStats();
    } catch (err) {
        logger.error('خطا در دریافت آمار سیستم:', err);
        return { totalQuestions: 0, totalExams: 0, totalParticipants: 0, avgScore: 0 };
    }
});

ipcMain.handle('db-getExamStatistics', async (event, examId) => {
    try {
        return reportService.getExamStatistics(examId);
    } catch (err) {
        logger.error('خطا در دریافت آمار آزمون:', err);
        return null;
    }
});

ipcMain.handle('db-getQuestionAnalysis', async (event, examId) => {
    try {
        return reportService.getQuestionAnalysis(examId);
    } catch (err) {
        logger.error('خطا در دریافت تحلیل سوالات:', err);
        return [];
    }
});

ipcMain.handle('db-getParticipantHistory', async () => {
    try {
        return reportService.getParticipantHistory();
    } catch (err) {
        logger.error('خطا در دریافت تاریخچه افراد:', err);
        return [];
    }
});

ipcMain.handle('db-getAdminLogs', async (event, limit = 20) => {
    try {
        return adminService.getAdminLogs(limit);
    } catch (err) {
        logger.error('خطا در دریافت لاگ‌های ادمین:', err);
        return [];
    }
});

ipcMain.handle('generate-pdf', async (event, data, type, filePath) => {
    try {
        if (type !== 'certificate') {
            return { success: false, message: 'نوع نامعتبر PDF' };
        }
        const outputPath = filePath;
        await pdfGenerator.generateCertificate(outputPath, data);
        return { success: true, path: outputPath };
    } catch (err) {
        logger.error('خطا در تولید PDF:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('backup-data', async (event, targetPath) => {
    try {
        const result = await backupRestore.createBackup(targetPath);
        return { success: true, path: result };
    } catch (err) {
        logger.error('خطا در گرفتن بکاپ:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('restore-data', async (event, filePath) => {
    try {
        await backupRestore.restoreBackup(filePath);
        return { success: true };
    } catch (err) {
        logger.error('خطا در بازیابی بکاپ:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('dialog-showSaveDialog', async (event, options) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    } catch (err) {
        logger.error('خطا در نمایش دیالوگ ذخیره:', err);
        return { canceled: true, filePath: null };
    }
});

ipcMain.handle('dialog-showOpenDialog', async (event, options) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    } catch (err) {
        logger.error('خطا در نمایش دیالوگ باز کردن:', err);
        return { canceled: true, filePaths: [] };
    }
});

ipcMain.handle('db-registerParticipant', async (event, fullName, examId) => {
    try {
        const code = examSession.registerParticipant(fullName, examId);
        logAdminAction(1, 'ثبت شرکت‌کننده', `شرکت‌کننده ${fullName} برای آزمون ${examId} ثبت شد`);
        return { success: true, userCode: code };
    } catch (err) {
        logger.error('خطا در ثبت شرکت‌کننده:', err);
        return { success: false, message: err.message };
    }
});

ipcMain.handle('db-getParticipantByCode', async (event, code) => {
    try {
        return examSession.getParticipantByCode(code);
    } catch (err) {
        logger.error('خطا در دریافت شرکت‌کننده:', err);
        return null;
    }
});

ipcMain.handle('db-saveAnswer', async (event, participantId, questionId, selectedAnswer, isCorrect) => {
    try {
        examSession.saveAnswer(participantId, questionId, selectedAnswer, isCorrect);
        return { success: true };
    } catch (err) {
        logger.error('خطا در ذخیره پاسخ:', err);
        return { success: false };
    }
});

ipcMain.handle('db-submitExamResult', async (event, data) => {
    try {
        examSession.submitExamResult(
            data.participantId,
            data.totalCorrect,
            data.totalWrong,
            data.totalUnanswered,
            data.score,
            data.percentage
        );
        return { success: true };
    } catch (err) {
        logger.error('خطا در ثبت نتیجه:', err);
        return { success: false };
    }
});