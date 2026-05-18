// Stockage des données du quiz
let quizData = [];
const FIXED_OPTION_COUNT = 3; 
const QUESTION_INDEX = 0; 

// LETTERS pour l'affichage côté générateur
const OPTION_LETTERS = ['A', 'B', 'C'];

// ====================================================================
// CONFIGURATION GOOGLE FORM
// ====================================================================
const DEFAULT_FORM_SUBMIT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdBdEdJFkQqJW3t0D0ycO6JKIZ3Ko1jmhJTAlqZavIlkvQIng/formResponse'; 
const DEFAULT_ENTRY_ID_QUIZ_TITLE = '1341448619'; 
const DEFAULT_ENTRY_ID_STATUS = '728642428'; 

function getElementByIdOrDie(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Element ID "${id}" not found.`);
    return element;
}

try {
    const questionsContainer = getElementByIdOrDie('questions-container');
    const generateHtmlBtn = getElementByIdOrDie('generate-html-btn');
    const generatedHtml = document.getElementById('generated-html');

    function createQuestionBlock(index) {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.dataset.index = index;
        block.innerHTML = `
            <label for="q-text-${index}">Texte de la question :</label>
            <input type="text" id="q-text-${index}" placeholder="Ex: Quelle est la capitale de la France ?" required>
            <div class="options-container" id="options-container-${index}"></div>
        `;
        return block;
    }

    function generateFixedSingleChoiceOptions(index) {
        const container = document.getElementById(`options-container-${index}`);
        container.innerHTML = '<label>Options de réponse (cochez la bonne) :</label>';
        
        for (let i = 0; i < FIXED_OPTION_COUNT; i++) {
            const optionRow = document.createElement('div');
            optionRow.className = 'option-row';
            
            // Ajout de la classe option-label pour afficher "Réponse A", "Réponse B", etc.
            optionRow.innerHTML = `
                <span class="option-label">Réponse ${OPTION_LETTERS[i]}</span>
                <input type="radio" name="correct-answer-${index}" id="q${index}-check${i}" ${i === 0 ? 'checked' : ''}>
                <input type="text" placeholder="Saisir le texte de l'option..." id="q${index}-opt${i}-text" required>
            `;
            container.appendChild(optionRow);
        }
    }
    
    function initializeSingleQuestion() {
        const newBlock = createQuestionBlock(QUESTION_INDEX);
        questionsContainer.appendChild(newBlock); 
        generateFixedSingleChoiceOptions(QUESTION_INDEX); 
    }
    
    generateHtmlBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const collectedData = collectQuizData();
        if (collectedData.length > 0) {
            const generatedCode = generateFinalQuiz(collectedData);
            generatedHtml.value = generatedCode;
            generatedHtml.style.display = 'block';
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
            alert("Veuillez remplir la question.");
        }
    });

    initializeSingleQuestion();

    function collectQuizData() {
        const data = [];
        const block = questionsContainer.querySelector('.question-block');
        const questionText = block.querySelector('input[type="text"]').value.trim();
        
        if (!questionText) return data; 

        const question = { id: QUESTION_INDEX, text: questionText, answers: [] };
        
        for (let i = 0; i < FIXED_OPTION_COUNT; i++) {
            const optionText = document.getElementById(`q${QUESTION_INDEX}-opt${i}-text`).value.trim();
            const isCorrect = document.getElementById(`q${QUESTION_INDEX}-check${i}`).checked;
            if (optionText) {
                 question.answers.push({ text: optionText, isCorrect: isCorrect });
            }
        }
        if (question.answers.length > 0) data.push(question);
        return data; 
    }

    function generateFinalQuiz(quizData) {
        const quizJson = JSON.stringify(quizData);
        const q = quizData[0];
        
        let inputHtml = q.answers.map((ans, ansIndex) => `
            <div class="quiz-option" style="margin-bottom: 8px; display: flex; align-items: center; cursor: pointer; padding: 6px; border-radius: 4px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f1f1f1';" onmouseout="this.style.backgroundColor='transparent';">
                <input type="radio" id="q${q.id}-opt${ansIndex}" name="question-${q.id}" value="${ans.text.replace(/"/g, '&quot;')}" style="margin-right: 12px; cursor: pointer;">
                <label for="q${q.id}-opt${ansIndex}" style="font-size: 14px; color: #333; flex-grow: 1; cursor: pointer;">${ans.text}</label>
            </div>
        `).join('');
        
        const quizContentHtml = `
            <div class="question" data-id="${q.id}">
                <div class="answer-area">${inputHtml}</div>
                <div class="feedback" id="feedback-${q.id}" style="font-weight: bold; font-size: 13px; transition: all 0.2s;"></div>
            </div>
        `;

        const quizScript = `
            const quizQuestions = ${quizJson};
            const validateButton = document.querySelector('.validate-btn');
            if (validateButton) {
                validateButton.addEventListener('click', function() {
                    const questionId = this.dataset.questionId;
                    checkAnswer(questionId);
                });
            }

            function sendTrackingData(status) {
                const data = {};
                data['entry.${DEFAULT_ENTRY_ID_QUIZ_TITLE}'] = \`${q.text.replace(/`/g, '\\`')}\`;
                data['entry.${DEFAULT_ENTRY_ID_STATUS}'] = status;
                const formData = new URLSearchParams();
                for (const key in data) formData.append(key, data[key]);
                fetch('${DEFAULT_FORM_SUBMIT_URL}', { method: 'POST', mode: 'no-cors', body: formData });
            }

            function checkAnswer(id) {
                const questionData = quizQuestions.find(q => q.id == id);
                const feedbackElement = document.getElementById('feedback-' + id);
                const answerArea = document.querySelector('.question[data-id="'+id+'"] .answer-area');
                const selectedInput = answerArea.querySelector('input:checked');
                const correctAnswer = questionData.answers.find(a => a.isCorrect);

                if (!selectedInput) { alert("Veuillez sélectionner une réponse."); return; }

                const isCorrect = selectedInput.value === correctAnswer.text;
                sendTrackingData(isCorrect ? 'Correct' : 'Incorrect');

                feedbackElement.style.padding = "10px";
                feedbackElement.style.marginTop = "8px";
                feedbackElement.style.marginBottom = "12px";
                feedbackElement.style.backgroundColor = "#f8f9fa";
                feedbackElement.style.border = "1px solid #e0e0e0";
                feedbackElement.style.borderRadius = "4px";

                if (isCorrect) {
                    feedbackElement.textContent = "✅ Bonne réponse !";
                    feedbackElement.style.color = "#28a745"; 
                } else {
                    feedbackElement.textContent = "❌ Mauvaise réponse. La bonne réponse était : " + correctAnswer.text;
                    feedbackElement.style.color = "#dc3545"; 
                }
                
                const btn = document.querySelector('.validate-btn[data-question-id="'+id+'"]');
                btn.disabled = true; btn.style.background = "#ccc"; btn.style.cursor = "not-allowed";
            }
        `;

        return `
<div class="audio-container" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="padding: 16px 20px 8px 20px; color: #0d346d; font-size: 15px; font-weight: bold; text-align: left; display: flex; align-items: center; gap: 8px;">
        <span><strong>${q.text}</strong></span> 
    </div>
    <div id="quiz-container" style="padding: 0 20px;">
        ${quizContentHtml}
    </div>
    <div style="padding: 12px 20px; border-top: 1px solid #e0e0e0; text-align: center;">
        <button class="validate-btn" data-question-id="${q.id}" 
                style="padding: 8px 18px; background-color: #0d346d; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.2s;" 
                onmouseover="this.style.backgroundColor='#0a2850';" onmouseout="this.style.backgroundColor='#0d346d';" 
                >Valider</button>
    </div>
    <script>${quizScript}</script>
</div>
        `.trim();
    }
} catch (e) { console.warn("Erreur :", e); }