// =================================================================================
// فایل app.js: نسخه پایدار (Compat) - بدون نیاز به import
// =================================================================================

// ۱. تنظیمات دقیق شما
const firebaseConfig = {
  apiKey: "AIzaSyBgCQ26Jm0Y8YoW4_nsGotLBmLmu3YgvTo",
  authDomain: "quizpro-shared.firebaseapp.com",
  projectId: "quizpro-shared",
  storageBucket: "quizpro-shared.firebasestorage.app",
  messagingSenderId: "241131574728",
  appId: "1:241131574728:web:cb14df6ff5c61658a45cfd"
};

// ۲. اتصال به Firebase (با بررسی اینکه قبلاً متصل نشده باشد)
let app;
let db;

try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    // اتصال به دیتابیس
    db = firebase.firestore();
    console.log("اتصال به دیتابیس با موفقیت انجام شد");
} catch (error) {
    console.error("خطا در اتصال به فایربیس:", error);
    alert("خطا در اتصال به سرور. لطفا اینترنت خود را چک کنید.");
}

// ۳. ثبت Service Worker (برای کارکرد آفلاین و نصب)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('سرویس ورکر ثبت شد'))
        .catch((err) => console.log('خطا در ثبت سرویس ورکر:', err));
}

// ۴. توابع خواندن و نوشتن در دیتابیس
const getQuizzes = async () => {
    try {
        const snapshot = await db.collection("quizzes").get();
        const quizzes = [];
        snapshot.forEach(doc => {
            quizzes.push({ id: doc.id, ...doc.data() });
        });
        return quizzes;
    } catch (error) {
        console.error("خطا در دریافت لیست:", error);
        return [];
    }
};

const saveQuiz = async (quizData) => {
    try {
        await db.collection("quizzes").add(quizData);
        return true;
    } catch (error) {
        console.error("خطا در ذخیره:", error);
        alert("ذخیره نشد: " + error.message); // نمایش خطا به کاربر
        return false;
    }
};

// ۵. مدیریت صفحات (UI)
const showSection = (id) => {
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

let currentQuizId = null; 

// ۶. نمایش لیست کوییزها
const renderQuizList = async () => {
    const quizList = document.getElementById('quiz-list');
    quizList.innerHTML = '<p>در حال بارگذاری...</p>';
    
    const quizzes = await getQuizzes(); 
    quizList.innerHTML = '';

    quizzes.forEach((quiz) => {
        const li = document.createElement('li');
        li.textContent = quiz.title;
        li.onclick = () => startQuiz(quiz.id); 
        quizList.appendChild(li);
    });
    
    if (quizzes.length === 0) {
        quizList.innerHTML = '<p style="text-align: center;">هنوز کوییزی ساخته نشده است.</p>';
    }
};

// ۷. دکمه‌ها و فرم‌ها
document.getElementById('create-quiz-btn').addEventListener('click', () => {
    showSection('quiz-creator');
    document.getElementById('quiz-title').value = '';
    document.getElementById('questions-container').innerHTML = '';
    addQuestionField(); 
});

const addQuestionField = () => {
    const container = document.getElementById('questions-container');
    const qIndex = container.children.length;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-block';
    questionDiv.innerHTML = `
        <hr>
        <h4>سوال #${qIndex + 1}</h4>
        <input type="url" id="q-image-${qIndex}" placeholder="لینک عکس (اختیاری)">
        <input type="text" id="q-text-${qIndex}" placeholder="متن سوال">
        <input type="text" id="q-correct-${qIndex}" placeholder="گزینه صحیح (A)">
        <p>گزینه‌ها:</p>
        <textarea id="q-options-${qIndex}" rows="4" placeholder="A: ...\nB: ..."></textarea>
    `;
    container.appendChild(questionDiv);
};

document.getElementById('add-question-btn').addEventListener('click', addQuestionField);

document.getElementById('save-quiz-btn').addEventListener('click', async () => {
    const title = document.getElementById('quiz-title').value.trim();
    if (!title) return alert('عنوان کوییز را وارد کنید');
    
    const newQuiz = { title: title, questions: [] };
    const qContainers = document.getElementById('questions-container').children;

    for (let i = 0; i < qContainers.length; i++) {
        const text = document.getElementById(`q-text-${i}`).value.trim();
        const correct = document.getElementById(`q-correct-${i}`).value.trim();
        const optionsText = document.getElementById(`q-options-${i}`).value.trim();
        const imageUrl = document.getElementById(`q-image-${i}`).value.trim(); 

        if ((text || imageUrl) && correct && optionsText) {
            const options = optionsText.split('\n').filter(o => o.trim() !== '');
            newQuiz.questions.push({ text, imageUrl, correct: correct.toUpperCase(), options });
        }
    }

    if (newQuiz.questions.length > 0) {
        const saved = await saveQuiz(newQuiz);
        if (saved) {
            alert("ذخیره شد!");
            showSection('quiz-selection');
            renderQuizList();
        }
    } else {
        alert('حداقل یک سوال وارد کنید');
    }
});

// ۸. اجرای کوییز
const startQuiz = async (quizId) => {
    currentQuizId = quizId;
    const doc = await db.collection("quizzes").doc(quizId).get();
    
    if (!doc.exists) return alert("کوییز پیدا نشد");
    const quiz = doc.data();

    document.getElementById('current-quiz-title').textContent = quiz.title;
    const questionsDiv = document.getElementById('quiz-questions');
    questionsDiv.innerHTML = '';
    
    quiz.questions.forEach((q, qIndex) => {
        const qElement = document.createElement('div');
        qElement.className = 'quiz-question';
        
        let imgTag = q.imageUrl ? `<img src="${q.imageUrl}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">` : '';
        
        qElement.innerHTML = `${imgTag}<h4>${q.text}</h4>`;
        
        q.options.forEach(opt => {
            const key = opt.charAt(0).toUpperCase();
            qElement.innerHTML += `<label><input type="radio" name="q-${qIndex}" value="${key}"> ${opt}</label><br>`;
        });
        questionsDiv.appendChild(qElement);
    });
    
    document.getElementById('submit-quiz-btn').style.display = 'block';
    showSection('quiz-taker');
};

document.getElementById('submit-quiz-btn').addEventListener('click', async () => {
    if (!currentQuizId) return;
    const doc = await db.collection("quizzes").doc(currentQuizId).get();
    const quiz = doc.data();
    let score = 0;
    
    quiz.questions.forEach((q, i) => {
        const sel = document.querySelector(`input[name="q-${i}"]:checked`);
        if (sel && sel.value === q.correct) score++;
    });
    
    alert(`امتیاز شما: ${score} از ${quiz.questions.length}`);
    showSection('quiz-selection');
});

// شروع برنامه
renderQuizList();
showSection('quiz-selection');
