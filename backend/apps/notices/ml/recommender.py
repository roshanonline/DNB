"""
Recommendation Engine – Matrix Factorization (TruncatedSVD via scikit-learn)
=============================================================================
Algorithm : Truncated SVD (Singular Value Decomposition) from scikit-learn
            Equivalent to classic Matrix Factorization / collaborative filtering.
            Uses scikit-learn (already installed) — no Cython compilation needed,
            fully compatible with NumPy 2.x.
Where used: GET /api/notices/recommended/   ->  "Recommended for You" section

How it works
------------
1. Build a User x Notice rating matrix from real engagement data:
     view      -> rating 2.0
     bookmark  -> rating 4.0  (strong interest signal)
     save      -> rating 3.5
     download  -> rating 3.0
     share     -> rating 3.5
2. TruncatedSVD decomposes R (n_users x n_notices) into latent factors:
     R ~ U (n_users x k) @ Vt (k x n_notices)
   - k = N_FACTORS latent dimensions encode hidden preferences
3. Predicted rating matrix: R_pred = U @ Vt (same shape as R)
4. For a given student, take their row of R_pred, rank unread notices
   by predicted score -> "Recommended for You"

Workflow example
----------------
Student clicked:  Placement notice, Workshop notice, AI event
SVD learns:       student latent vector encodes [career:high, tech:high]
New notice:       "Google Campus Recruitment Drive"  (placement-like)
Prediction:       high score ->  shown first in recommendations
"""

import os
import pickle
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings("ignore")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "svd_model.pkl")

# Minimum interactions required before we train (cold-start guard)
MIN_INTERACTIONS = 5

# Number of latent factors for TruncatedSVD
N_FACTORS = 20

# Map engagement action -> implicit rating on 1-5 scale
ACTION_RATINGS = {
    "view":     2.0,
    "bookmark": 4.0,
    "save":     3.5,
    "download": 3.0,
    "share":    3.5,
}


# ── Build ratings DataFrame ─────────────────────────────────────────────

def _build_ratings_df():
    """
    Aggregate engagement signals into a user/notice rating DataFrame.
    Returns None if not enough data exists.
    """
    try:
        from apps.notices.models import EngagementLog, Bookmark, SavedNotice

        rows = []

        for log in EngagementLog.objects.select_related("user", "notice").all():
            if log.viewed:
                rows.append({
                    "user_id":   log.user_id,
                    "notice_id": log.notice_id,
                    "rating":    ACTION_RATINGS["view"],
                })
            if log.downloaded:
                rows.append({
                    "user_id":   log.user_id,
                    "notice_id": log.notice_id,
                    "rating":    ACTION_RATINGS["download"],
                })
            if log.shared:
                rows.append({
                    "user_id":   log.user_id,
                    "notice_id": log.notice_id,
                    "rating":    ACTION_RATINGS["share"],
                })

        for bm in Bookmark.objects.select_related("user", "notice").all():
            rows.append({
                "user_id":   bm.user_id,
                "notice_id": bm.notice_id,
                "rating":    ACTION_RATINGS["bookmark"],
            })

        for sv in SavedNotice.objects.select_related("user", "notice").all():
            rows.append({
                "user_id":   sv.user_id,
                "notice_id": sv.notice_id,
                "rating":    ACTION_RATINGS["save"],
            })

        if len(rows) < MIN_INTERACTIONS:
            return None

        import pandas as pd
        df = pd.DataFrame(rows)
        # Average ratings per (user, notice) pair
        df = df.groupby(["user_id", "notice_id"])["rating"].mean().reset_index()
        return df

    except Exception as e:
        print(f"[SVD] Error building ratings: {e}")
        return None


# ── Train ───────────────────────────────────────────────────────────────

def train_recommender():
    """
    Train SVD Matrix Factorization model from current engagement data
    using sklearn TruncatedSVD. Persists model to disk.
    Returns model dict or None if not enough data.
    """
    df = _build_ratings_df()

    if df is None:
        print(f"[SVD] Need >={MIN_INTERACTIONS} interactions to train. Skipping.")
        return None

    try:
        from sklearn.decomposition import TruncatedSVD

        # Build integer indices
        user_ids   = sorted(df["user_id"].unique())
        notice_ids = sorted(df["notice_id"].unique())
        user_idx   = {uid: i for i, uid in enumerate(user_ids)}
        notice_idx = {nid: i for i, nid in enumerate(notice_ids)}

        n_users   = len(user_ids)
        n_notices = len(notice_ids)

        # Build User x Notice rating matrix (sparse fill with 0 = no interaction)
        R = np.zeros((n_users, n_notices), dtype=np.float32)
        for _, row in df.iterrows():
            ui = user_idx[row["user_id"]]
            ni = notice_idx[row["notice_id"]]
            R[ui, ni] = row["rating"]

        # TruncatedSVD: R ~ U @ Vt
        n_components = min(N_FACTORS, n_users - 1, n_notices - 1)
        if n_components < 1:
            print("[SVD] Not enough users/notices for SVD training.")
            return None

        svd = TruncatedSVD(n_components=n_components, random_state=42)
        U   = svd.fit_transform(R)        # shape: (n_users, k)
        Vt  = svd.components_             # shape: (k, n_notices)
        R_pred = U @ Vt                   # shape: (n_users, n_notices)

        model_data = {
            "R_pred":     R_pred,
            "user_idx":   user_idx,
            "notice_idx": notice_idx,
            "trained_at": datetime.now(),
        }

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(model_data, f)

        print(f"[SVD] Trained on {len(df)} ratings ({n_users} users, {n_notices} notices). Saved to {MODEL_PATH}")
        return model_data

    except Exception as e:
        print(f"[SVD] Training error: {e}")
        return None


# ── Cold-start fallback ─────────────────────────────────────────────────

def _cold_start(student, notices, top_k: int):
    """
    Department + category heuristic for students with no history.
    Used when SVD model doesn't exist yet or student is new.
    """
    dept = getattr(student, "department", None) or ""
    category_pref = {
        "Exam": 1.0, "Placement": 0.95, "Scholarship": 0.90,
        "Academic": 0.80, "Workshop": 0.70, "Event": 0.60,
        "General": 0.40, "Holiday": 0.30,
    }
    priority_bonus = {"URGENT": 0.20, "HIGH": 0.15, "MEDIUM": 0.10, "LOW": 0.05}

    scored = []
    for n in notices:
        score  = category_pref.get(n.category, 0.5)
        score += 0.25 if n.department == dept else 0.0
        score += priority_bonus.get(n.priority, 0.05)
        scored.append((n, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    for notice, score in scored[:top_k]:
        notice.recommendation_score = round(min(score, 1.0), 3)
    return [n for n, _ in scored[:top_k]]


# ── Public API ─────────────────────────────────────────────────────────

def get_recommendations(student, notices, top_k: int = 10):
    """
    Get personalised notice recommendations for a student using TruncatedSVD.

    Parameters
    ----------
    student : User object (must have .id attribute)
    notices : list / queryset of approved Notice objects
    top_k   : number of recommendations to return

    Returns
    -------
    List of Notice objects sorted by predicted interest (highest first).
    Each notice has .recommendation_score (0.0 - 1.0) attached.

    Falls back to cold-start heuristic if:
      - No SVD model exists yet  (not enough engagement data)
      - Student has no prior history  (new user)
    """
    notices = list(notices)

    if not os.path.exists(MODEL_PATH):
        return _cold_start(student, notices, top_k)

    try:
        with open(MODEL_PATH, "rb") as f:
            saved = pickle.load(f)
        R_pred     = saved["R_pred"]
        user_idx   = saved["user_idx"]
        notice_idx = saved["notice_idx"]
    except Exception:
        return _cold_start(student, notices, top_k)

    # If student has no history in training data, use cold-start
    if student.id not in user_idx:
        return _cold_start(student, notices, top_k)

    # Exclude already-read notices
    try:
        from apps.notices.models import EngagementLog
        read_ids = set(
            EngagementLog.objects.filter(user=student, viewed=True)
            .values_list("notice_id", flat=True)
        )
    except Exception:
        read_ids = set()

    unread = [n for n in notices if n.id not in read_ids]
    if not unread:
        unread = notices  # if all read, still recommend

    # Score using TruncatedSVD predicted rating matrix
    u_row  = user_idx[student.id]
    scored = []
    for notice in unread:
        if notice.id in notice_idx:
            n_col = notice_idx[notice.id]
            raw_score = float(R_pred[u_row, n_col])
        else:
            raw_score = 0.0  # unseen notice: neutral
        scored.append((notice, raw_score))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Normalise scores to 0-1 range
    if scored:
        max_s = max(s for _, s in scored) or 1.0
        min_s = min(s for _, s in scored)
        span  = max_s - min_s if max_s != min_s else 1.0
        for notice, score in scored[:top_k]:
            notice.recommendation_score = round((score - min_s) / span, 3)

    return [n for n, _ in scored[:top_k]]

