import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

window.showUserForm = function() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
}

window.showAllResults = function() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('allResults').style.display = 'block';
    loadAllResults();
}

window.backToMenu = function() {
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('allResults').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('result').innerHTML = '';
}

window.startEvaluation = function() {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    loadAudioFiles();
}

window.loadAudioFiles = function() {
    window.audioFiles = Array.from({length: 20}, (_, i) => i + 1);
    window.startTest();
}

window.createQuestion = function(index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <h3>Question ${index + 1}</h3>
        <p>1. First, listen to the transformed audio:</p>
        <audio controls src="transformed/processed_audio_${audioFiles[index]}.wav"></audio>
        <p>2. Listen to the original audio:</p>
        <audio controls src="original/origin_${audioFiles[index]}.wav"></audio>
        <p>3. Is the following audio transformed?</p>
        <audio controls src="${Math.random() < 0.5 ? 
            `transformed/processed_audio_${audioFiles[index]}.wav` : 
            `generated/generated_${audioFiles[index]}.wav`}"></audio>
        <br>
        <button onclick="window.checkAnswer(${index}, true)">This is transformed audio</button>
        <button onclick="window.checkAnswer(${index}, false)">This is generated audio</button>
    `;
    return questionDiv;
}

window.checkAnswer = function(questionIndex, userAnswer) {
    const isTransformed = document.querySelector('.question audio:last-of-type').src.includes('processed_audio');
    
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

window.showNextQuestion = function() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';
    container.appendChild(createQuestion(currentQuestion));
}

window.startTest = function() {
    audioFiles = audioFiles.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    showNextQuestion();
}

function calculateMetrics() {
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    
    return {
        precision: precision.toFixed(2),
        recall: recall.toFixed(2)
    };
}

async function saveResults() {
    const metrics = calculateMetrics();
    const results = {
        userName: document.getElementById('userName').value || 'Anonymous',
        userEmail: document.getElementById('userEmail').value || 'anonymous@example.com',
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
