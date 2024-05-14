export const gameData_gr = [
    {
        "question": `<h2>Ποια μετρική επικεντρώνεται στον αριθμό των σωστών 'μαντεψιών' σε σχέση με τον συνολικό αριθμό; (Υπόδειξη: Η μετρική μπορεί να σας ξεγελάσει)</h2>`,
        "answers": [
            { text: "Precision", correct: false },
            { text: "Accuracy", correct: true },
            { text: "Recall", correct: false },
            { text: "F1-Score", correct: false }
        ],
        "explanation": `
            <h3 class='acc-explain1'><span class='green-text'>Σωστά!</span> Το Accuracy επικεντρώνεται στο να δούμε πόσες από τις περιπτώσεις βρήκαμε σωστά. Στο σενάριο ανίχνευσης καπνού, το Accuracy επικεντρώνεται στο να δούμε πόσα <span class="custom-text-info-dark-theme">σωστά περιστατικά καπνού</span> είχαμε σε σχέση με το σύνολο</h3>
            <div class="stagger-images-acc">
                <img class='acc-explain-img' src="../img/smoke/smoke1.png">
                <img class='acc-explain-img' src="../img/smoke/smoke2.png">
                <img class='acc-explain-img' src="../img/smoke/smoke3.png">
                <img class='acc-explain-img' src="../img/no-smoke/nosmoke6.png">
            </div>
            <h4 class='acc-explain2'>Μπορεί να είναι παραπλανητική, γιατί όπως είδαμε μπορεί να υπάρχουν περιπτώσεις όπου το accuracy <span class='red-text'>αποτυγχάνει</span> να αποτυπώσει την απόδοση.</h4>
            <h4 class='acc-explain3'>Ένα καλό παράδειγμα είναι όταν ένα μοντέλο προβλέπει τυχαία ότι έχουμε καπνό όλη την ώρα, και μια μέρα αυτό συμβαίνει πραγματικά. Σε αυτή την περίπτωση, για παράδειγμα, το accuracy θα ήταν πολύ υψηλή. Το μοντέλο έχει κάνει μόνο <span class='red-text'>ένα λάθος</span>, όπως φαίνεται από το περίγραμμα, αλλά γνωρίζουμε ότι δεν είναι καλό καθώς προβλέπει μόνο ότι έχουμε καπνό στα βίντεο.</h4>
        `
    },

    {
        "question": `<h2>Έχουμε ένα ασυνήθιστο δίδυμο μετρήσεων που συνεχώς προσπαθούν να βρουν ισορροπία μεταξύ: 1) της εύρεσης όλων των περιπτώσεων αυτού που θέλουμε και 2) της διασφάλισης ότι αυτό που βρίσκουμε είναι κυρίως σωστό. Ποιες είναι αυτές;</h2>`,
        "answers": [
            { text: "Precision και Recall", correct: true },
            { text: "Accuracy και Precision", correct: false },
            { text: "MCC και F1-Score", correct: false },
            { text: "F1-Score και Recall", correct: false }
        ],
        "explanation": `
            <h3 class='precrec-explain1'><span class='green-text'>Σωστά!</span> Στο σενάριο ανίχνευσης καπνού, η εύρεση ισορροπίας μεταξύ <span class="custom-text-info-dark-theme">Precision</span> και <span class="custom-text-info-dark-theme">Recall</span> είναι εξαιρετικά σημαντική</h3>
            <h4 class='precrec-explain2'><span class="custom-text-info-dark-theme">Το Precision</span> για το μοντέλο μας αφορά τον αριθμό των σωστών προβλέψεων καπνού στα βίντεο από όλες τις προβλέψεις καπνού: σωστές ή όχι. Το <span class='red-text'>κόκκινο περίγραμμα</span> σηματοδοτεί τις σωστές και το <span class='orange-text'>πορτοκαλί</span> τις λανθασμένες προβλέψεις</h4>
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

            <h4 class='precrec-explain3'><span class="custom-text-info-dark-theme">Το Recall</span> από την άλλη αφορά τον αριθμό των ανιχνεύσεων καπνού που υπάρχουν και που πραγματικά βρήκαμε. Το <span class='red-text'>κόκκινο περίγραμμα</span> σηματοδοτεί τις περιπτώσεις που το μοντέλο αναγνώρισε</h4>
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
        "question": `<h2>Συμπληρώστε τα κενά: _ είναι η μετρική που χρησιμοποιούμε που συνδυάζει το Precision και το Recall. _ είναι η δεύτερη μετρική που χρησιμοποιείται για να συμπληρώσει τις επιδράσεις της πρώτης.</h2>`,
        "answers": [
            { text: "Precision, Accuracy", correct: false },
            { text: "Accuracy, MCC", correct: false },
            { text: "F1-Score, Recall", correct: false },
            { text: "F1-Score, MCC", correct: true }
        ],
        "explanation": `
            <h3 class='f1mcc-explain1'><span class='green-text'>Σωστά!</span> Το F1-Score είναι η μετρική που χρησιμοποιείται για να ισορροπήσει τις επιδράσεις μεταξύ <span class="custom-text-info-dark-theme">Precision</span> και <span class="custom-text-info-dark-theme">Recall</span>.</h3>
            <h4 class='f1mcc-explain2'>Το <span class="custom-text-info-dark-theme">F1-Score</span> μπορεί να χρησιμοποιηθεί για να μετρήσει την απόδοση του μοντέλου μας. Όσο <span class="custom-text-info-dark-theme">υψηλότερο</span> το σκόρ, τόσο <span class="custom-text-info-dark-theme">υψηλότερη</span> η απόδοση του μοντέλου.</h4>

            <h4 class='f1mcc-explain3'>Πρέπει, ωστόσο, να είμαστε <span class='red-text'>προσεκτικοί</span> στην παραπάνω δήλωση, καθώς το F1-Score για την περίπτωση του μοντέλου μας <span class='red-text'>δεν</span> λαμβάνει υπόψη την απόδοση του μοντέλου στην σωστή ανίχνευση βίντεο χωρίς καπνό.</h4>

            <div class='mccf1-up'>
                <h4 class='f1mcc-explain4'><span class="custom-text-info-dark-theme">Το MCC</span> λύνει αυτό το πρόβλημα και γι'αυτο το λαμβάνουμε υπόψιν, καθώς για να είναι υψηλό, το μοντέλο πρέπει να επιδείξει καλή απόδοση στην ανίχνευση <span class="custom-text-info-dark-theme">και</span> σωστών και λανθασμένων βίντεο καπνού. Οποιαδήποτε σφάλματα μπορούν να μειώσουν το MCC. Για να το αποδείξουμε αυτό, θα υιοθετήσουμε το παράδειγμα του γιατρού αλλά αυτή τη φορά χρησιμοποιώντας το σενάριο του μοντέλου τοξικών εκπομπών.</h4>

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
                    <h4><span class="green-text">Σωστά με Καπνό</span>: 4</h4>
                    <h4><span class="orange-text">Λανθασμένα με Καπνό</span>: 1</h4>
                    <h4><span class="green-text">Σωστά Χωρίς Καπνό</span>: 0</h4>
                    <h4><span class="red-text">Λανθασμένα Χωρίς Καπνό</span>: 2</h4>

                    <h4><span class="custom-text-info-dark-theme">F1-Score</span>: 0.72</h4>
                    <h4><span class="custom-text-info-dark-theme">MCC</span>: -0.25</h4>
                </div>

                <h4 class='f1mcc-explain5'>Όπως βλέπουμε, το F1-Score του μοντέλου είναι εξαιρετικό καθώς μπορεί να προβλέψει καλά τον καπνό. Ωστόσο, το MCC υποδηλώνει ότι αυτό το μοντέλο δεν είναι αξιόπιστο, καθώς είναι κακό στην πρόβλεψη περιστάσεων χωρίς καπνό.</h4>
            </div>
        `
    }
];
