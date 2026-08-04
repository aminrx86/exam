-- جدول مدیران (فقط یک رکورد)
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سوالات
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,                -- دسته‌بندی (مثلاً ریاضی، فیزیک)
    subject TEXT,                 -- موضوع
    difficulty TEXT CHECK(difficulty IN ('آسان','متوسط','سخت')),
    question_type TEXT CHECK(question_type IN ('چهارگزینه‌ای','چند پاسخ صحیح','درست/غلط','تشریحی','تصویری')),
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT NOT NULL,  -- برای چند پاسخ می‌توان با جداکننده ذخیره کرد
    score INTEGER DEFAULT 1,
    explanation TEXT,
    image_path TEXT,               -- مسیر فایل تصویر (اختیاری)
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول آزمون‌ها
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,      -- مدت زمان به دقیقه
    total_questions INTEGER NOT NULL,
    is_random BOOLEAN DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT 1,
    shuffle_options BOOLEAN DEFAULT 1,
    created_by INTEGER,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- جدول سوالات هر آزمون (برای آزمون‌های دستی)
CREATE TABLE IF NOT EXISTS exam_questions (
    exam_id INTEGER,
    question_id INTEGER,
    question_order INTEGER,
    PRIMARY KEY (exam_id, question_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- جدول شرکت‌کنندگان
CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    user_code TEXT UNIQUE NOT NULL,   -- کد یکتا
    exam_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT CHECK(status IN ('در حال آزمون','پایان یافته','لغو شده')),
    score INTEGER,
    percentage REAL,
    total_correct INTEGER,
    total_wrong INTEGER,
    total_unanswered INTEGER,
    rank INTEGER,
    submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- جدول پاسخ‌های شرکت‌کننده
CREATE TABLE IF NOT EXISTS participant_answers (
    participant_id INTEGER,
    question_id INTEGER,
    selected_answer TEXT,
    is_correct BOOLEAN,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (participant_id, question_id),
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- جدول لاگ فعالیت‌های مدیر
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT,
    details TEXT,
    ip_address TEXT,
    log_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

-- ایندکس‌ها برای بهبود کارایی
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_participants_exam ON participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(user_code);