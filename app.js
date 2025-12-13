// ۱. ثبت Service Worker (برای فعال‌سازی PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('سرویس ورکر ثبت شد'))
        .catch((err) => console.log('خطا در ثبت سرویس ورکر:', err));
}

// ۲. توابع کمکی برای ذخیره‌سازی داده‌ها (LocalStorage)
const getQuizzes = () => JSON.parse(localStorage.getItem('quizzes')) || [];
const saveQuizzes = (quizzes) => localStorage.setItem('quizzes', JSON.stringify(quizzes));

// ۳. تابع جابجایی بین بخش‌های HTML
const showSection = (id) => {
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

let currentQuizId = null;

// ۴. رندر لیست کوییزها در صفحه اصلی
const renderQuizList = () => {
    const quizList = document.getElementById('quiz-list');
    quizList.innerHTML = '';
    const quizzes = getQuizzes();

    quizzes.forEach((quiz, index) => {
        const li = document.createElement('li');
        li.textContent = quiz.title;
        li.onclick = () => startQuiz(index); 
        quizList.appendChild(li);
    });
    
    if (quizzes.length === 0) {
        quizList.innerHTML = '<p style="text-align: center;">هنوز کوییزی ساخته نشده است.</p>';
    }
};

// ۵. مدیریت بخش ساخت کوییز
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
        <input type="text" id="q-text-${qIndex}" placeholder="متن سوال (مثلاً پایتخت ایران کجاست؟)">
        <input type="text" id="q-correct-${qIndex}" placeholder="حرف گزینه صحیح (مثلاً A)">
        <p>گزینه‌ها:</p>
        <textarea id="q-options-${qIndex}" rows="4" placeholder="A: تهران\nB: اصفهان\nC: شیراز\n..."></textarea>
    `;
    container.appendChild(questionDiv);
};

document.getElementById('add-question-btn').addEventListener('click', addQuestionField);

document.getElementById('save-quiz-btn').addEventListener('click', () => {
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

        if (text && correct && optionsText) {
            const options = optionsText.split('\n').filter(o => o.trim() !== '');
            newQuiz.questions.push({ text, correct: correct.toUpperCase(), options });
        }
    }

    if (newQuiz.questions.length > 0) {
        const quizzes = getQuizzes();
        quizzes.push(newQuiz);
        saveQuizzes(quizzes);
        alert(`کوییز "${title}" ذخیره شد!`);
        showSection('quiz-selection');
        renderQuizList();
    } else {
        alert('لطفاً حداقل یک سوال معتبر و کامل اضافه کنید.');
    }
});

// ۶. منطق شروع و حل کوییز (دانش‌آموز)
const startQuiz = (index) => {
    currentQuizId = index;
    const quizzes = getQuizzes();
    const quiz = quizzes[index];

    document.getElementById('current-quiz-title').textContent = `شروع کوییز: ${quiz.title}`;
    const questionsDiv = document.getElementById('quiz-questions');
    questionsDiv.innerHTML = '';
    
    quiz.questions.forEach((q, qIndex) => {
        const qElement = document.createElement('div');
        qElement.className = 'quiz-question';
        qElement.innerHTML = `<h4>${qIndex + 1}. ${q.text}</h4>`;
        
        q.options.forEach(optionText => {
            // استخراج حرف گزینه (A, B, C...) و متن گزینه
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

document.getElementById('submit-quiz-btn').addEventListener('click', () => {
    if (currentQuizId === null) return;
    const quiz = getQuizzes()[currentQuizId];
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

// اجرای اولیه برنامه
renderQuizList();
showSection('quiz-selection');
