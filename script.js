const TOTAL_QUESTIONS = 100; // Change to 100 when your question bank has 100+ questions
const EXAM_DURATION_MINUTES = 90;
const PASS_MARK = 50;

const STORAGE_KEY = "cccPracticeExamState";

let allQuestions = [];
let examQuestions = [];
let answers = {};
let currentQuestionIndex = 0;
let studentName = "";
let selectedCourse = "";
let examStartTime = null;
let examEndTime = null;
let timerInterval = null;
let examFinished = false;
let attemptSaved = false;

// Screens
const startScreen = document.getElementById("start-screen");
const examScreen = document.getElementById("exam-screen");
const resultScreen = document.getElementById("result-screen");
const reviewScreen = document.getElementById("review-screen");

// Start screen
const studentNameInput = document.getElementById("student-name");
const startBtn = document.getElementById("start-btn");

const selectedCourseText =
    document.getElementById("selected-course");

const resultCourse =
    document.getElementById("result-course");

// Exam screen
const candidateName = document.getElementById("candidate-name");
const timerEl = document.getElementById("timer");
const questionNumberEl = document.getElementById("question-number");
const questionStatusText = document.getElementById("question-status-text");

const questionHiEl = document.getElementById("question-hi");
const questionEnEl = document.getElementById("question-en");

const optionAHi = document.getElementById("option-a-hi");
const optionBHi = document.getElementById("option-b-hi");
const optionCHi = document.getElementById("option-c-hi");
const optionDHi = document.getElementById("option-d-hi");

const optionAEn = document.getElementById("option-a-en");
const optionBEn = document.getElementById("option-b-en");
const optionCEn = document.getElementById("option-c-en");
const optionDEn = document.getElementById("option-d-en");

const answerInputs = document.querySelectorAll('input[name="answer"]');

const submitAnswerBtn = document.getElementById("submit-answer-btn");
const resetAnswerBtn = document.getElementById("reset-answer-btn");

const finishExamBtn = document.getElementById("finish-exam-btn");
const instructionBtn = document.getElementById("instruction-btn");

const answeredCountEl = document.getElementById("answered-count");
const notAnsweredCountEl = document.getElementById("not-answered-count");
const questionGrid = document.getElementById("question-grid");

// Result screen
const resultMessage = document.getElementById("result-message");
const scoreValue = document.getElementById("score-value");
const passFailValue = document.getElementById("pass-fail-value");
const correctCountEl = document.getElementById("correct-count");
const wrongCountEl = document.getElementById("wrong-count");
const unansweredCountEl = document.getElementById("unanswered-count");
const percentageValue = document.getElementById("percentage-value");
const reviewBtn = document.getElementById("review-btn");
const restartBtn = document.getElementById("restart-btn");


// Review screen
const reviewList = document.getElementById("review-list");
const backToResultBtn = document.getElementById("back-to-result-btn");

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    try {

        // Restore only the student's name
        const savedName =
            localStorage.getItem("nsqfStudentName") || "";

        // Always start from the primary screen
        showStartScreen();

        if (savedName) {
            studentNameInput.value = savedName;
        }

        // Remove any old unfinished exam
        localStorage.removeItem(STORAGE_KEY);

        attachEventListeners();

    } catch (error) {

        console.error(error);
        alert(error.message);

    }
}

async function loadQuestions() {

    let questionFile = "";

    switch (selectedCourse) {

        case "COAITA":
            questionFile = "data/coaita.json";
            break;

        case "CAA":
            questionFile = "data/caa.json";
            break;

        case "FAIT":
            questionFile = "data/fait.json";
            break;

        default:
            questionFile = "data/coaita.json";
    }

    const response = await fetch(questionFile);

    if (!response.ok) {
        throw new Error(`${questionFile} could not be loaded`);
    }

    const questions = await response.json();

    if (!Array.isArray(questions)) {
        throw new Error(`${questionFile} must contain an array of questions`);
    }

    if (questions.length < TOTAL_QUESTIONS) {
        throw new Error(`${questionFile} must contain at least ${TOTAL_QUESTIONS} questions`);
    }

    return questions;
}

function attachEventListeners() {
    startBtn.addEventListener("click", startNewExam);
    submitAnswerBtn.addEventListener("click", submitAnswer);
    resetAnswerBtn.addEventListener("click", resetAnswer);
    finishExamBtn.addEventListener("click", confirmFinishExam);
    instructionBtn.addEventListener("click", showInstructions);
    reviewBtn.addEventListener("click", showReviewScreen);
    restartBtn.addEventListener("click", restartExam);
    backToResultBtn.addEventListener("click", showResultScreen);
}

async function startNewExam() {

    const name = studentNameInput.value.trim();

    if (!name) {
        alert("Please enter your name before starting the exam.");
        studentNameInput.focus();
        return;
    }

    const selectedCourseRadio =
        document.querySelector('input[name="course"]:checked');

    if (!selectedCourseRadio) {
        alert("Please select a course.");
        return;
    }

    selectedCourse = selectedCourseRadio.value;
    allQuestions = await loadQuestions();
    
    studentName = name;

    localStorage.setItem(
        "nsqfStudentName",
        studentName
    );

    localStorage.setItem(
        "nsqfSelectedCourse",
        selectedCourse
    );

    examQuestions = pickRandomQuestions(allQuestions, TOTAL_QUESTIONS);
    answers = {};
    currentQuestionIndex = 0;
    examStartTime = Date.now();
    examEndTime = examStartTime + EXAM_DURATION_MINUTES * 60 * 1000;
    examFinished = false;
    attemptSaved = false;

    saveState();
    showExamScreen();
    renderQuestionGrid();
    renderQuestion();
    updateStatusCounts();
    startTimer();
}

function pickRandomQuestions(questionBank, count) {
    const shuffled = [...questionBank];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }

    return shuffled.slice(0, count);
}

function showStartScreen() {
    startScreen.classList.remove("hidden");
    examScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
}

function showExamScreen() {
    startScreen.classList.add("hidden");
    examScreen.classList.remove("hidden");
    resultScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");

    candidateName.textContent = `Candidate: ${studentName}`;
    selectedCourseText.textContent = `Course : ${selectedCourse}`;
    renderQuestionGrid();
    updateStatusCounts();
}

function showResultScreen() {
    clearInterval(timerInterval);

    startScreen.classList.add("hidden");
    examScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    reviewScreen.classList.add("hidden");

    renderResult();
}

function showReviewScreen() {
    startScreen.classList.add("hidden");
    examScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    reviewScreen.classList.remove("hidden");

    renderReview();
}

function renderQuestion() {
    const question = examQuestions[currentQuestionIndex];

    questionNumberEl.textContent = currentQuestionIndex + 1;

    questionHiEl.textContent = question.question_hi;
    questionEnEl.textContent = question.question_en;

    optionAHi.textContent = question.options.A.hi;
    optionBHi.textContent = question.options.B.hi;
    optionCHi.textContent = question.options.C.hi;
    optionDHi.textContent = question.options.D.hi;

    optionAEn.textContent = question.options.A.en;
    optionBEn.textContent = question.options.B.en;
    optionCEn.textContent = question.options.C.en;
    optionDEn.textContent = question.options.D.en;

    clearRadioSelection();

    const savedAnswer = answers[question.id];

    if (savedAnswer) {
        const selectedInput = document.querySelector(`input[name="answer"][value="${savedAnswer}"]`);
        if (selectedInput) {
            selectedInput.checked = true;
        }

        questionStatusText.textContent = "Answered";
        questionStatusText.style.background = "#dcfce7";
        questionStatusText.style.color = "#166534";
    } else {
        questionStatusText.textContent = "Not Answered";
        questionStatusText.style.background = "#fee2e2";
        questionStatusText.style.color = "#991b1b";
    }

    updateQuestionGrid();
    updateStatusCounts();
    saveState();
}

function clearRadioSelection() {
    answerInputs.forEach((input) => {
        input.checked = false;
    });
}

function getSelectedAnswer() {
    const selected = document.querySelector('input[name="answer"]:checked');
    return selected ? selected.value : null;
}

function submitAnswer() {
    if (examFinished) return;

    const selectedAnswer = getSelectedAnswer();

    if (!selectedAnswer) {
        alert("Please select an answer before submitting.");
        return;
    }

    const question = examQuestions[currentQuestionIndex];
    answers[question.id] = selectedAnswer;

    saveState();

    currentQuestionIndex = (currentQuestionIndex + 1) % examQuestions.length;

    renderQuestion();
}

function resetAnswer() {
    if (examFinished) return;

    const question = examQuestions[currentQuestionIndex];

    const confirmReset = confirm(`Reset answer for Question ${currentQuestionIndex + 1}?`);

    if (!confirmReset) {
        return;
    }

    delete answers[question.id];

    clearRadioSelection();
    saveState();
    renderQuestion();
}

function goToNextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % examQuestions.length;
    renderQuestion();
}

function goToQuestion(index) {
    currentQuestionIndex = index;
    renderQuestion();
}

function renderQuestionGrid() {
    questionGrid.innerHTML = "";

    examQuestions.forEach((_, index) => {
        const button = document.createElement("button");
        button.className = "question-btn";
        button.textContent = index + 1;
        button.type = "button";

        button.addEventListener("click", () => {
            goToQuestion(index);
        });

        questionGrid.appendChild(button);
    });

    updateQuestionGrid();
}

function updateQuestionGrid() {
    const questionButtons = questionGrid.querySelectorAll(".question-btn");

    questionButtons.forEach((button, index) => {
        const question = examQuestions[index];

        button.classList.remove("answered", "current");

        if (answers[question.id]) {
            button.classList.add("answered");
        }

        if (index === currentQuestionIndex) {
            button.classList.add("current");
        }
    });
}

function updateStatusCounts() {
    const answered = examQuestions.filter((question) => answers[question.id]).length;
    const notAnswered = examQuestions.length - answered;

    answeredCountEl.textContent = answered;
    notAnsweredCountEl.textContent = notAnswered;
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        updateTimerDisplay();

        const remaining = examEndTime - Date.now();

        if (remaining <= 0) {
            clearInterval(timerInterval);
            finishExam(false);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const remaining = Math.max(0, examEndTime - Date.now());

    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    timerEl.textContent = `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}`;
}

function padNumber(number) {
    return String(number).padStart(2, "0");
}

function confirmFinishExam() {
    const confirmed = confirm(
        "Are you sure you want to finish the exam?\n\nAfter finishing, you cannot change your answers."
    );

    if (confirmed) {
        finishExam(true);
    }
}

function finishExam(showManualMessage) {
    examFinished = true;
    clearInterval(timerInterval);
    saveState();

    saveCompletedAttempt();

    if (showManualMessage) {
        alert("Exam finished. Your score will now be displayed.");
    } else {
        alert("Time is over. Your exam has been submitted automatically.");
    }

    showResultScreen();
}

async function saveCompletedAttempt() {
    if (attemptSaved) return;
    attemptSaved = true;

    try {
        const response = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentName,
                course: selectedCourse,
                totalQuestions: examQuestions.length,
                startedAt: new Date(examStartTime).toISOString(),
                result: calculateResult()
            })
        });

        if (!response.ok) {
            throw new Error("The exam result could not be saved.");
        }
    } catch (error) {
        // The site still works as a static practice demo when no server is running.
        console.warn(error.message);
        attemptSaved = false;
    }
}

function calculateResult() {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    examQuestions.forEach((question) => {
        const studentAnswer = answers[question.id];

        if (!studentAnswer) {
            unanswered++;
        } else if (studentAnswer === question.correct) {
            correct++;
        } else {
            wrong++;
        }
    });

    const score = correct;
    const percentage = Math.round((score / examQuestions.length) * 100);
    const passed = score >= PASS_MARK;

    return {
        correct,
        wrong,
        unanswered,
        score,
        percentage,
        passed
    };
}

function renderResult() {
    const result = calculateResult();

    resultMessage.textContent = `${studentName}, you have scored ${result.score} out of ${examQuestions.length}.`;
    resultCourse.textContent =
        `Course : ${selectedCourse}`;
    scoreValue.textContent = `${result.score}/${examQuestions.length}`;
    passFailValue.textContent = result.passed ? "Pass" : "Fail";
    correctCountEl.textContent = result.correct;
    wrongCountEl.textContent = result.wrong;
    unansweredCountEl.textContent = result.unanswered;
    percentageValue.textContent = `${result.percentage}%`;

    passFailValue.style.color = result.passed ? "#166534" : "#991b1b";
}

function renderReview() {
    reviewList.innerHTML = "";

    examQuestions.forEach((question, index) => {
        const studentAnswer = answers[question.id] || null;
        const isCorrect = studentAnswer === question.correct;
        const isUnanswered = !studentAnswer;

        const reviewItem = document.createElement("div");
        reviewItem.className = "review-item";

        let statusText = "Wrong";
        if (isCorrect) statusText = "Correct";
        if (isUnanswered) statusText = "Unanswered";

        const optionsHtml = ["A", "B", "C", "D"]
            .map((optionKey) => {
                let optionClass = "review-option";

                if (optionKey === question.correct) {
                    optionClass += " correct-answer";
                }

                if (studentAnswer === optionKey && studentAnswer !== question.correct) {
                    optionClass += " student-wrong";
                }

                return `
          <div class="${optionClass}">
            <strong>${optionKey}.</strong>
            ${question.options[optionKey].hi}
            <br />
            <span>${question.options[optionKey].en}</span>
          </div>
        `;
            })
            .join("");

        reviewItem.innerHTML = `
      <h2>Question ${index + 1}</h2>

      <p><strong>Hindi:</strong> ${question.question_hi}</p>
      <p><strong>English:</strong> ${question.question_en}</p>

      <div class="review-options">
        ${optionsHtml}
      </div>

      <p class="review-meta">
        Your Answer: ${studentAnswer || "Not Answered"} |
        Correct Answer: ${question.correct} |
        Status: ${statusText}
      </p>
    `;

        reviewList.appendChild(reviewItem);
    });
}

function showInstructions() {
    alert(
        "Instructions:\n\n" +
        "1. Select one answer from A, B, C, or D.\n" +
        "2. Click Submit Answer to save your answer.\n" +
        "3. Click Reset Answer to clear the selected answer for the current question.\n" +
        "4. Use Next Question or the question number grid to move between questions.\n" +
        "5. You may finish the exam early by clicking Finish Exam.\n" +
        "6. The answer key will be shown only after completing the exam."
    );
}

function restartExam() {

    // Keep only the student's name
    const savedName =
        studentName ||
        localStorage.getItem("nsqfStudentName") ||
        "";

    // Remove the saved exam
    localStorage.removeItem(STORAGE_KEY);

    // Remove the selected course
    localStorage.removeItem("nsqfSelectedCourse");

    // Reset variables
    studentName = savedName;
    selectedCourse = "";
    allQuestions = [];
    answers = {};
    currentQuestionIndex = 0;
    examFinished = false;
    attemptSaved = false;

    // Keep only the student's name
    localStorage.setItem("nsqfStudentName", studentName);

    // Show the start screen
    showStartScreen();

    // Restore the student's name
    studentNameInput.value = studentName;

    // Clear the selected course radio button
    document.querySelectorAll('input[name="course"]').forEach(radio => {
        radio.checked = false;
    });
}

function saveState() {
    const state = {
        selectedCourse,
        studentName,
        examQuestions,
        answers,
        currentQuestionIndex,
        examStartTime,
        examEndTime,
        examFinished
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
        return null;
    }

    try {
        return JSON.parse(rawState);
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

function restoreState(state) {
    studentName = state.studentName;
    examQuestions = state.examQuestions;
    answers = state.answers || {};
    currentQuestionIndex = state.currentQuestionIndex || 0;
    examStartTime = state.examStartTime;
    examEndTime = state.examEndTime;
    examFinished = state.examFinished || false;

    if (!studentName && localStorage.getItem("nsqfStudentName")) {
        studentName = localStorage.getItem("nsqfStudentName");
    }

    if (!examQuestions || examQuestions.length === 0) {
        examQuestions = pickRandomQuestions(allQuestions, TOTAL_QUESTIONS);
    }

    if (!examEndTime) {
        examStartTime = Date.now();
        examEndTime = examStartTime + EXAM_DURATION_MINUTES * 60 * 1000;
    }
}
