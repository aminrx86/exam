// services/exam-session.js
const { getDB } = require('../database/db');
const crypto = require('crypto');

// تولید کد یکتا برای شرکت‌کننده
function generateUserCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ثبت شرکت‌کننده جدید
function registerParticipant(fullName, examId) {
    const db = getDB();
    const code = generateUserCode();
    const stmt = db.prepare(`
        INSERT INTO participants (full_name, user_code, exam_id, status, start_time)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(fullName, code, examId, 'در حال آزمون');
    return code;
}

// دریافت اطلاعات شرکت‌کننده با کد
function getParticipantByCode(userCode) {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM participants WHERE user_code = ?');
    return stmt.get(userCode);
}

// ذخیره پاسخ یک سوال
function saveAnswer(participantId, questionId, selectedAnswer, isCorrect) {
    const db = getDB();
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO participant_answers (participant_id, question_id, selected_answer, is_correct)
        VALUES (?, ?, ?, ?)
    `);
    stmt.run(participantId, questionId, selectedAnswer, isCorrect);
}

// پایان آزمون و ثبت نتیجه
function submitExamResult(participantId, totalCorrect, totalWrong, totalUnanswered, score, percentage) {
    const db = getDB();
    const stmt = db.prepare(`
        UPDATE participants
        SET status = 'پایان یافته',
            score = ?,
            percentage = ?,
            total_correct = ?,
            total_wrong = ?,
            total_unanswered = ?,
            end_time = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    stmt.run(score, percentage, totalCorrect, totalWrong, totalUnanswered, participantId);
}

function getAllParticipants() {
    const db = getDB();
    const stmt = db.prepare(`
        SELECT p.*, e.title AS exam_title
        FROM participants p
        LEFT JOIN exams e ON p.exam_id = e.id
        ORDER BY p.submitted_date DESC
    `);
    return stmt.all();
}

function getParticipantDetails(participantId) {
    const db = getDB();
    const participantStmt = db.prepare(`
        SELECT p.*, e.title AS exam_title
        FROM participants p
        LEFT JOIN exams e ON p.exam_id = e.id
        WHERE p.id = ?
    `);
    const participant = participantStmt.get(participantId);
    if (!participant) return null;

    const answersStmt = db.prepare(`
        SELECT pa.question_id,
               pa.selected_answer,
               pa.is_correct,
               pa.answered_at,
               q.question_text,
               q.question_type,
               q.option_a,
               q.option_b,
               q.option_c,
               q.option_d,
               q.correct_answer,
               q.score
        FROM participant_answers pa
        JOIN questions q ON q.id = pa.question_id
        WHERE pa.participant_id = ?
        ORDER BY q.id
    `);
    const answers = answersStmt.all(participantId);

    return { participant, answers };
}

function searchParticipants(keyword) {
    const db = getDB();
    const term = `%${keyword}%`;
    const stmt = db.prepare(`
        SELECT p.*, e.title AS exam_title
        FROM participants p
        LEFT JOIN exams e ON p.exam_id = e.id
        WHERE p.full_name LIKE ? OR p.user_code LIKE ?
        ORDER BY p.submitted_date DESC
    `);
    return stmt.all(term, term);
}

module.exports = {
    registerParticipant,
    getParticipantByCode,
    saveAnswer,
    submitExamResult,
    getAllParticipants,
    getParticipantDetails,
    searchParticipants
};