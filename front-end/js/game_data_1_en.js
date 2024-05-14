export const gameData_en = [
    {
        "question": `<h2>Which metric focuses on the number of correct guesses in comparison to the total number? (Hint: It is a misleading one)</h2>`,
        "answers": [
            { text: "Precision", correct: false },
            { text: "Accuracy", correct: true },
            { text: "Recall", correct: false },
            { text: "F1-Score", correct: false }
        ],
        "explanation": `
            <h3 class='acc-explain1'><span class='green-text'>Correct!</span> Accuracy focuses on seeing how many of the cases we found correctly. In our smoke detection scenario, accuracy focuses on seeing how many <span class="custom-text-info-dark-theme">correct smoke instances</span> we had in comparison to the total</h3>
            <div class="stagger-images-acc">
                <img class='acc-explain-img' src="../img/smoke/smoke1.png">
                <img class='acc-explain-img' src="../img/smoke/smoke2.png">
                <img class='acc-explain-img' src="../img/smoke/smoke3.png">
                <img class='acc-explain-img' src="../img/no-smoke/nosmoke6.png">
            </div>
            <h4 class='acc-explain2'>It can be misleading, because as we saw there can be cases where accuracy <span class='red-text'>fails</span> to capture the performance.</h4>
            <h4 class='acc-explain3'>A good example is when a model randomly predicts we have smoke all the time, and a day when that actually happens.  In this case, for example, the accuracy would be very high. The model has only made <span class='red-text'>one mistake</span>, as shown by the border, but we know it's not good as it only predicts that we have smoke in videos.</h4>
        `
    },

    {
        "question": `<h2>We have an unconventional duet of metrics that constantly attempt to find the balance between: 1) finding all the cases of what we want and 2) making sure what we find is mostly correct. Which are they?</h2>`,
        "answers": [
            { text: "Precision and Recall", correct: true },
            { text: "Accuracy and Precision", correct: false },
            { text: "MCC and F1-Score", correct: false },
            { text: "F1-Score and Recall", correct: false }
        ],
        "explanation": `
            <h3 class='precrec-explain1'><span class='green-text'>Correct!</span> At our smoke detection scenario, finding the balance between <span class="custom-text-info-dark-theme">Precision</span> and <span class="custom-text-info-dark-theme">Recall</span> is extremely important</h3>
            <h4 class='precrec-explain2'><span class="custom-text-info-dark-theme">Precision</span> for our model concerns the number of correct guesses of smoke in videos out of all the guesses of smoke: correct or not The <span class='red-text'>red border</span> signifies the correct and the <span class='orange-text'>orange</span> the wrong prediction</h4>
            <div class="stagger-images-prec">
                <img class='prec-explain-img' src="../img/smoke/smoke1.png">
                <img class='prec-explain-img' src="../img/smoke/smoke2.png">
                <img class='prec-explain-img' src="../img/smoke/smoke3.png">

                <h1 class='division-icons' style='justify-self: center;'> / </h1>

                <div class="stagger-2">
                    <img class='prec-explain-img' src="../img/smoke/smoke1.png">
                    <img class='prec-explain-img' src="../img/smoke/smoke2.png">
                    <img class='prec-explain-img' src="../img/smoke/smoke3.png">
                    <img class='prec-explain-img' src="../img/no-smoke/nosmoke1.png">
                </div>
            </div>

            <h4 class='precrec-explain3'><span class="custom-text-info-dark-theme">Recall</span> on the other hand concerns the number of smoke detections existing that we actually found. The <span class='red-text'>red border</span> signifies the ones that the model identified</h4>
            <div class="stagger-images-rec">
                <img class='rec-explain-img' src="../img/smoke/smoke2.png">
                <img class='rec-explain-img' src="../img/smoke/smoke3.png">

                <h1 style='justify-self: center;'> / </h1>

                <img class='rec-explain-img' src="../img/smoke/smoke1.png">
                <img class='rec-explain-img' src="../img/smoke/smoke2.png">
                <img class='rec-explain-img' src="../img/smoke/smoke3.png">

            </div>
        `
    },

    {
        "question": `<h2>Fill in the blanks: _ is the metric we use that combines Precision and Recall. _ is the second metric used to compliment the effects of the first one.</h2>`,
        "answers": [
            { text: "Precision, Accuracy", correct: false },
            { text: "Accuracy, MCC", correct: false },
            { text: "F1-Score, Recall", correct: false },
            { text: "F1-Score, MCC", correct: true }
        ],
        "explanation": `
            <h3 class='f1mcc-explain1'><span class='green-text'>Correct!</span> F1-Score is the metric used to balance the effects between <span class="custom-text-info-dark-theme">Precision</span> and <span class="custom-text-info-dark-theme">Recall</span>.</h3>
            <h4 class='f1mcc-explain2'> <span class="custom-text-info-dark-theme">F1-Score</span> can be used to measure the performance of our model. The  <span class="custom-text-info-dark-theme">higher</span> the score, the <span class="custom-text-info-dark-theme">higher</span> the performance of the model.</h4>

            <h4 class='f1mcc-explain3'>We should, however, be <span class='red-text'>cautious</span> on the above claim, as F1-Score for our model's case does <span class='red-text'>not</span> take the performance of the model in finding non-smoke videos correctly into consideration.</h4>

            <div class='mccf1-up'>
                <h4 class='f1mcc-explain4'><span class="custom-text-info-dark-theme">MCC</span> solves this and we consider it, as in order to be high, the model has to perform well in detecting <span class="custom-text-info-dark-theme">both</span> smoke and no-smoke videos correctly. Any errors can lower MCC. To demonstrate that, we replicated the doctor's example but this time using the toxic emission's model scenario.</h4>

                <div class='stagger-images-f1mcc'>
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke1.png">
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke2.png">
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke3.png">
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke4.png">
                    <img class='f1mcc-explain-img' src="../img/no-smoke/nosmoke3.png">
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke6.png">
                    <img class='f1mcc-explain-img' src="../img/smoke/smoke7.png">
                </div>

                <div class='f1mcc-box'>
                    <h4><span class="green-text">Correct Smoke</span>: 4</h4>
                    <h4><span class="orange-text">False Smoke</span>: 1</h4>
                    <h4><span class="green-text">Correct Non-Smoke</span>: 0</h4>
                    <h4><span class="red-text">False Non-Smoke</span>: 2</h4>

                    <h4><span class="custom-text-info-dark-theme">F1-Score</span>: 0.72</h4>
                    <h4><span class="custom-text-info-dark-theme">MCC</span>: -0.25</h4>
                </div>

                <h4 class='f1mcc-explain5'>As we can see, the model's F1-Score is excellent as it can predict smoke well. However, the MCC suggests that this model is not worth trusting, as it is bad with predicting non-smoke occassions.</h4>
            </div>
        `
    }
];