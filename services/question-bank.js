const path = require('path');
const fs = require('fs');
const { getDB } = require('../database/db');

function getAllQuestions() {
    const db = getDB();
    const stmt = db.prepare('SELECT * FROM questions ORDER BY created_date DESC');
    return stmt.all();
}

function addQuestion(questionData) {
    const db = getDB();
    const stmt = db.prepare(`
        INSERT INTO questions (
            category, subject, difficulty, question_type,
            question_text, option_a, option_b, option_c, option_d,
            correct_answer, score, explanation, image_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
        questionData.category || '',
        questionData.subject || '',
        questionData.difficulty || 'متوسط',
        questionData.question_type || 'چهارگزینه‌ای',
        questionData.question_text || '',
        questionData.option_a || '',
        questionData.option_b || '',
        questionData.option_c || '',
        questionData.option_d || '',
        questionData.correct_answer || '',
        Number(questionData.score) || 1,
        questionData.explanation || '',
        questionData.image_path || ''
    );
    return info.lastInsertRowid;
}

function updateQuestion(id, questionData) {
    const db = getDB();
    const stmt = db.prepare(`
        UPDATE questions
        SET category = ?,
            subject = ?,
            difficulty = ?,
            question_type = ?,
            question_text = ?,
            option_a = ?,
            option_b = ?,
            option_c = ?,
            option_d = ?,
            correct_answer = ?,
            score = ?,
            explanation = ?,
            image_path = ?
        WHERE id = ?
    `);
    stmt.run(
        questionData.category || '',
        questionData.subject || '',
        questionData.difficulty || 'متوسط',
        questionData.question_type || 'چهارگزینه‌ای',
        questionData.question_text || '',
        questionData.option_a || '',
        questionData.option_b || '',
        questionData.option_c || '',
        questionData.option_d || '',
        questionData.correct_answer || '',
        Number(questionData.score) || 1,
        questionData.explanation || '',
        questionData.image_path || '',
        id
    );
}

function deleteQuestion(id) {
    const db = getDB();
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    stmt.run(id);
}

function getQuestionsByFilter(filter = {}) {
    const db = getDB();
    let query = 'SELECT * FROM questions';
    const conditions = [];
    const params = [];

    if (filter.category) {
        conditions.push('category = ?');
        params.push(filter.category);
    }
    if (filter.difficulty) {
        conditions.push('difficulty = ?');
        params.push(filter.difficulty);
    }
    if (filter.question_type) {
        conditions.push('question_type = ?');
        params.push(filter.question_type);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_date DESC';

    return db.prepare(query).all(...params);
}

function exportQuestionsToExcel() {
    const questions = getAllQuestions();
    const XLSX = require('xlsx');
    const data = questions.map(q => ({
        'شناسه': q.id,
        'دسته‌بندی': q.category,
        'موضوع': q.subject,
        'سطح': q.difficulty,
        'نوع': q.question_type,
        'متن سوال': q.question_text,
        'گزینه A': q.option_a,
        'گزینه B': q.option_b,
        'گزینه C': q.option_c,
        'گزینه D': q.option_d,
        'پاسخ صحیح': q.correct_answer,
        'نمره': q.score,
        'توضیح': q.explanation
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سوالات');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filePath = path.join(__dirname, '..', 'exported_questions.xlsx');
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

module.exports = {
    getAllQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionsByFilter,
    exportQuestionsToExcel
};