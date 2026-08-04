const { getDB } = require('../database/db');

function getSystemStats() {
    const db = getDB();
    const totalQuestions = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
    const totalExams = db.prepare('SELECT COUNT(*) AS count FROM exams').get().count;
    const totalParticipants = db.prepare('SELECT COUNT(*) AS count FROM participants').get().count;
    const avgScoreRow = db.prepare('SELECT AVG(score) AS avgScore FROM participants WHERE score IS NOT NULL').get();
    const avgScore = avgScoreRow && avgScoreRow.avgScore ? Number(avgScoreRow.avgScore.toFixed(2)) : 0;
    return {
        totalQuestions,
        totalExams,
        totalParticipants,
        avgScore
    };
}

function getExamStatistics(examId) {
    const db = getDB();
    const stats = db.prepare(`
        SELECT
            COUNT(*) AS participantCount,
            COALESCE(AVG(score), 0) AS avgScore,
            COALESCE(MAX(score), 0) AS maxScore,
            COALESCE(MIN(score), 0) AS minScore
        FROM participants
        WHERE exam_id = ? AND score IS NOT NULL
    `).get(examId);

    const distribution = db.prepare(`
        SELECT
            SUM(CASE WHEN score BETWEEN 0 AND 20 THEN 1 ELSE 0 END) AS bucket1,
            SUM(CASE WHEN score BETWEEN 21 AND 40 THEN 1 ELSE 0 END) AS bucket2,
            SUM(CASE WHEN score BETWEEN 41 AND 60 THEN 1 ELSE 0 END) AS bucket3,
            SUM(CASE WHEN score BETWEEN 61 AND 80 THEN 1 ELSE 0 END) AS bucket4,
            SUM(CASE WHEN score BETWEEN 81 AND 100 THEN 1 ELSE 0 END) AS bucket5
        FROM participants
        WHERE exam_id = ? AND score IS NOT NULL
    `).get(examId);

    return {
        totalParticipants: stats.participantCount,
        avgScore: Number(stats.avgScore.toFixed(2)),
        maxScore: stats.maxScore,
        minScore: stats.minScore,
        distribution: [
            { label: '0-20', count: distribution.bucket1 },
            { label: '21-40', count: distribution.bucket2 },
            { label: '41-60', count: distribution.bucket3 },
            { label: '61-80', count: distribution.bucket4 },
            { label: '81-100', count: distribution.bucket5 }
        ]
    };
}

function getQuestionAnalysis(examId) {
    const db = getDB();
    const stmt = db.prepare(`
        SELECT
            q.id AS question_id,
            q.question_text,
            q.question_type,
            q.option_a,
            q.option_b,
            q.option_c,
            q.option_d,
            q.correct_answer,
            COUNT(pa.question_id) AS total_attempts,
            SUM(CASE WHEN pa.is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
            SUM(CASE WHEN pa.is_correct = 0 AND pa.selected_answer IS NOT NULL AND pa.selected_answer != '' THEN 1 ELSE 0 END) AS wrong_count,
            SUM(CASE WHEN pa.selected_answer LIKE '%A%' THEN 1 ELSE 0 END) AS count_a,
            SUM(CASE WHEN pa.selected_answer LIKE '%B%' THEN 1 ELSE 0 END) AS count_b,
            SUM(CASE WHEN pa.selected_answer LIKE '%C%' THEN 1 ELSE 0 END) AS count_c,
            SUM(CASE WHEN pa.selected_answer LIKE '%D%' THEN 1 ELSE 0 END) AS count_d
        FROM exam_questions eq
        JOIN questions q ON q.id = eq.question_id
        LEFT JOIN participant_answers pa ON pa.question_id = q.id
        WHERE eq.exam_id = ?
        GROUP BY q.id
        ORDER BY eq.question_order
    `);

    return stmt.all(examId).map(row => {
        const difficultyRatio = row.total_attempts > 0 ? Number((row.correct_count / row.total_attempts).toFixed(2)) : 0;
        return {
            ...row,
            difficultyRatio,
            optionCounts: {
                A: row.count_a,
                B: row.count_b,
                C: row.count_c,
                D: row.count_d
            }
        };
    });
}

function getParticipantHistory() {
    const db = getDB();
    const stmt = db.prepare(`
        SELECT
            p.id,
            p.full_name,
            p.user_code,
            e.title AS exam_title,
            p.status,
            p.score,
            p.percentage,
            p.total_correct,
            p.total_wrong,
            p.total_unanswered,
            p.submitted_date
        FROM participants p
        LEFT JOIN exams e ON p.exam_id = e.id
        ORDER BY p.submitted_date DESC
    `);
    return stmt.all();
}

function calculateParticipantRank(participantId) {
    const db = getDB();
    const participant = db.prepare('SELECT exam_id, score FROM participants WHERE id = ?').get(participantId);
    if (!participant || participant.score === null) return null;
    const rankRow = db.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM participants
        WHERE exam_id = ? AND score > ?
    `).get(participant.exam_id, participant.score);
    const rank = rankRow ? rankRow.rank : 1;
    const updateStmt = db.prepare('UPDATE participants SET rank = ? WHERE id = ?');
    updateStmt.run(rank, participantId);
    return rank;
}

module.exports = {
    getSystemStats,
    getExamStatistics,
    getQuestionAnalysis,
    getParticipantHistory,
    calculateParticipantRank
};