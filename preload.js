const { contextBridge, ipcRenderer } = require('electron');

// API امن برای فرآیند رندر
contextBridge.exposeInMainWorld('electronAPI', {
    // احراز هویت
    loginAdmin: (password) => ipcRenderer.invoke('login-admin', password),
    checkSession: () => ipcRenderer.invoke('check-session'),
    logoutAdmin: () => ipcRenderer.invoke('logout-admin'),

    // سرویس‌های دیتابیس (همه از طریق main)
    db: {
        // مثال: getAllQuestions
        getAllQuestions: () => ipcRenderer.invoke('db-getAllQuestions'),
        addQuestion: (questionData) => ipcRenderer.invoke('db-addQuestion', questionData),
        updateQuestion: (id, questionData) => ipcRenderer.invoke('db-updateQuestion', id, questionData),
        deleteQuestion: (id) => ipcRenderer.invoke('db-deleteQuestion', id),
        getQuestionsByFilter: (filter) => ipcRenderer.invoke('db-getQuestionsByFilter', filter),

        // آزمون‌ها
        getAllExams: () => ipcRenderer.invoke('db-getAllExams'),
        createManualExam: (examData, questionIds) => ipcRenderer.invoke('db-createManualExam', examData, questionIds),
        createRandomExam: (examData, criteria) => ipcRenderer.invoke('db-createRandomExam', examData, criteria),
        getExamById: (id) => ipcRenderer.invoke('db-getExamById', id),
        getExamQuestions: (examId) => ipcRenderer.invoke('db-getExamQuestions', examId),
        exportQuestions: () => ipcRenderer.invoke('db-exportQuestions'),

        // شرکت‌کنندگان
        getAllParticipants: () => ipcRenderer.invoke('db-getAllParticipants'),
        getParticipantByCode: (code) => ipcRenderer.invoke('db-getParticipantByCode', code),
        registerParticipant: (fullName, examId) => ipcRenderer.invoke('db-registerParticipant', fullName, examId),
        saveAnswer: (participantId, questionId, selectedAnswer, isCorrect) =>
            ipcRenderer.invoke('db-saveAnswer', participantId, questionId, selectedAnswer, isCorrect),
        submitExamResult: (resultData) => ipcRenderer.invoke('db-submitExamResult', resultData),
        searchParticipants: (keyword) => ipcRenderer.invoke('db-searchParticipants', keyword),
        getParticipantDetails: (participantId) => ipcRenderer.invoke('db-getParticipantDetails', participantId),
        getParticipantHistory: () => ipcRenderer.invoke('db-getParticipantHistory'),
        getAdminLogs: (limit) => ipcRenderer.invoke('db-getAdminLogs', limit),

        // گزارشات
        getSystemStats: () => ipcRenderer.invoke('db-getSystemStats'),
        getExamStatistics: (examId) => ipcRenderer.invoke('db-getExamStatistics', examId),
        getQuestionAnalysis: (examId) => ipcRenderer.invoke('db-getQuestionAnalysis', examId),
    },

    // تولید PDF
    generatePDF: (data, type, filePath) => ipcRenderer.invoke('generate-pdf', data, type, filePath),

    // بکاپ و ریستور
    backup: (targetPath) => ipcRenderer.invoke('backup-data', targetPath),
    restore: (filePath) => ipcRenderer.invoke('restore-data', filePath),

    // ابزارهای عمومی
    showSaveDialog: (options) => ipcRenderer.invoke('dialog-showSaveDialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('dialog-showOpenDialog', options),
});