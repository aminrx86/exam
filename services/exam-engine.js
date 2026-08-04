// services/exam-engine.js
const { getDB } = require('../database/db');

// ----- ایجاد آزمون دستی (با لیست سوالات) -----
function createManualExam(examData, questionIds) {
    const db = getDB();
    const insertExam = db.prepare(`
        INSERT INTO exams (title, description, duration, total_questions, is_random, shuffle_questions, shuffle_options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insertExam.run(
        examData.title,
        examData.description || '',
        examData.duration,
        questionIds.length,
        0, // is_random = 0 (دستی)
        examData.shuffle_questions ? 1 : 0,
        examData.shuffle_options ? 1 : 0
    );
    const examId = info.lastInsertRowid;

    // افزودن سوالات به جدول پیوند
    const insertEq = db.prepare(`
        INSERT INTO exam_questions (exam_id, question_id, question_order)
        VALUES (?, ?, ?)
    `);
    for (let i = 0; i < questionIds.length; i++) {
        insertEq.run(examId, questionIds[i], i + 1);
    }
    return examId;
}

// ----- ایجاد آزمون تصادفی بر اساس معیارها -----
function generateRandomExam(examData, criteria) {
    // criteria: { category, difficultyCount: { 'آسان': 5, 'متوسط': 10, 'سخت': 5 } }
    const db = getDB();
    let allQuestionIds = [];
    for (let diff in criteria.difficultyCount) {
        const count = criteria.difficultyCount[diff];
        if (count <= 0) continue;
        const stmt = db.prepare(`
            SELECT id FROM questions
            WHERE category = ? AND difficulty = ?
            ORDER BY RANDOM()
            LIMIT ?
        `);
        const rows = stmt.all(criteria.category, diff, count);
        allQuestionIds = allQuestionIds.concat(rows.map(r => r.id));
    }
    if (allQuestionIds.length === 0) {
        throw new Error('سوالات کافی برای این آزمون وجود ندارد');
    }
    // اکنون با همین لیست، آزمون دستی بسازیم (چون خودکار است، is_random=1 می‌دهیم)
    const db2 = getDB();
    const insertExam = db2.prepare(`
        INSERT INTO exams (title, description, duration, total_questions, is_random, shuffle_questions, shuffle_options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insertExam.run(
        examData.title,
        examData.description || '',
        examData.duration,
        allQuestionIds.length,
        1, // is_random = 1
        1, // shuffle_questions = true
        1  // shuffle_options = true
    );
    const examId = info.lastInsertRowid;

    const insertEq = db2.prepare(`
        INSERT INTO exam_questions (exam_id, question_id, question_order)
        VALUES (?, ?, ?)
    `);
    for (let i = 0; i < allQuestionIds.length; i++) {
        insertEq.run(examId, allQuestionIds[i], i + 1);
    }
    return examId;
}

// ----- دریافت سوالات یک آزمون (با ترتیب) -----
function getExamQuestions(examId) {
    const db = getDB();
    const stmt = db.prepare(`
        SELECT q.* FROM questions q
        JOIN exam_questions eq ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.question_order
    `);
    return stmt.all(examId);
}

// ----- دریافت اطلاعات یک آزمون -----
function getExamById(examId) {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM exams WHERE id = ?');
    return stmt.get(examId);
}

// ----- دریافت همه آزمون‌ها -----
function getAllExams() {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM exams ORDER BY created_date DESC');
    return stmt.all();
}

// ----- حذف آزمون (به همراه سوالات مرتبط) -----
function deleteExam(examId) {
    const db = getDB();
    const stmt = db.prepare('DELETE FROM exams WHERE id = ?');
    stmt.run(examId);
    // چون foreign key با CASCADE تنظیم شده، رکوردهای exam_questions هم حذف می‌شوند
}

module.exports = {
    createManualExam,
    generateRandomExam,
    getExamQuestions,
    getExamById,
    getAllExams,
    deleteExam
};