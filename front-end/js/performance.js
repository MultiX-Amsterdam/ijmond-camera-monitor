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
                const f1 = [];
                const accuracy = []; 
                const precision = [];
                const recall = [];
                const specificity = [];
                const mcc = [];

                data.model_data.forEach(entry => {
                    labels.push(new Date(entry.date));
                    f1.push(entry.f1);
                    accuracy.push(entry.accuracy);
                    precision.push(entry.precision);
                    recall.push(entry.recall);
                    specificity.push(entry.specificity);
                    mcc.push(entry.mcc);
                });

                createChart(labels,f1,accuracy,precision,recall,specificity,mcc)
            })
            .catch(error => console.error('Error fetching data:', error));
    }


    /**
     * Creates the chart with X axis being the last 7 entries in the DB records of the model scores, and Y being scores of different metrics
     * Points in the chart are clickable and create a modal popup with score explanations
     * @param {list} labels - Contains the different dates of the model
     * @param {list} f1 - Contains the f1 scores of the model
     * @param {list} accuracy - Contains the accuracy scores of the model
     * @param {list} precision - Contains the precision scores of the model
     * @param {list} recall - Contains the recall scores of the model
     * @param {list} specificity - Contains the specificity scores of the model
    */
    function createChart(labels,f1,accuracy,precision,recall,specificity,mcc) {
        const ctx = document.getElementById('metricsChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
    
            // Settings
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'F1-Score',
                        backgroundColor: 'rgb(255, 99, 132)',
                        borderColor: 'rgb(255, 99, 132)',
                        data: f1,
                        fill: false,
                    }, {
                        label: 'MCC',
                        backgroundColor: 'rgb(54, 162, 235)',
                        borderColor: 'rgb(54, 162, 235)',
                        data: mcc,
                        fill: false,
                    }, {
                        label: 'Accuracy',
                        backgroundColor: 'rgb(252, 157, 3)',
                        borderColor: 'rgb(252, 157, 3)',
                        data: accuracy,
                        fill: false,
                    }, {
                        label: 'Precision',
                        backgroundColor: 'rgb(3, 252, 94)',
                        borderColor: 'rgb(3, 252, 94)',
                        data: precision,
                        fill: false,
                    }, {
                        label: 'Recall',
                        backgroundColor: 'rgb(252, 235, 3)',
                        borderColor: 'rgb(252, 235, 3)',
                        data: recall,
                        fill: false,
                    }, {
                        label: 'Specificity',
                        backgroundColor: 'rgb(177, 3, 252)',
                        borderColor: 'rgb(177, 3, 252)',
                        data: specificity,
                        fill: false,
                    }
                ]
            },
    
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        bounds: 'ticks',
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'DD', 
                        },
                        ticks: {
                            color: 'white',
                        }
                    },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: 'white'
                    }
                  }
                },

                onClick: (e) => {
                    const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    
                    if (points.length) {
                        const xIndex = points[0].index;
                        const label = chart.data.labels[xIndex];
                        const values = chart.data.datasets.map(dataset => {
                            return { label: dataset.label, value: dataset.data[xIndex] };
                        });

                        explanationModal(label, values)

                    }
                }
            }
        });
    }

    function explanationModal(label, values) {

        const date = luxon.DateTime.fromJSDate(label);
        const formattedLabel = date.toFormat('DD');

        let modalHTML = `
            <div class="modal fade" id="explanationModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${formattedLabel}</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${values.map(value => `<p>${value.label}: ${value.value}</p>`).join('')}
                        </div>
                    </div>
                </div>
            </div>`;

        $('#explanationModal').remove();
    
        $('body').append(modalHTML);

        $('#explanationModal').modal('show');

        $('#explanationModal').on('hidden.bs.modal', function () {
            $(this).remove();
        });
    }    

    // Fetch of user data
    function init() {
        fetchModelScores();
    }
    
    init();

})();