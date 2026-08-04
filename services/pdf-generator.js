const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateCertificate(filePath, participantData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 40, lang: 'fa' });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            doc.font('Helvetica-Bold').fontSize(24).text('کارنامه آزمون', { align: 'center' });
            doc.moveDown(1);

            doc.font('Helvetica').fontSize(12);
            doc.text(`نام شرکت‌کننده: ${participantData.full_name}`);
            doc.text(`کد کاربری: ${participantData.user_code}`);
            doc.text(`آزمون: ${participantData.exam_title}`);
            doc.text(`وضعیت: ${participantData.status}`);
            doc.text(`تاریخ ثبت: ${participantData.submitted_date || ''}`);
            doc.moveDown(0.5);

            doc.text(`تعداد صحیح: ${participantData.total_correct || 0}`);
            doc.text(`تعداد غلط: ${participantData.total_wrong || 0}`);
            doc.text(`تعداد بی‌پاسخ: ${participantData.total_unanswered || 0}`);
            doc.text(`نمره: ${participantData.score || 0}`);
            doc.text(`درصد: ${participantData.percentage ? participantData.percentage.toFixed(2) : 0}%`);
            doc.text(`رتبه: ${participantData.rank || '-'}`);
            doc.moveDown(1);

            if (participantData.answers && participantData.answers.length > 0) {
                doc.font('Helvetica-Bold').fontSize(14).text('پاسخ‌های ثبت‌شده', { underline: true });
                doc.moveDown(0.5);
                participantData.answers.forEach((item, index) => {
                    doc.font('Helvetica-Bold').fontSize(12).text(`${index + 1}. ${item.question_text}`);
                    doc.font('Helvetica').fontSize(11).text(`پاسخ انتخاب‌شده: ${item.selected_answer || '-'} - صحیح: ${item.correct_answer || '-'}`);
                    doc.moveDown(0.3);
                });
            }

            doc.end();
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificate
};