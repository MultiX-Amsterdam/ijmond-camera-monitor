import { makeStory } from "https://cdn.jsdelivr.net/npm/plotteus";

(function(){
    "use strict";

    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();

    /**
     * Fetches the Model's scores necessary to populate the page.
    */
    function fetchModelScores() {
        fetch(`${api_url_root}/get_model_data`)
            .then(response => response.json())
            .then(data => {
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
                    labels.push(new Date(entry.date));
                    f1.push(entry.f1);
                    mcc.push(entry.mcc);
                    recall.push(entry.recall);
                    precision.push(entry.precision);
                    tp.push(entry.tp);
                    tn.push(entry.tn);
                    fn.push(entry.fn);
                    fp.push(entry.fp);
                });
                // --- CALL CREATE CHART HERE ---
            })
            .catch(error => console.error('Error fetching data:', error));
    } 

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
     * Animates the section 1 of the page (intro) and the timebar
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

        tl.to("#app-container", { duration: 1, backgroundColor: '#ebfcff', ease: "none" }, 0);
        tl.from("#section3 h1, #section3 p, #section3 metrics-example", {yPercent: +100, opacity: 0, duration: 1});
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

        // Reveal Section 5
        tl.to('.accuracy-not-working', { yPercent: 300 });
        tl.to("#section5", { opacity: 1, duration: 1 });

        tl.to('.accuracy-not-working', { yPercent: 0 });

        tl.to(container, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.5});

        for (let i = 0; i <= 9; i++) {
            if (i >= 0 && i <= 1) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)', duration: 0.5 });
            }
        }

        tl.to(".accuracy-not-working", { autoAlpha: 0, duration: 0.5});
        tl.to(container, { yPercent: -50, duration: 0.5}, '<');

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

        // Generate the patients
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

        tl.to('.precision-recall-intro', { autoAlpha: 0 });

        tl.to(container, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.5});

        tl.to(container, {yPercent: -50});

        for (let i = 0; i <= 9; i++) {
            if ((i == 1) || (i == 6) || (i == 8) || (i == 9)) {
                tl.to(container.getElementsByClassName('img-fluid')[i], 
                { filter: 'brightness(0) saturate(100%) invert(19%) sepia(92%) saturate(2914%) hue-rotate(351deg) brightness(95%) contrast(85%)', duration: 0.5 });
            }
        }

        tl.to(".slider", { autoAlpha: 1 });
        tl.to(".slider-desc", { autoAlpha: 1 }, "<");
        tl.to(".border-box", { autoAlpha: 1 });
        
        tl.to(".explanation-containers", { yPercent: -20 });

        tl.from(".card1", { autoAlpha: 0 });
        tl.from(".card2", { autoAlpha: 0 });

        // Fade out and close the section
        tl.to("#section6", { autoAlpha: 0, duration: 1 }, "<2");
    }

    function section7() {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#section7",
                start: "top top",
                scrub: true,
                end: "+=1000",
                toggleActions: "play none resume reverse",
                pin: true,
                markers: true
            }
        });

        // Reveal Section 7, put the intro in the initial position before revealing
        tl.to('.precision-recall-intro', { yPercent: 100});
        tl.to("#section7", { opacity: 1, duration: 1 });
    }

    function init() {
        $('#loading-overlay').css('display', 'flex'); // Show loading

        fetchModelScores();
        gsap.registerPlugin(ScrollTrigger);
        gsap.registerPlugin(TextPlugin);

        section1(); // Introduction page
        section2(); // Introduction to Metrics
        section3(); // Explanation of Metrics
        section4(); // Accuracy
        section5(); // Why is Accuracy bad
        section6(); // Precision, Recall, what's the particularity
        section7(); // F1 Score - Why do we use it

        $('#loading-overlay').hide(); // Hide the loading


        //section8(); // MCC - Why do we use it
        //section9(); // Small Recap of the used metrics; this time using our smoke scenario
        //section10(); // Tutorial over metrics
        //section11(); // Tutorial over graphs
        //section12(); // Show user the calendar to select date
        //section13(); // Show F1-Score, MCC graph, Flow Chart with TP,FP,TN,FN, and textual comparison between other models + Context
    }
    
    if(!window.i18n.isInitialized) {
        window.i18n.on('initialized', init);
    } else {
        init();
    }

})();