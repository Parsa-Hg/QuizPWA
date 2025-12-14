// =================================================================================
// فایل app.js: اتصال به Firebase و افزودن قابلیت سؤال تصویری
// =================================================================================

// ۱. اتصال به Firebase و Firestore
// تنظیمات پیکربندی شما (لطفا مطمئن شوید این کد کاملا درست باشد):
const firebaseConfig = {
  apiKey: "AIzaSyBgCQ26Jm0Y8YoW4_nsGotLBmLmu3YgvTo",
  authDomain: "quizpro-shared.firebaseapp.com",
  projectId: "quizpro-shared",
  storageBucket: "quizpro-shared.firebasestorage.app",
  messagingSenderId: "241131574728",
  appId: "1:241131574728:web:cb14df6ff5c61658a45cfd"
};

// مقداردهی اولیه Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore(); // شیء اتصال به دیتابیس Firestore (دیتابیس مشترک)

// ۲. ثبت Service Worker (بدون تغییر)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('سرویس ورکر ثبت شد'))
        .catch((err) => console.log('خطا در ثبت سرویس ورکر:', err));
}

// ۳. توابع مدیریت داده‌ها (فراخوانی دیتابیس آنلاین)
const getQuizzes = async () => {
    try {
        const snapshot = await db.collection("quizzes").get();
        const quizzes = [];
        snapshot.forEach(doc => {
            quizzes.push({ id: doc.id, ...doc.data() });
        });
        return quizzes;
    } catch (error) {
        console.error("خطا در خواندن کوییزها از فایربیس:", error);
        return [];
    }
};

const saveQuiz = async (quizData) => {
    try {
        await db.collection("quizzes").add(quizData);
        return true;
    } catch (error) {
        console.error("خطا در ذخیره کوییز در فایربیس:", error);
        return false;
    }
};

// ۴. تابع جابجایی بین بخش‌های HTML (بدون تغییر)
const showSection = (id) => {
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

let currentQuizId = null; 

// ۵. رندر لیست کوییزها در صفحه اصلی
const renderQuizList = async () => {
    const quizList = document.getElementById('quiz-list');
    quizList.innerHTML = '';
    
    const quizzes = await getQuizzes(); 

    quizzes.forEach((quiz, index) => {
        const li = document.createElement('li');
        li.textContent = quiz.title;
        li.onclick = () => startQuiz(quiz.id); 
        quizList.appendChild(li);
    });
    
    if (quizzes.length === 0) {
        quizList.innerHTML = '<p style="text-align: center;">هنوز کوییزی ساخته نشده است.</p>';
    }
};

// ۶. مدیریت بخش ساخت کوییز
document.getElementById('create-quiz-btn').addEventListener('click', () => {
    showSection('quiz-creator');
    document.getElementById('quiz-title').value = '';
    document.getElementById('questions-container').innerHTML = '';
    addQuestionField(); 
});

// ************************************************
// تابع به‌روز شده: اضافه کردن فیلد لینک عکس (URL)
// ************************************************
const addQuestionField = () => {
    const container = document.getElementById('questions-container');
    const qIndex = container.children.length;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-block';
    questionDiv.innerHTML = `
        <hr>
        <h4>سوال #${qIndex + 1}</h4>
        
        <input type="url" id="q-image-${qIndex}" placeholder="لینک عکس سوال (اختیاری، با https)">
        
        <input type="text" id="q-text-${qIndex}" placeholder="متن سوال (اختیاری، در کنار عکس)">
        <input type="text" id="q-correct-${qIndex}" placeholder="حرف گزینه صحیح (مثلاً A)">
        <p>گزینه‌ها:</p>
        <textarea id="q-options-${qIndex}" rows="4" placeholder="A: گزینه اول\nB: گزینه دوم\nC: گزینه سوم\n..."></textarea>
    `;
    container.appendChild(questionDiv);
};

document.getElementById('add-question-btn').addEventListener('click', addQuestionField);

// ************************************************
// تابع به‌روز شده: ذخیره لینک عکس در Firebase
// ************************************************
document.getElementById('save-quiz-btn').addEventListener('click', async () => {
    const title = document.getElementById('quiz-title').value.trim();
    if (!title) {
        alert('لطفا عنوان کوییز را وارد کنید.');
        return;
    }
    
    const newQuiz = { title: title, questions: [] };
    const qContainers = document.getElementById('questions-container').children;

    for (let i = 0; i < qContainers.length; i++) {
        const text = document.getElementById(`q-text-${i}`).value.trim();
        const correct = document.getElementById(`q-correct-${i}`).value.trim();
        const optionsText = document.getElementById(`q-options-${i}`).value.trim();
        
        // خواندن فیلد جدید لینک عکس
        const imageUrl = document.getElementById(`q-image-${i}`).value.trim(); 

        if ((text || imageUrl) && correct && optionsText) {
            const options = optionsText.split('\n').filter(o => o.trim() !== '');
            // اضافه کردن imageUrl به شیء سوال
            newQuiz.questions.push({ text, imageUrl, correct: correct.toUpperCase(), options });
        }
    }

    if (newQuiz.questions.length > 0) {
        const saved = await saveQuiz(newQuiz);
        if (saved) {
            alert(`کوییز "${title}" با موفقیت ذخیره و عمومی شد!`);
            showSection('quiz-selection');
            renderQuizList();
        } else {
            alert('خطا در ذخیره کوییز در سرور.');
        }
    } else {
        alert('لطفاً حداقل یک سوال معتبر و کامل اضافه کنید.');
    }
});

// ۷. منطق شروع و حل کوییز
// ************************************************
// تابع به‌روز شده: نمایش عکس سوال (اگر وجود داشت)
// ************************************************
const startQuiz = async (quizId) => {
    currentQuizId = quizId;
    
    const doc = await db.collection("quizzes").doc(quizId).get();
    if (!doc.exists) {
        alert("کوییز پیدا نشد.");
        return;
    }
    const quiz = doc.data();

    document.getElementById('current-quiz-title').textContent = `شروع کوییز: ${quiz.title}`;
    const questionsDiv = document.getElementById('quiz-questions');
    questionsDiv.innerHTML = '';
    
    quiz.questions.forEach((q, qIndex) => {
        const qElement = document.createElement('div');
        qElement.className = 'quiz-question';
        
        // نمایش عکس اگر لینک عکس وجود داشت
        let imageHtml = '';
        if (q.imageUrl) {
            // استایل‌دهی ساده برای نمایش درست تصویر در موبایل
            imageHtml = `<img src="${q.imageUrl}" style="max-width: 100%; height: auto; margin-bottom: 15px; border-radius: 8px;" alt="تصویر سوال">`;
        }
        
        qElement.innerHTML = `
            ${imageHtml}
            <h4>${qIndex + 1}. ${q.text}</h4>
        `;
        
        // منطق نمایش گزینه‌های رادیویی
        q.options.forEach(optionText => {
            const match = optionText.match(/^([A-Za-z0-9]+):\s*(.*)/) || optionText.match(/^([A-Za-z0-9]+)\.\s*(.*)/);
            const key = match ? match[1] : optionText.slice(0, 1);
            
            const label = document.createElement('label');
            label.innerHTML = `<input type="radio" name="q-${qIndex}" value="${key.toUpperCase()}"> ${optionText}`;
            qElement.appendChild(label);
            qElement.appendChild(document.createElement('br'));
        });
        questionsDiv.appendChild(qElement);
    });
    
    document.getElementById('submit-quiz-btn').style.display = 'block';
    showSection('quiz-taker');
};

document.getElementById('submit-quiz-btn').addEventListener('click', async () => {
    if (currentQuizId === null) return;
    
    const doc = await db.collection("quizzes").doc(currentQuizId).get();
    const quiz = doc.data(); 
    
    let score = 0;
    
    quiz.questions.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q-${qIndex}"]:checked`);
        if (selected && selected.value === q.correct) {
            score++;
        }
    });

    alert(`نتایج کوییز "${quiz.title}":\nشما به ${score} سوال از ${quiz.questions.length} سوال پاسخ صحیح دادید.`);
    currentQuizId = null;
    document.getElementById('submit-quiz-btn').style.display = 'none';
    showSection('quiz-selection');
});

// ۸. اجرای اولیه برنامه
renderQuizList();
showSection('quiz-selection');
