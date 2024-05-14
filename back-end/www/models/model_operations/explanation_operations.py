"""Functions regarding the performance explanation section."""

from models.model import db
from models.model import ModelScores
from datetime import datetime, timezone

def get_all_model_data():
    """Get all the model's performance data"""
    model_scores = ModelScores.query.order_by(ModelScores.date.desc()).all()

    model_score_data = [
        {
            'date': model_score.date.strftime('%Y-%m-%d'),
            'f1': model_score.f1,
            'mcc': model_score.mcc,
            'precision': model_score.precision,
            'recall': model_score.recall,
            'tp': model_score.tp,
            'fp': model_score.fp,
            'fn': model_score.fn,
            'tn': model_score.tn,
        }
        for model_score in model_scores
    ]

    return model_score_data

def insert_model_data(f1, mcc, precision, recall, tp, tn, fp, fn):
    """Insert model's performance data after retraining"""
    today = datetime.now(timezone.utc).date()
    model_score = ModelScores(f1=f1, mcc=mcc, precision=precision, recall=recall, tp=tp, tn=tn, fp=fp, fn=fn, date=today)
    db.session.add(model_score)
    db.session.commit()
