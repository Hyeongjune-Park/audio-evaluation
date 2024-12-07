// Firebase Firestore 관련 import
import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    // Firebase 콘솔에서 가져온 설정값들
    apiKey: "AIzaSyBEut0bKHQVqtgfZ0KXzuR5QBQxi2Och8w",
    authDomain: "ee488-2f4d3.firebaseapp.com",
    projectId: "ee488-2f4d3",
    storageBucket: "ee488-2f4d3.firebasestorage.app",
    messagingSenderId: "638150019577",
    appId: "1:638150019577:web:85cf4936ec61aa05ab5528",
    measurementId: "G-ZNHWC7151T"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 사용자 정보 저장 변수
let userName = '';
let userEmail = '';

let score = 0;
let currentQuestion = 0;
const totalQuestions = 10;

// Confusion Matrix values
let truePositives = 0;  // Correctly predicted transformed audio as transformed
let trueNegatives = 0;  // Correctly predicted generated audio as generated
let falsePositives = 0; // Incorrectly predicted generated audio as transformed
let falseNegatives = 0; // Incorrectly predicte

// Audio file path settings
const originalAudioPath = './origin/';
const transformedAudioPath = './transformed/';
const generatedAudioPath = './generated/';
const length = 13;

// Audio file list
let audioFiles = [];

function loadAudioFiles() {
    audioFiles = Array.from({length}, (_, i) => i + 1);
    startTest();
}

function createQuestion(index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <h3>Question ${index + 1}</h3>
        <p>1. First, listen the transformed audio:</p>
        <audio controls src="${transformedAudioPath}processed_audio_${audioFiles[index]}.wav"></audio>
        <p>2. Then, listen the original audio:</p>
        <audio controls src="${originalAudioPath}origin_${audioFiles[index]}.wav"></audio>
        <p>3. Is this audio is same with the first transformed audio?</p>
        <audio controls src="${Math.random() < 0.5 ? 
            `${transformedAudioPath}processed_audio_${audioFiles[index]}.wav` : 
            `${generatedAudioPath}generated_${audioFiles[index]}.wav`}"></audio>
        <br>
        <button onclick="checkAnswer(${index}, true)">True</button>
        <button onclick="checkAnswer(${index}, false)">False</button>
    `;
    return questionDiv;
}

function checkAnswer(questionIndex, userAnswer) {
    const isTransformed = document.querySelector('.question audio:last-of-type').src.includes('processed_audio');
    
    // Calculate confusion matrix values
    if (isTransformed && userAnswer) {
        truePositives++;
    } else if (!isTransformed && !userAnswer) {
        trueNegatives++;
    } else if (!isTransformed && userAnswer) {
        falsePositives++;
    } else if (isTransformed && !userAnswer) {
        falseNegatives++;
    }

    if ((userAnswer && isTransformed) || (!userAnswer && !isTransformed)) {
        score++;
    }
    
    currentQuestion++;
    if (currentQuestion < totalQuestions) {
        showNextQuestion();
    } else {
        showFinalResult();
    }
}

function calculateMetrics() {
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    
    return {
        precision: precision.toFixed(2),
        recall: recall.toFixed(2)
    };
}

function showNextQuestion() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';
    container.appendChild(createQuestion(currentQuestion));
}

function startEvaluation() {
    userName = document.getElementById('userName').value;
    userEmail = document.getElementById('userEmail').value;
    
    if (!userName || !userEmail) {
        alert('Please enter both name and email');
        return;
    }
    
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    loadAudioFiles();
}

async function saveResults() {
    const metrics = calculateMetrics();
    const results = {
        userName: userName,
        userEmail: userEmail,
        timestamp: new Date(),
        score: score,
        totalQuestions: totalQuestions,
        truePositives: truePositives,
        trueNegatives: trueNegatives,
        falsePositives: falsePositives,
        falseNegatives: falseNegatives,
        precision: metrics.precision,
        recall: metrics.recall
    };

    try {
        await addDoc(collection(window.db, 'evaluationResults'), results);
        console.log('Results saved successfully');
    } catch (error) {
        console.error('Error saving results:', error);
    }
}

function showFinalResult() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';
    const result = document.getElementById('result');
    
    const metrics = calculateMetrics();
    
    result.innerHTML = `
        <h2>Evaluation Complete!</h2>
        <p>You got ${score} correct answers out of ${totalQuestions} questions.</p>
        <h3>Detailed Analysis:</h3>
        <p>True Positives (TP): ${truePositives}</p>
        <p>True Negatives (TN): ${trueNegatives}</p>
        <p>False Positives (FP): ${falsePositives}</p>
        <p>False Negatives (FN): ${falseNegatives}</p>
        <p>Precision: ${metrics.precision}</p>
        <p>Recall: ${metrics.recall}</p>
    `;

    // 결과 저장
    saveResults();
}

function startTest() {
    // Randomly select audio files
    audioFiles = audioFiles.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    showNextQuestion();
}

// Start test when page loads
window.addEventListener('DOMContentLoaded', loadAudioFiles);

// 전체 결과 조회 함수
async function loadAllResults() {
    try {
        const resultsRef = collection(window.db, 'evaluationResults');
        const q = query(resultsRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        const results = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            results.push({
                ...data,
                timestamp: data.timestamp.toDate()
            });
        });

        // 평균 계산
        const totalResults = results.length;
        if (totalResults === 0) {
            document.getElementById('totalEvals').textContent = '0';
            document.getElementById('avgPrecision').textContent = '0';
            document.getElementById('avgRecall').textContent = '0';
            document.getElementById('resultsBody').innerHTML = '<tr><td colspan="5">No results yet</td></tr>';
            return;
        }

        const avgPrecision = results.reduce((sum, r) => sum + parseFloat(r.precision), 0) / totalResults;
        const avgRecall = results.reduce((sum, r) => sum + parseFloat(r.recall), 0) / totalResults;

        // 요약 정보 업데이트
        document.getElementById('totalEvals').textContent = totalResults;
        document.getElementById('avgPrecision').textContent = avgPrecision.toFixed(2);
        document.getElementById('avgRecall').textContent = avgRecall.toFixed(2);

        // 테이블 업데이트
        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = results.map(r => `
            <tr>
                <td>${r.userName}</td>
                <td>${r.score}/${r.totalQuestions}</td>
                <td>${r.precision}</td>
                <td>${r.recall}</td>
                <td>${r.timestamp.toLocaleDateString()} ${r.timestamp.toLocaleTimeString()}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading results:', error);
        alert('Error loading results. Please try again.');
    }
}

// 화면 전환 함수들
function showUserForm() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
}

function showAllResults() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('allResults').style.display = 'block';
    loadAllResults();
}

function backToMenu() {
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('allResults').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('result').innerHTML = '';
}
