import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 초기화 관련 코드 제거 (index.html로 이동)

// 변수들을 window 객체에 할당
window.score = 0;
window.currentQuestion = 0;
window.totalQuestions = 10;
window.truePositives = 0;
window.trueNegatives = 0;
window.falsePositives = 0;
window.falseNegatives = 0;

// 함수들을 window 객체에 할당
window.showUserForm = function() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
};

window.showAllResults = async function() {
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('allResults').style.display = 'block';
    await loadAllResults();
};

window.backToMenu = function() {
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('allResults').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('result').innerHTML = '';
};

window.startEvaluation = function() {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('questionContainer').style.display = 'block';
    window.loadAudioFiles();
};

window.loadAudioFiles = function() {
    window.audioFiles = Array.from({length: 13}, (_, i) => i + 1);
    window.startTest();
};

window.createQuestion = function(index) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    questionDiv.innerHTML = `
        <h3>Question ${index + 1}</h3>
        <p>1. First, listen to the transformed audio:</p>
        <audio controls src="transformed/processed_audio_${audioFiles[index]}.wav"></audio>
        <p>2. Listen to the original audio:</p>
        <audio controls src="original/origin_${audioFiles[index]}.wav"></audio>
        <p>3. Is the following audio is same with the transformed audio?</p>
        <audio controls src="${Math.random() < 0.5 ? 
            `transformed/processed_audio_${audioFiles[index]}.wav` : 
            `generated/generated_${audioFiles[index]}.wav`}"></audio>
        <br>
        <button onclick="window.checkAnswer(${index}, true)">True</button>
        <button onclick="window.checkAnswer(${index}, false)">False</button>
    `;
    return questionDiv;
};

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
};

window.showNextQuestion = function() {
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';
    container.appendChild(createQuestion(currentQuestion));
};

window.startTest = function() {
    audioFiles = audioFiles.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    showNextQuestion();
};

function calculateMetrics() {
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    
    return {
        precision: precision.toFixed(2),
        recall: recall.toFixed(2)
    };
};

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
};

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
};

// 전체 결과 조회 함수
window.loadAllResults = async function() {
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
            document.getElementById('avgTP').textContent = '0';
            document.getElementById('avgTN').textContent = '0';
            document.getElementById('avgFP').textContent = '0';
            document.getElementById('avgFN').textContent = '0';
            document.getElementById('resultsBody').innerHTML = '<tr><td colspan="5">No results yet</td></tr>';
            return;
        }

        const avgPrecision = results.reduce((sum, r) => sum + parseFloat(r.precision), 0) / totalResults;
        const avgRecall = results.reduce((sum, r) => sum + parseFloat(r.recall), 0) / totalResults;
        const avgTP = results.reduce((sum, r) => sum + r.truePositives, 0) / totalResults;
        const avgTN = results.reduce((sum, r) => sum + r.trueNegatives, 0) / totalResults;
        const avgFP = results.reduce((sum, r) => sum + r.falsePositives, 0) / totalResults;
        const avgFN = results.reduce((sum, r) => sum + r.falseNegatives, 0) / totalResults;

        // 요약 정보 업데이트
        document.getElementById('totalEvals').textContent = totalResults;
        document.getElementById('avgPrecision').textContent = avgPrecision.toFixed(2);
        document.getElementById('avgRecall').textContent = avgRecall.toFixed(2);
        document.getElementById('avgTP').textContent = avgTP.toFixed(2);
        document.getElementById('avgTN').textContent = avgTN.toFixed(2);
        document.getElementById('avgFP').textContent = avgFP.toFixed(2);
        document.getElementById('avgFN').textContent = avgFN.toFixed(2);

        // 테이블 업데이트
        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = results.map(r => `
            <tr>
                <td>${r.userName}</td>
                <td>${r.score}/${r.totalQuestions}</td>
                <td>${r.truePositives}</td>
                <td>${r.trueNegatives}</td>
                <td>${r.falsePositives}</td>
                <td>${r.falseNegatives}</td>
                <td>${r.precision}</td>
                <td>${r.recall}</td>
                <td>${r.timestamp.toLocaleDateString()} ${r.timestamp.toLocaleTimeString()}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading results:', error);
        alert('Error loading results. Please try again.');
    }
};

// 페이지 로드 시 함수들을 전역으로 등록
window.addEventListener('DOMContentLoaded', () => {
    console.log('Functions registered globally');
});
