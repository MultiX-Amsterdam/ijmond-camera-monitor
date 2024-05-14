import { makeStory } from "https://cdn.jsdelivr.net/npm/plotteus";
import { gameData_en } from './game_data_1_en.js';
import { gameData_gr } from "./game_data_1_gr.js";

(function(){
    "use strict";

    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();
    var wrong_answers_total = 0;
    var wrong_answer_current = 0;
    var client_id = '';
    var explanationChart = null;

    // Always start at the beginning of the page on reload
    window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            const hash = '#start';
            window.location.hash = "";
            window.location.hash = hash;
            $('#loading-overlay').hide(); // Hide the loading
        }, 1000);
    });

    /**
     * Fetches the Model's scores necessary to populate the page.
    */
    async function fetchModelScores() {
        try {
            const response = await fetch(`${api_url_root}/get_model_data`);
            const data = await response.json();
            const labels = [];
            const mcc = [];
            const f1 = [];
            const precision = [];
            const recall = [];
            const tp = [];
            const tn = [];
            const fp = [];
            const fn = [];

            data.model_data.forEach(entry => {
                labels.push(new Date(entry.date)); // Assuming 'date' needs to be converted to Date object
                f1.push(entry.f1);
                mcc.push(entry.mcc);
                recall.push(entry.recall);
                precision.push(entry.precision);
                tp.push(entry.tp);
                tn.push(entry.tn);
                fp.push(entry.fp);
                fn.push(entry.fn);
            });
            return {
                labels: labels,
                mcc: mcc,
                f1: f1,
                precision: precision,
                recall: recall,
                tp: tp,
                tn: tn,
                fp: fp,
                fn: fn
            };
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    /**
     * Displays either the chart or the confusion matrix
    */
    function displayVisualization() {
        const switchButton = document.getElementById('switch-visualizer');
        const isChecked = switchButton.checked;
    
    
        if (isChecked) {
            gsap.timeline()
            .to("#backchange-bar", { autoAlpha: 0 })
            .to("#visualize-chart", { autoAlpha: 0 })
            .to("#visualize-explanation", { autoAlpha: 0 },'<')

            .to(".predicted-smoke-container", { autoAlpha: 1 }, '>')
            .to(".correct-smoke-container", { autoAlpha: 1 }, '>')
            .to(".predicted-nosmoke-container", { autoAlpha: 1 }, '>')
            .to(".noncorrect-smoke-container", { autoAlpha: 1 }, '>')

            .to(".tparrow-container", { autoAlpha: 1 })
            .to(".tnarrow-container", { autoAlpha: 1 }, '<')

            .to(".fpfnarrow-container", { autoAlpha: 1 })

            .to("#confusionmatrix-explanation", { autoAlpha: 1 })

            .to("#backchange-bar", { autoAlpha: 1 });
        } else {
            gsap.timeline()
            .to("#backchange-bar", { autoAlpha: 0 })
            .to(".predicted-smoke-container", { autoAlpha: 0 }, '<')
            .to(".correct-smoke-container", { autoAlpha: 0 }, '<')
            .to(".predicted-nosmoke-container", { autoAlpha: 0 }, '<')
            .to(".noncorrect-smoke-container", { autoAlpha: 0 }, '<')
            .to(".tparrow-container", { autoAlpha: 0 }, '<')
            .to(".tnarrow-container", { autoAlpha: 0 }, '<')
            .to(".fpfnarrow-container", { autoAlpha: 0 }, '<')
            .to("#confusionmatrix-explanation", { autoAlpha: 0 })

            .to("#visualize-chart", { autoAlpha: 1 })
            .to("#visualize-explanation", { autoAlpha: 1 })
            .to("#backchange-bar", { autoAlpha: 1 });
        }
    }       
    
    /**
     * Fetches the Model's scores necessary to populate the page.
     * @param {any} data - Data to populate our visualizations
     * @param {int} selectedIndex - The date chosen by the user
    */
    function generateVisualization(data, selectedIndex) {
        const mccThreshold = 0.5;
        const f1Threshold = 0.5;
        const tpThreshold = 32;
        const tnThreshold = 27;

        const mcc = data.mcc[selectedIndex];
        const f1 = data.f1[selectedIndex];
        const tp = data.tp[selectedIndex];
        const fp = data.fp[selectedIndex];
        const tn = data.tn[selectedIndex];
        const fn = data.fn[selectedIndex];

        let tpPrev = -1;
        let tnPrev = -1;

        if (selectedIndex != 0) { // Make sure we have previous models to compare against
            tpPrev = data.tp[selectedIndex - 1];
            tnPrev = data.tn[selectedIndex - 1];
        }

        if (tp > tpThreshold && tn > tnThreshold) {
            document.getElementById('performance-eval').innerHTML = i18next.t('detection-smoke-nosmoke-good');
        } else if (tp <= tpThreshold && tn > tnThreshold) {
            document.getElementById('performance-eval').innerHTML = i18next.t('detection-nosmoke-good');
        } else if (tp > tpThreshold && tn <= tnThreshold) {
            document.getElementById('performance-eval').innerHTML = i18next.t('detection-smoke-good');
        } else {
            document.getElementById('performance-eval').innerHTML = i18next.t('detection-smoke-nosmoke-bad');
        }

        if (tpPrev != -1) { // A check for one is enough
            if (tp > tpPrev && tn > tnPrev) {
                document.getElementById('time-eval').innerHTML = i18next.t('better-lasttime-smoke-nosmoke');
            } else if (tp <= tpPrev && tn > tnPrev) {
                document.getElementById('time-eval').innerHTML = i18next.t('better-lasttime-smoke');
            } else if (tp > tpPrev && tn <= tnPrev) {
                document.getElementById('time-eval').innerHTML = i18next.t('better-lasttime-nosmoke');
            } else {
                document.getElementById('time-eval').innerHTML = i18next.t('worse-lasttime-smoke-nosmoke');
            }
        } else {
            document.getElementById('time-eval').innerHTML = i18next.t('no-data');
        }

        // Set the texts in the confusion matrix for whenever it is toggled
        document.getElementById('tptext').innerText = tp;
        document.getElementById('tntext').innerText = tn;
        document.getElementById('fptext').innerText = fp;
        document.getElementById('fntext').innerText = fn;

        let explanationKey = ""; // Default key

        if (explanationChart !== null) {
            explanationChart.destroy();
        }

        if (mcc > mccThreshold && f1 > f1Threshold) {
            explanationKey = "performance-good";
        } else if (mcc >= 0.0 && mcc <= 0.2) {
            explanationKey = "performance-random";
        } else if (mcc < 0) {
            explanationKey = "performance-trust-issue";
        } else if (mcc <= mccThreshold && f1 > f1Threshold) {
            explanationKey = "performance-mcc-low";
        } else {
            explanationKey = "performance-unexpected";
        }
    

        document.getElementById('visualize-explanation').innerHTML = i18next.t(explanationKey);

        explanationChart = createChart('visualize-chart', data.labels, data.f1, data.mcc, selectedIndex);

        document.getElementById('switch-visualizer').addEventListener('change', function() {
            displayVisualization();  // Switch views when toggled
        });

        document.getElementById('backarrow').addEventListener('click', function() {
            // Hide the chart and explanation elements, make the calendar visible if we click the arrow
            gsap.to(".tparrow-container", { autoAlpha: 0, duration: 0.5 }, '<');
            gsap.to(".tnarrow-container", { autoAlpha: 0, duration: 0.5 }, '<');
            gsap.to(".fpfnarrow-container", { autoAlpha: 0, duration: 0.5}, '<');
            gsap.to("#confusionmatrix-explanation", { autoAlpha: 0 }, '<');
            gsap.to(".predicted-smoke-container", { autoAlpha: 0 }, '<');
            gsap.to(".correct-smoke-container", { autoAlpha: 0 }, '<');
            gsap.to(".predicted-nosmoke-container", { autoAlpha: 0 }, '<');
            gsap.to(".noncorrect-smoke-container", { autoAlpha: 0 }, '<');
            gsap.to("#visualize-chart", { autoAlpha: 0 }, '<');
            gsap.to("#visualize-explanation", { autoAlpha: 0 }, '<');
            gsap.to("#backchange-bar", { autoAlpha: 0 },'<');
            gsap.to("#date-picker", { autoAlpha: 1 });

            // Uncheck the toggle to be ready for the next selection
            document.getElementById('switch-visualizer').checked = false;
        });

        gsap.to("#date-picker", { autoAlpha: 0 });
        gsap.to("#backchange-bar", { autoAlpha: 1 });
        gsap.to("#visualize-chart", { autoAlpha: 1 });
        gsap.to("#visualize-explanation", { autoAlpha: 1 });
    }

    /**
     * Creates the chart with X axis being the last 5 entries in the DB records of the model, and Y being scores (F1-Score and MCC).
     * @param {any} chartElem - Container to attach our chart
     * @param {list} labels - Contains which are the last 7 days
     * @param {list} f1Data - Contains the F1-Score of the model over time
     * @param {list} mccData - Contains the MCC of the model over time
     * @param {string} highlightIndex - Is the date we are highlighting, or the one the user picked
    */
    function createChart(chartElem, labels, f1Data, mccData, highlightIndex) {
        const ctx = document.getElementById(chartElem).getContext('2d');
        return new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
    
            // Settings
            data: {
                labels: labels,
                datasets: [{
                    label: 'F1-Score',
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: f1Data,
                    fill: false,
                    pointRadius: f1Data.map((_, index) => index === highlightIndex ? 8 : 3),
                    pointBackgroundColor: f1Data.map((_, index) => index === highlightIndex ? 'black' : 'rgb(255, 99, 132)'),
                    pointBorderColor: f1Data.map((_, index) => index === highlightIndex ? '#3be4ff' : 'rgb(255, 99, 132)'),
                    pointBorderWidth: f1Data.map((_, index) => index === highlightIndex ? 3 : 1)
                }, {
                    label: 'MCC',
                    backgroundColor: 'rgb(54, 162, 235)',
                    borderColor: 'rgb(54, 162, 235)',
                    data: mccData,
                    fill: false,
                    pointRadius: mccData.map((_, index) => index === highlightIndex ? 8 : 3),
                    pointBackgroundColor: mccData.map((_, index) => index === highlightIndex ? 'black' : 'rgb(54, 162, 235)'),
                    pointBorderColor: mccData.map((_, index) => index === highlightIndex ? '#3be4ff' : 'rgb(54, 162, 235)'),
                    pointBorderWidth: mccData.map((_, index) => index === highlightIndex ? 3 : 1)
                }]
            },
    
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            color: "black",
                        },
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'dd/MM/yyyy',
                            displayFormats: {
                                day: 'dd/MM/yyyy'
                            },            
                            parser: 'dd/MM/yyyy'
                        },
                        ticks: {
                            color: 'black',
                            maxRotation: 90,
                            autoSkip: true,
                            maxTicksLimit: 5
                        }
                    },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: 'black'
                    }
                  }
                }
            }
        });
    }    

    /**
     * Creates the chart in Section 3
    */
    function chartDemonstrationCreate() {
        const div = document.querySelector(".metrics-example");
        const steps = [
        {
            key: "zero",
            chartType: "bar",
            groups: [
            {
                key: "A",
                data: [
                { key: "2023", value: 60000, fill: "#32bff2" },
                { key: "2024", value: 35000, fill: "#0572CD" },
                ],
            },
            {
                key: "B",
                data: [
                { key: "2023", value: 45000 },
                { key: "2024", value: 20000 },
                ],
            },
            {
                key: "C",
                data: [
                { key: "2023", value: 150000 },
                { key: "2024", value: 300000 },
                ],
            },
            ],
        },
        {
            key: "one",
            chartType: "pie",
            groups: [
            {
                key: "pieGroup",
                title: "Employee Satisfaction",
                data: [
                { key: "😁", value: 1, teleportFrom: "A:2023", fill: "#32bff2" },
                { key: "🙂", value: 2, teleportFrom: "B:2023", fill: "#0572CD" },
                { key: "☹️", value: 3, teleportFrom: "C:2023", fill: "#8AD2F1" },
                ],
            },
            ],
        }];

        const options = {svgBackgroundColor: "#00000000"};
        const story = makeStory(div, steps, options);
        return story;
    }

    /**
     * Changes the chart animation per progress change in scrolling
    */
    function chartDemonstrationChange(story, progress) {
        if (progress < 0.5) {
            story.render("zero", progress * 2, false);
        } else {
            story.render("one", (progress - 0.5) * 2, false);
        }
    }

    /**
     * Function to dynamically create patients
     * @param {any} container - The div container that holds the created patients
    */
    function createPatients(container) {
        let img;
        
        // Create 4 people for the top row
        for (let i = 0; i < 4; i++) {
          img = document.createElement('img');
          img.src = './img/person.svg';
          img.className = 'img-fluid';
          img.style.gridArea = `1/${i + 2}`;
          container.appendChild(img);
        }
        
        // Create 6 people for the bottom row
        for (let i = 0; i < 6; i++) {
          img = document.createElement('img');
          img.src = './img/person.svg';
          img.className = 'img-fluid';
          img.style.gridArea = `2/${i + 1}`;
          container.appendChild(img);
        }
    }

    /**
     * Function to dynamically create a line of patient images, a threshold slider, a bounding box, 
     * and update diagnosis statistics based on the slider value.
     * @param {any} container - The div container that holds the created patient images.
     */
    function createUpdatePatientsLine(container) {
        // Helper function to create patient images
        function createPatientImage(index) {
            const img = document.createElement('img');
            img.src = './img/person.svg';
            img.className = 'img-fluid' + ((index === 1 || index === 6 || index === 8 || index === 9) ? ' sick' : '');
            img.style.gridArea = `1/${index + 1}`;
            container.appendChild(img);
        }

        // Helper function to create and configure a slider
        function createSlider() {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '1';
            slider.max = '9';
            slider.value = '5'; // Starting value, mid-point
            slider.className = 'slider';
            slider.style.gridArea = '2 / 1 / 3 / 11';
            slider.style.opacity = 0;
            return slider;
        }

        // Helper function to create slider description text
        function createSliderDescription() {
            const desc = document.createElement('p');
            desc.className = 'slider-desc';
            desc.style.opacity = 0;
            desc.style.gridArea = '3 / 1 / 3 / 11';
            return desc;
        }

        // Create 10 patient images in a row
        for (let i = 0; i < 10; i++) {
            createPatientImage(i);
        }

        const slider = createSlider();
        const sliderDesc = createSliderDescription();
        const borderBox = document.createElement('div');
        borderBox.className = 'border-box';

        // Append slider, description, and border box to the container
        container.append(slider, sliderDesc, borderBox);

        /**
         * Update patients diagnosis based on the slider value
         * @param {str} value The value of the slider
         */
        function updatePatientDiagnosis(value) {
            let tp = 0, fp = 0, tn = 0, fn = 0;
            const threshold = parseInt(value, 10);

            container.querySelectorAll('img').forEach((icon, index) => {
                if (index >= threshold && icon.classList.contains('sick')) {
                    tp++;
                } else if (index < threshold && !icon.classList.contains('sick')) {
                    tn++;
                } else if (index >= threshold) {
                    fp++;
                } else {
                    fn++;
                }
            });

            borderBox.style.gridArea = `1 / ${threshold + 1} / 1 / 11`;

            // Update the text content for TP, FP, TN, FN, Precision, and Recall
            document.getElementById('tp').innerHTML = window.i18n.t('correctly-sick', { count: tp });
            document.getElementById('fp').innerHTML = window.i18n.t('falsely-sick', { count: fp });
            document.getElementById('fn').innerHTML = window.i18n.t('falsely-healthy', { count: fn });
            document.getElementById('tn').innerHTML = window.i18n.t('correctly-healthy', { count: tn });
            document.getElementById('precision').innerHTML = window.i18n.t('precision', { value: (tp + fp === 0 ? '0.00' : (tp / (tp + fp)).toFixed(2)) });
            document.getElementById('recall').innerHTML = window.i18n.t('recall', { value: (tp / (tp + fn)).toFixed(2) });
            sliderDesc.textContent = window.i18n.t('strictness', { value: `${value * 10}%` });
        }

        // Event listener for slider input
        slider.addEventListener('input', (e) => {
            updatePatientDiagnosis(e.target.value);
        });

        // Initialize the display
        updatePatientDiagnosis(slider.value);
    }

    /**
     * Function to dynamically create a line of patient images only, no slider
     * @param {any} container - The div container that holds the created patient images.
    */
    function createPatientsLinePlain(container) {
        // Helper function to create patient images
        function createPatientImage(index) {
            const img = document.createElement('img');
            img.src = './img/person.svg';
            img.className = 'img-fluid';
            img.style.gridArea = `1/${index + 1}`;
            container.appendChild(img);
        }

        // Create 10 patient images in a row
        for (let i = 0; i < 10; i++) {
            createPatientImage(i);
        }
    }

    /**
     * Updates the chalice on top of the scales, and the values at the slider 
    */
    function f1Chalice() {
        let precisionSlider = document.querySelector('.slider-precision');
        let recallSlider = document.querySelector('.slider-recall');
        let precisionSliderValue = document.querySelector('#precision-value');
        let recallSliderValue = document.querySelector('#recall-value');
        let f1Score = document.querySelector('#f1-score');

        // Updates the angle in which the scales should tilt: They move from -15 to 15, hence the formula for rotation
        function updateAngle(precision,recall) {
            let angle = -15 * (precision - recall);
            document.querySelector('.scale-horizontal').style.transform = `rotate(${angle}deg)`;
        }
    
        // Updates the precision and the F1-score based on it
        function updatePrecision(precision, recall) {
            precisionSliderValue.textContent = `${precision}`;
            precision = parseFloat(precision);
            recall = parseFloat(recall);
            if (precision != 0 || recall != 0) {
                f1Score.textContent = `${(2 * precision * recall / (precision + recall)).toFixed(2)}`;
            } else {
                f1Score.textContent = "0";
            }
            updateAngle(precision,recall);
        }
            
        // Updates the recall and the F1-score based on it
        function updateRecall(recall, precision) {
            recallSliderValue.textContent = `${recall}`;
            precision = parseFloat(precision);
            recall = parseFloat(recall);
            if (recall != 0 || precision != 0) {
                f1Score.textContent = `${(2 * precision * recall / (precision + recall)).toFixed(2)}`;
            } else {
                f1Score.textContent = "0";
            }
            updateAngle(precision,recall);
        }
    
        // Event listener for sliders' input
        precisionSlider.addEventListener('input', (e) => {
            updatePrecision(e.target.value, recallSliderValue.textContent);
        });
    
        recallSlider.addEventListener('input', (e) => {
            updateRecall(e.target.value, precisionSliderValue.textContent);
        });
    }

    /**
     * Initializes and manages game loading based on provided game data.
     * @param {any} gameData - The game data loaded from game_data files.
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
     */
    function loadGame(gameData, client_id) {
        let currentIndex = 0;

        displayQuestion(gameData[currentIndex], currentIndex, client_id);

        const nextButton = document.getElementById('next-question');
        nextButton.style.display = 'none';

        nextButton.onclick = () => {
            currentIndex++;

            displayQuestion(gameData[currentIndex], currentIndex, client_id);
        };
    }

    /**
     * Populates the question container based on the JSON file
     * @param {any} questionData - The game data loaded from game_data files.
     * @param {int} index - The question's index
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
    */
    function displayQuestion(questionData, index, client_id) {
        let questionContainer = document.getElementById('question-container');
        let explanationContainer = document.getElementById('explanation-container');
        let answerOptions = document.getElementById('answer-options');
        let nextButton = document.getElementById('next-question');

        gsap.to(explanationContainer, { autoAlpha: 0 });
        gsap.to(questionContainer, { autoAlpha: 1 });
        gsap.to(nextButton, { autoAlpha: 0 });
        gsap.to(answerOptions, { autoAlpha: 1 });
    
        questionContainer.innerHTML = questionData.question;

        answerOptions.innerHTML = '';
    
        questionData.answers.forEach(answer => {
            let button = document.createElement('button');
            button.className = 'btn btn-light btn-lg btn-block';
            button.textContent = answer.text;
            button.onclick = () => handleAnswer(questionData.explanation, answer.correct, button, nextButton, index, client_id);
            answerOptions.appendChild(button);
        });
    
        gsap.to(questionContainer, { opacity: 1, duration: 1 });
    }
    
    /**
     * Handles the answer selected by the user
     * @param {any} explanation - The game data loaded from game_data files.
     * @param {bool} isCorrect - If the answer is correct or not
     * @param {any} button - The question button the user pressed
     * @param {any} nextButton - The next button
     * @param {int} index - The question's index
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
    */
    function handleAnswer(explanation, isCorrect, button, nextButton, index, client_id) {
        if (isCorrect) {
            button.classList.replace('btn-light', 'btn-success');
            nextButton.style.display = 'block';
            displayExplanation(explanation, index, client_id)
        } else {
            button.classList.replace('btn-light', 'btn-danger');
            wrong_answers_total += 1;
            wrong_answer_current += 1;
        }
    }

    /**
     * Populate the explanation container
     * @param {any} explanationHTML - The raw HTML from the JSON file
     * @param {int} index - The question's index
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
    */
    function displayExplanation(explanationHTML, index, client_id) {
        const explanationContainer = document.getElementById('explanation-container');
        const questionContainer = document.getElementById('question-container');
        const answerOptions = document.getElementById('answer-options');
        const nextButton = document.getElementById('next-question');

        explanationContainer.innerHTML = explanationHTML;

        let tl = gsap.timeline();

        tl.to(questionContainer, { autoAlpha: 0 });
        tl.to(answerOptions, { autoAlpha: 0 }, "<");
        tl.to(explanationContainer, { autoAlpha: 1 });

        if (index == 0) {
            saveGame(-1, client_id); // We start the game in our DB
            saveResult(client_id, 0); // We save the number of mistakes the user has done
            wrong_answer_current = 0;

            tl.from(".stagger-images-acc img", {
                opacity: 0,
                y: 20,
                stagger: 0.2,
                duration: 0.5,
                ease: "power2.out"
            });

            tl.to(explanationContainer.getElementsByClassName('acc-explain-img')[3], 
                { borderWidth: '5px', border: 'solid darkred', duration: 0.5 }, '<');
            
            tl.to(nextButton, { autoAlpha: 1, duration: 0.5 });

        } else if (index == 1) {
            saveResult(client_id, 1);
            wrong_answer_current = 0;

            tl.from(".stagger-images-prec img", {
                opacity: 0,
                y: 20,
                stagger: 0.2,
                duration: 0.5,
                ease: "power2.out"
            });

            tl.from(".stagger-images-rec img", {
                opacity: 0,
                y: 20,
                stagger: 0.2,
                duration: 0.5,
                ease: "power2.out"
            }, '<');

            tl.from('.division-icons', { autoAlpha: 0 }, '<');

            for (let i = 0; i <= 6; i++) {
                if (i != 3) {
                    tl.to(explanationContainer.getElementsByClassName('prec-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #d73027', duration: 0.5 }, '<');
                } else {
                    tl.to(explanationContainer.getElementsByClassName('prec-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #fc8d59', duration: 0.5 }, '<');
                }
            }

            for (let i = 0; i <= 4; i++) {
                if (i != 2) {
                    tl.to(explanationContainer.getElementsByClassName('rec-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #d73027', duration: 0.5 }, '<');
                }
            }

            tl.to(nextButton, { autoAlpha: 1, duration: 0.5 });

        } else if (index == 2) {
            saveGame(1, client_id); // We finish the game in our DB
            saveResult(client_id, 2);
            wrong_answer_current = 0;

            tl.from(".f1mcc-explain1", { autoAlpha: 0, duration: 1.5 });
            tl.from(".f1mcc-explain2", { autoAlpha: 0, duration: 1.5 }, '>1');
            tl.from(".f1mcc-explain3", { autoAlpha: 0, duration: 1.5 }, '>1');

            tl.to(".f1mcc-explain1", { autoAlpha: 0, duration: 1 });
            tl.to(".f1mcc-explain2", { autoAlpha: 0, duration: 1 });
            tl.to(".f1mcc-explain3", { autoAlpha: 0, duration: 1 });

            tl.from(".f1mcc-explain4", { autoAlpha: 0, duration: 0.5 });

            tl.from(".stagger-images-f1mcc img", {
                opacity: 0,
                y: 20,
                stagger: 0.2,
                duration: 0.5,
                ease: "power2.out"
            }, '<');

            for (let i = 0; i <= 6; i++) {
                if (i <= 3) {
                    tl.to(explanationContainer.getElementsByClassName('f1mcc-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #7fbf7b', duration: 0.5 }, '<');
                } else if (i == 4) {
                    tl.to(explanationContainer.getElementsByClassName('f1mcc-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #fc8d59', duration: 0.5 }, '<');
                } else {
                    tl.to(explanationContainer.getElementsByClassName('f1mcc-explain-img')[i], 
                    { borderWidth: '5px', border: 'solid #d73027', duration: 0.5 }, '<');
                }
            }

            tl.from(".f1mcc-box", { autoAlpha: 0, duration: 0.5 });
            tl.from(".f1mcc-explain5", { autoAlpha: 0, duration: 0.5 });

            tl.to(".game-1-finished", { autoAlpha: 1, duration: 0.5 });
        }
    }

    /**
     * Populate the explanation container
     * @param {any} start_or_end - We understand if the user started the game, or finishing it; start is -1, finishing is 0, no mistakes finishing is 1
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
    */
    function saveGame(start_or_end, client_id) {
        let action_type = start_or_end === -1 ? -1 : (wrong_answers_total > 1 ? 0 : 1);

        util.postJSON(api_url_root + "add_game_record", {
            "action_type": action_type,
            "client_id": client_id
        });
    
        if (action_type !== -1) {  // Only post to game_achievement if action_type is not -1, hence if game is finished
            util.postJSON(api_url_root + "game_achievement", {
                "client_id": client_id,
                "action_type": action_type,
            });
        }
    }

    /**
     * Populate the explanation container
     * @param {string} client_id - The user's token: google client ID if signed in, or Google Analytics Guest token if not
     * @param {int} question_num - The question index of the specific game the user is playing to
    */
    function saveResult(client_id, question_num) {
        util.postJSON(api_url_root + "game_question", {
            "client_id": client_id,
            "question_num": question_num,
            "mistakes_num": wrong_answer_current,
        });
    }

    /**
     * Displays and animates the section with the question to either take the tutorial or not
    */
    function section0() {
        gsap.registerPlugin(ScrollTrigger);
        gsap.registerPlugin(Flip);

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section0",
                start: "top top",
                // end: "+=4000",
                toggleActions: "play none none reverse",
                // pin: true,
                // scrub: true,
                markers: true
            }
        });

        tl.to('#section0', { autoAlpha: 0 });
    }

    /**
     * Animates the section 1 of the page
    */
    function section1() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section1",
                start: "top top",
                end: "+=100%",
                toggleActions: "play none none reverse",
                pin: true,
                scrub: true,
                markers: true
            }
        });

        // Fades the scroll down away, and displays the timeline with the markers as you scroll-down
        tl.fromTo(".scroll-down", {autoAlpha: 1}, {autoAlpha: 0});
        tl.to("#time", {autoAlpha: 1}, "<");
        tl.fromTo("#timeline", {width: '0'}, {width: '100%', ease: 'linear'}, "<");
        document.querySelectorAll(".timeline-marker").forEach(marker => {
            let markerPos = marker.getBoundingClientRect().left / window.innerWidth;
            tl.from(marker, { autoAlpha: 0 }, markerPos / 2.2); // Trial and error, do not touch please, it messes up the markers
        });
    }

    /**
     * Animates the section 2 of the page
    */
    function section2() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section2",
                start: "top top",
                toggleActions: "play none none reverse",
                pin: true,
                markers: true
            }
        });

        // Makes the text appear in an animated fashion
        tl.from("#section2 h1, #section2 p", {yPercent: +100, opacity: 0, duration: 1});
        return tl;
    }

    /**
     * Animates the section 3 of the page
    */
    function section3() {
        var sectionWidth = document.getElementById('section3').clientWidth;

        const story = chartDemonstrationCreate();

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section3",
                start: "top top",
                end: "+=2500",
                toggleActions: "play none none reverse",
                pin: true,
                scrub: true,
                markers: true,
                onEnterBack: () => chartDemonstrationChange(story, 0),
                onUpdate: self => {
                    chartDemonstrationChange(story, self.progress);
                }
            }
        });

        // Switch the background color of the whole app's container
        tl.to("#app-container", { duration: 1, backgroundColor: '#ebfcff', ease: "none" }, 0);

        // Shows the texts and moves them a bit upwards
        tl.from("#section3 h1, #section3 p, #section3 metrics-example", {yPercent: +100, opacity: 0, duration: 1});

        // Depending on the width of the screen, we do the animation in different percentages
        tl.to(".change-text", { autoAlpha: 0 }, "+=1");
        if (sectionWidth > 880) {
            tl.to(".change-text2", { autoAlpha: 1, yPercent: -300 });
        } else {
            tl.to(".change-text2", { autoAlpha: 1, yPercent: -50 });
        }
    }

    /**
     * Animates the section 4 of the page
    */
    function section4() {
        var sectionHeight = document.getElementById('section4').clientHeight;
        var sectionWidth = document.getElementById('section4').clientWidth;

        // Create the patients inside the div container
        const container = document.querySelector('#people');
        createPatients(container);

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section4",
                start: "top top",
                end: "+=5500",
                scrub: true,
                toggleActions: "play none none reverse",
                pin: true,
                markers: true
            }
        });

        // Introduce the metrics explanation and load the icons in the background
        tl.to(".metrics-explain-intro", { autoAlpha: 1, y: sectionHeight/4, duration: 1 }, 0);
        tl.from(".metrics-explain-intro", { y: sectionHeight/4, duration: 1 }, ">2");

        // Make the doc-explain and make the intro disappear as well
        tl.from(".doc-explain", { autoAlpha: 0, duration: 1 }, ">");
        tl.to(".doc-explain", { y: -sectionHeight/6, duration: 1 }, ">2");
        tl.to(".metrics-explain-intro", { autoAlpha: 0, duration: 1 }, "<");

        // Hide the doc-explain2 and reveal the icons
        tl.to(".doc-explain2", { autoAlpha: 0, duration: 1 }, ">2")
        tl.to(container, { y: -sectionHeight/6, autoAlpha: 1, duration: 1, stagger: 0.1});

        // Color people red and give explanation as to what they are, make the scenario text disappear too. Push the rest a bit up
        for (let i = 0; i <= 3; i++) {
            if (i == 0) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)' }, '>2');
            } else {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)' });
            }
        }
        tl.to(container, { y: -sectionHeight/4, duration: 1 }, ">");
        tl.to(".doc-explain", { autoAlpha: 0, duration: 1 }, "<");
        tl.to(".step1", { y: -sectionHeight/6, opacity: 1, duration: 3 }, ">2");

        // Color the correct answers and the wrong ones, and explain accuracy (push the red explanation out)
        for (let i = 0; i <= 9; i++) {
            if ((i >= 8 && i <= 9) || i == 3) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(67%) sepia(81%) saturate(446%) hue-rotate(337deg) brightness(95%) contrast(98%)' });
            } else {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(66%) sepia(38%) saturate(379%) hue-rotate(69deg) brightness(96%) contrast(92%)' });
            }
        }

        tl.to(".step1", { autoAlpha: 0, duration: 1 });

        if (sectionWidth <= 380) {
            tl.to(".step2", { y: -sectionHeight/4, autoAlpha: 1, duration: 1 });
            tl.to(".step2", { autoAlpha: 0, duration: 1 }, ">2");
    
            tl.to(".step3", { y: -sectionHeight/2, autoAlpha: 1, duration: 1 }, "<1");
            tl.to(".step4", { y: -sectionHeight/2, duration: 1 });
            tl.to(".step4", { autoAlpha: 1, duration: 1 });
    
            // Fade out and close the section
            tl.to("#section4", { autoAlpha: 0, duration: 1 }, "<2");
        } else {
            tl.to(".step2", { y: -sectionHeight/6, autoAlpha: 1, duration: 1 });
            tl.to(".step2", { autoAlpha: 0, duration: 1 }, ">2");
    
            tl.to(".step3", { y: -sectionHeight/4, autoAlpha: 1, duration: 1 }, "<1");
            tl.to(".step4", { y: -sectionHeight/4, duration: 1 });
            tl.to(".step4", { autoAlpha: 1, duration: 1 });
    
            // Fade out and close the section
            tl.to("#section4", { autoAlpha: 0, duration: 1 }, "<2");
        }
    }

    /**
     * Animates the section 5 of the page
    */
    function section5() {
        // Generate the patients
        const container = document.querySelector('#people2');
        createPatients(container);

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section5",
                start: "top top",
                scrub: true,
                end: "+=2000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Reveal Section 5 and move initial accuracy intro in the background before showing it
        tl.to('.accuracy-not-working', { yPercent: 300 });
        tl.to("#section5", { opacity: 1, duration: 1 });

        // Move it a bit more upwards
        tl.to('.accuracy-not-working', { yPercent: 0 });

        // Display the patients' container
        tl.to(container, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.5});

        // Color them accordingly
        for (let i = 0; i <= 9; i++) {
            if (i >= 0 && i <= 1) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)', duration: 0.5 });
            }
        }

        // Make the initial explanation disappear, and move the people a bit more up
        tl.to(".accuracy-not-working", { autoAlpha: 0, duration: 0.5});
        tl.to(container, { yPercent: -50, duration: 0.5}, '<');

        // Move the explanation of why accuracy is misleading up, and then fade-in gradually
        tl.to(".steps-5", { yPercent: -40, duration: 1 });
        tl.to(".step1-5", { autoAlpha: 1, duration: 1 });
        tl.to(".step2-5", { autoAlpha: 1, duration: 1 });
        tl.to(".step3-5", { autoAlpha: 1, duration: 1 });
        tl.to(".step4-5", { autoAlpha: 1, duration: 1 });

        // Fade out and close the section
        tl.to("#section5", { autoAlpha: 0, duration: 1 }, "<2");

    }

    /**
     * Animates the section 6 of the page
    */
    function section6() {

        var sectionWidth = document.getElementById('section6').clientWidth;

        // Generate the patients in a line with the Strictness bar beneath them
        const container = document.querySelector('#people3');
        createUpdatePatientsLine(container);

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section6",
                start: "top top",
                scrub: true,
                end: "+=2000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Reveal Section 6, put the intro in the initial position before revealing
        tl.to('.precision-recall-intro', { yPercent: 100});
        tl.to("#section6", { opacity: 1, duration: 1 });

        // Make the intro disappear
        tl.to('.precision-recall-intro', { autoAlpha: 0 });

        // Show the patients
        tl.to(container, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.5});

        // Depending on the width of the devices, move the container with the patients up
        if (sectionWidth > 1136) {
            tl.to(container, {yPercent: -70});
        } else if (sectionWidth < 500 && sectionWidth >= 425) {
            tl.to(container, {yPercent: 0});
        } else {
            tl.to(container, {yPercent: -100});
        }

        // Color the patients accordingly
        for (let i = 0; i <= 9; i++) {
            if ((i == 1) || (i == 6) || (i == 8) || (i == 9)) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)', duration: 0.5 });
            }
        }

        // Show the Strictness slider and the border around the patients per Strictness selection
        tl.to(".slider", { autoAlpha: 1 });
        tl.to(".slider-desc", { autoAlpha: 1 }, "<");
        tl.to(".border-box", { autoAlpha: 1 });
        
        // Depending on the width of the devices, move the instructions to the interactions up if needed
        if (sectionWidth < 500 && sectionWidth >= 425) {
            tl.to(".explanation-containers", {yPercent: 0});
        } else {
            tl.to(".explanation-containers", { yPercent: -23 });
        }

        // Display the interactions' instructions
        tl.from(".card1", { autoAlpha: 0 });
        tl.from(".card2", { autoAlpha: 0 });

        // Fade out and close the section
        tl.to("#section6", { autoAlpha: 0, duration: 1 }, "<2");
    }

    /**
     * Animates the section 7 of the page
    */
    function section7() {
        f1Chalice();

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section7",
                start: "top top",
                scrub: true,
                end: "+=4000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Reveal Section 7, put the intro in the initial position before revealing
        tl.to("#section7", { autoAlpha: 1, duration: 1 });

        // Turn the scales a bit to the left, and reveal them
        tl.to(".scale-horizontal", {rotation: -15, duration: 1});
        tl.to(".scale-horizontal", {autoAlpha: 1, duration: 1});
        tl.to(".scale-base", {autoAlpha: 1, duration: 1}, '<');

        // Shows the first explanation
        tl.to(".card3", { autoAlpha: 1 });
        tl.to(".card3", { autoAlpha: 0 });

        // Rotate the scale on the other side and show second explanation
        tl.to(".scale-horizontal", {rotation: 15, duration: 1});
        tl.to(".card4", { autoAlpha: 1 });
        tl.to(".card4", { autoAlpha: 0 });

        // Show the F1 introduction and balance the scales
        tl.to(".f1-intro1", { autoAlpha: 1 });
        tl.to(".balance-scales", { autoAlpha: 1 });
        tl.to(".scale-horizontal", {rotation: 0, duration: 1}, ">-1");

        // Give the F1 answer make it disappear, and create the chalice of F1-score for interactive visualization, after pushing everything a bit upwards
        tl.to(".card5", { autoAlpha: 1 });
        tl.to(".card5", { autoAlpha: 0 });
        tl.to(".f1-score-display", { autoAlpha: 1 });
        tl.to(".f1-intro1", { autoAlpha: 0 });
        tl.to(".container-precision", { autoAlpha: 1 });
        tl.to(".container-recall", { autoAlpha: 1 }, "<");
        tl.to(".scales", { yPercent: -5 });

        // Reveal the instructions
        tl.to(".card6", { autoAlpha: 1 }, "<");

        // Fade out and close the section
        tl.to("#section7", { autoAlpha: 0, duration: 1 }, ">2");
    }

    /**
     * Animates the section 8 of the page
    */
    function section8() {
        var sectionWidth = document.getElementById('section8').clientWidth;

        // Generate the patients in a line
        const container = document.querySelector('#people4');
        createPatientsLinePlain(container);

        gsap.set("#people4 img", { autoAlpha: 0 });
    
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section8",
                start: "top top",
                scrub: true,
                end: "+=5000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });
    
        // Reveal the section, move the final MCC remarks a bit up in the background depending on the screen size
        tl.to("#section8", { autoAlpha: 1 });

        if (sectionWidth >= 1700) {
            tl.to(".mcc-intro-9", { yPercent: 50 });
            tl.to(".mcc-intro-10", { yPercent: 50 });
        }
        else if (sectionWidth >= 1136) {
            tl.to(".mcc-intro-9", { yPercent: -50 });
            tl.to(".mcc-intro-10", { yPercent: 0 });
        } else {
            tl.to(".mcc-intro-9", { yPercent: -200 });
            tl.to(".mcc-intro-10", { yPercent: -100 });
        }
        
        // Capture the initial state of our item
        const initialState = Flip.getState(".mcc-intro-1");

        // Do the changes
        document.querySelector(".mcc-intro-1").style.gridArea = "1 / 1 / 1 / 1";

        // Animate from the initial state to the new state using the FLIP technique - In this case move the item from grid 3/1 to 1/1
        tl.add(Flip.from(initialState));

        if (sectionWidth >= 1136) {
            tl.to("#people4", { yPercent: 50 });
            tl.to(".card-info-mcc-1", { yPercent: 50 });
        }

        // Display the patients using staggering
        tl.to("#people4 img", {
            autoAlpha: 1,
            duration: 0.5,
            stagger: {
                each: 0.1, // Stagger each image's appearance by 0.1 seconds
            }
        });

        // Display why F1-Score is not enough 
        tl.to(".card7", { autoAlpha: 1 });
        tl.from(".mcc-intro-2", { autoAlpha: 0 });
        tl.from(".mcc-intro-3", { autoAlpha: 0 });
        tl.from(".mcc-intro-4", { autoAlpha: 0 });
        tl.to(".mcc-intro-4", { autoAlpha: 0 }, '>2');
        tl.to(".mcc-intro-3", { autoAlpha: 0 });
        tl.to(".mcc-intro-2", { autoAlpha: 0 });

        // Introduce MCC 
        tl.to(".card8", { autoAlpha: 1 });
        tl.from(".mcc-intro-5", { autoAlpha: 0 });
        tl.from(".mcc-intro-6", { autoAlpha: 0 });
        tl.to(".mcc-intro-6", { autoAlpha: 0 }, '>2');
        tl.to(".mcc-intro-5", { autoAlpha: 0 });

        // Introduce scenario, color the patients
        tl.to(".card9", { autoAlpha: 1 });
        tl.from(".mcc-intro-7", { autoAlpha: 0 });
        for (let i = 0; i <= 7; i++) {
            tl.to(container.getElementsByClassName('img-fluid')[i], 
            { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)' });
        }

        // Tell the viewer how many the doctor has guessed right from the sick ones and color them green. Draw the border
        tl.from(".mcc-intro-8-1", { autoAlpha: 0 });
        for (let i = 0; i <= 5; i++) {
            tl.to(container.getElementsByClassName('img-fluid')[i], 
            { filter: 'brightness(0) saturate(100%) invert(66%) sepia(38%) saturate(379%) hue-rotate(69deg) brightness(96%) contrast(92%)' });
        }
        tl.to(".border-1", { autoAlpha: 1 });

        // Now explain how many they have diagnosed wrongly as sick, draw the border
        tl.from(".mcc-intro-8-2", { autoAlpha: 0 });
        for (let i = 8; i <= 9; i++) {
            tl.to(container.getElementsByClassName('img-fluid')[i], 
            { filter: 'brightness(0) saturate(100%) invert(67%) sepia(81%) saturate(446%) hue-rotate(337deg) brightness(95%) contrast(98%)' });
        }
        tl.to(".border-2", { autoAlpha: 1 });

        // And explain how many they have diagnosed wrongly as healthy
        tl.from(".mcc-intro-8-3", { autoAlpha: 0 }, '>2');
        for (let i = 6; i <= 8; i++) {
            tl.to(container.getElementsByClassName('img-fluid')[i], 
            { filter: 'brightness(0) saturate(100%) invert(67%) sepia(81%) saturate(446%) hue-rotate(337deg) brightness(95%) contrast(98%)' });
        }

        // Explain the colors and the border
        tl.from(".mcc-intro-8-4", { autoAlpha: 0 });

        // Fade out the explanation
        tl.to(".mcc-intro-8", { autoAlpha: 0 }, '>2');
        tl.to(".mcc-intro-7", { autoAlpha: 0 });

        // Fade in the scoreboard and the explanations
        tl.from(".card-info-mcc-1", { autoAlpha: 0 });
        tl.from(".mcc-intro-9", { autoAlpha: 0 });
        tl.from(".mcc-intro-10", { autoAlpha: 0 }, '>2');

        tl.to(".mcc-intro-10", { autoAlpha: 1 });
        tl.to(".mcc-intro-9", { autoAlpha: 1 });

        // Fade out and close the section
        tl.to("#section8", { autoAlpha: 0 }, ">2");
    }

    /**
     * Animates the section 9-1 of the page
    */
    function section9_1() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section9-1",
                start: "top top",
                scrub: true,
                end: "+=2000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Display the introduction
        tl.from(".smoke-recap-1", { autoAlpha: 0 });
        tl.from(".smoke-recap-2", { autoAlpha: 0 }, ">1");

        // Close the section
        tl.to("#section9-1", { autoAlpha: 0}, ">1");
        tl.to("#app-container", { backgroundColor: '#333' });
    }

    /**
     * Animates the section 9-2 of the page
    */
    function section9_2(client_id) {
        let gameData = localStorage.getItem('selectedLanguage') === 'gr' ? gameData_gr : gameData_en;

        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section9-2",
                start: "top top",
                scrub: true,
                end: "+=3000",
                toggleActions: "play none resume reverse",
                onEnter: loadGame(gameData, client_id),
                pin: true,
                markers: true
            }
        });


        // Make the section appear
        tl.from("#section9-2", { autoAlpha: 0 });

        tl.to('#section9-2', { autoAlpha: 0 });
        
        tl.to('#app-container', { backgroundColor: '#ebfcff' });
    }

    /**
     * Animates the section 10-1 of the page
    */
    function section10_1() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section10-1",
                start: "top top",
                scrub: true,
                end: "+=3000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Make the section appear
        tl.from("#section10-1", { autoAlpha: 0 });

        tl.from(".diagram-explain1", { autoAlpha: 0 });
        tl.from(".diagram-explain2", { autoAlpha: 0 }, '>1');

        tl.from(".circle1", { opacity: 0, yPercent: -5 });
        tl.from(".explanation1", { opacity: 0, yPercent: 5 });

        tl.from(".circle2", { opacity: 0, yPercent: -5 });
        tl.from(".explanation2", { opacity: 0, yPercent: 5 });

        tl.from(".circle3", { opacity: 0, yPercent: 5 });
        tl.from(".explanation3", { opacity: 0, yPercent: 5 });

        tl.from(".circle4", { opacity: 0, yPercent: 5 });
        tl.from(".explanation4", { opacity: 0, yPercent: 5 });


        tl.from(".diagram-explain3-1", { autoAlpha: 0 });
        tl.from(".diagram-explain3-2", { autoAlpha: 0 });

        // Close the section
        tl.to("#section10-1", { autoAlpha: 0 }, '>2');
    }

    /**
     * Animates the section 10-2 of the page
    */
    function section10_2() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section10-2",
                start: "top top",
                scrub: true,
                end: "+=3000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Make the section appear
        tl.from("#section10-2", { autoAlpha: 0 });

        const labels = ["01/05/2024", "08/05/2024", "17/05/2024", "22/05/2024", "30/05/2024"];
        const f1ExampleData = [0.8, 0.4, 0.3, 0.6, 0.2];
        const mccExampleData = [0.6, 0.1, 0.0, 0.2, 0.1];
        const highlightDate = "17/05/2024";
        const highlightIndex = labels.indexOf(highlightDate);

        createChart('scoreChart', labels, f1ExampleData, mccExampleData, highlightIndex)

        // Close the section and make it dark for the datepicker
        tl.to("#section10-2", { autoAlpha: 0 });
    }

    /**
     * Animates the section 11 of the page
    */
    async function section11() {
        try {
            const all_scores = await fetchModelScores();
                
            let tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "#section11",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: true,
                    toggleActions: "play none resume reverse",
                    markers: true
                }
            });
    
            flatpickr(".flatpickr", {
                enable: all_scores.labels,
                locale: localStorage.getItem('selectedLanguage'),
                onChange: function(selectedDates, dateStr) {
                    const selectedIndex = all_scores.labels.findIndex(d => d.toISOString().slice(0, 10) === dateStr);
                    if (selectedIndex !== -1) {
                        generateVisualization(all_scores, selectedIndex);
                    }
                }
            });
    
            const placeholder = window.i18n.t('select-date');
            document.querySelector('.flatpickr').placeholder = placeholder;
    
        } catch (error) {
            console.error('Failed to load scores:', error);
        }
    }   

    /**
     * Initiates all the sections should the user start the tutorial
    */
    function init(client_id) {
        $('#loading-overlay').css('display', 'flex'); // Show loading

        gsap.registerPlugin(ScrollTrigger);
        gsap.registerPlugin(Flip);

        section0() // Introduction Page - Can scroll to begin tutorial or skip to the final part
        section1(); // Introduction Tutorial
        section2(); // Introduction to Metrics
        section3(); // Explanation of Metrics
        section4(); // Accuracy
        section5(); // Why is Accuracy bad
        section6(); // Precision, Recall, what's the particularity
        section7(); // F1 Score - Why do we use it, what does it do, play with it
        section8(); // MCC - Why do we use it, introduce it
        section9_1(); // Introduction to our Metric Recap Game
        section9_2(client_id) // The Metric Recap Game
        section10_1(); // Introduction of the Graph Logic before the Final Quiz, Part 1/2
        section10_2(); // Introduction of the Graph Logic before the Final Quiz, Part 2/2
        section11(); // Show user the calendar to select date + Show F1-Score, MCC graph, Flow Chart with TP,FP,TN,FN, and textual comparison between other models + Context

    }

    // Grab the user ID and then init() due to the scope limitations
    let google_account_dialog = new edaplotjs.GoogleAccountDialog({
        no_ui: true
    });
    new edaplotjs.GoogleAnalyticsTracker({
        ready: function (ga_obj) {
            client_id = ga_obj.getClientId();
            google_account_dialog.silentSignInWithGoogle({
                success: function (is_signed_in, google_id_token) {
                    if(is_signed_in) {
                        client_id = 'google.'+jwt_decode(google_id_token).sub;
                    }
                }
            });
            if(!window.i18n.isInitialized) {
                window.i18n.on('initialized', init(client_id));
            } else {
                init(client_id);
            }
        }
    });

})();