"""Functions regarding the performance explanation section."""

from models.model import ModelScores

def get_all_model_data():
    """Get all the model's performance data"""
    model_scores = ModelScores.query.order_by(ModelScores.date.desc()).all()

    model_score_data = [
        {
            'date': model_score.date.strftime('%Y-%m-%d'),
            'f1': model_score.f1,
            'mcc': model_score.mcc,
            'accuracy': model_score.accuracy,
            'precision': model_score.precision,
            'recall': model_score.recall,
            'specificity': model_score.specificity,
        }
        for model_score in model_scores
    ]

    return model_score_data