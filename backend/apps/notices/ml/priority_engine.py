"""
ML Ranking Engine – Weighted Priority Score Formula
====================================================
Algorithm : Interpretable Weighted Sum (Year-aware + Personalization-focused)
Where used: Student Dashboard  →  sorts all approved notices by calculated priority score
Input features :
  - year_importance        (0–1)   relevance of notice for student's academic year
  - student_preference_score (0–1) based on student's profile interest preferences
  - days_left              (0–1)   normalised urgency of deadline
  - admin_priority         (0–1)   LOW=0.25, MEDIUM=0.50, HIGH=0.75, URGENT=1.0
  - dept_match             (0–1)   1 if same dept, 0.3 if related, 0 if not
  - category_weight        (0–1)   category importance (Exam=1.0 … General=0.30)
  - engagement_score       (0–1)   view_count normalised (min(views/500, 1.0))
Output : priority_score  (float 0.0–1.0)

Final Priority Formula (Personalization-First Approach)
-------------------------------------------------------
Priority Score = (0.50 × Year Importance)
               + (0.30 × Student Preference)
               + (0.08 × Deadline Urgency)
               + (0.05 × Admin Priority)
               + (0.04 × Department Match)
               + (0.02 × Category Weight)
               + (0.01 × Engagement Score)
Total Weight = 1.00

This formula prioritizes:
  1. Year Relevance (50%)      - Notice must match student's academic year
  2. Student Interests (30%)   - Student's profile preferences matter most
  3. Deadline Urgency (8%)     - How soon is it due
  4. Admin Importance (5%)     - Admin-set priority level
  5. Department Match (4%)     - Same department bonus
  6. Category Weight (2%)      - Category importance
  7. Popularity (1%)           - View engagement

Workflow
--------
notices (DB) → build feature matrix → apply weighted formula → sort descending → display
"""

from datetime import date
import warnings
warnings.filterwarnings("ignore")

# ── Constants ──────────────────────────────────────────────────────────
CATEGORY_WEIGHTS = {
    "Exam":        1.00,
    "Placement":   0.95,
    "Scholarship": 0.90,
    "Internship":  0.88,
    "Academic":    0.85,
    "Workshop":    0.80,
    "Event":       0.60,
    "Holiday":     0.50,
    "General":     0.30,
}

# Maps Notice.category → NotificationPrefs field name
CATEGORY_TO_PREF = {
    "Exam":        "exam",
    "Event":       "event",
    "Academic":    "academic",
    "Holiday":     "holiday",
    "Placement":   "placement",
    "Scholarship": "scholarship",
    "Internship":  "internship",
    "Workshop":    "workshop",
}

# Enhanced Priority Mapping - gives better distinction between levels
PRIORITY_MAP = {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75, "URGENT": 1.0}  # Direct 0-1 scale for better LightBGM handling


# ── Feature builder ────────────────────────────────────────────────────

def _days_urgency(deadline) -> float:
    """
    Convert deadline date → urgency float 0–1.
    
    Scoring ranges:
    - 1.0  = today or tomorrow (CRITICAL)
    - 0.8  = 1–2 days
    - 0.6  = 3–5 days
    - 0.4  = 6–10 days
    - 0.2  = 11+ days
    - 0.05 = expired (past deadline)
    """
    if deadline is None:
        return 0.2  # no deadline = low urgency
    
    days = (deadline - date.today()).days
    
    if days <= 0:
        return 0.05   # expired
    if days == 1:
        return 1.0    # tomorrow = critical
    if days <= 2:
        return 0.8    # within 2 days
    if days <= 5:
        return 0.6    # within 5 days
    if days <= 10:
        return 0.4    # within 10 days
    
    return 0.2  # 11+ days


def _year_importance(notice_target_year: str, student_year: str) -> float:
    """
    Year Importance (Most Weighted at 0.50) — how relevant the notice is for this student.
    
    Scoring:
    - 1.0 if notice.target_year == student_year (directly targeted) ★ HIGHEST
    - 0.7 if notice is partially relevant
    - 0.5 if notice.target_year == 'ALL' (broadly relevant)
    - 0.1 if notice targets a different year (low relevance)
    - 0.5 if student_year unknown (neutral)
    """
    ty = (notice_target_year or 'ALL').strip().upper()
    sy = (student_year or '').strip().upper()
    
    # Direct year match
    if ty != 'ALL' and sy and ty == sy:
        return 1.0  # HIGHEST priority
    
    # Year explicitly all
    if ty == 'ALL':
        return 0.5  # medium relevance for "all years" notices
    
    # Student year unknown
    if not sy:
        return 0.5  # neutral without student info
    
    # Different year - low relevance
    return 0.1


def _student_preference_score(category: str, student_prefs: dict) -> float:
    """
    Student Preference Score (Second Weighted at 0.30) — based on student's profile interests.

    Scoring:
    - 1.0 if student enabled this category in their preferences ★ HIGH
    - 0.7 if neutral/no preference information
    - 0.15 if student explicitly disabled this category (low relevance)
    - General notices always get 0.7 (neutral-positive)
    """
    if not student_prefs:
        return 0.7  # neutral without preferences
    
    if category == 'General':
        return 0.7  # general notices always neutral-positive
    
    pref_key = CATEGORY_TO_PREF.get(category)
    if pref_key is None:
        return 0.7  # unknown category = neutral
    
    # Student enabled this category preference
    if student_prefs.get(pref_key, True):
        return 1.0
    
    # Student disabled this category
    return 0.15


def _build_features(
    notice,
    student_dept: str,
    student_year: str = '',
    student_prefs: dict = None,
) -> dict:
    dept_match = 1 if (
        notice.department and
        notice.department.lower() == student_dept.lower()
    ) else 0

    days_left = _days_urgency(notice.deadline)

    # Admin priority is now directly on 0-1 scale from PRIORITY_MAP
    prio_raw = PRIORITY_MAP.get(str(notice.priority).upper(), 0.5)  # default to MEDIUM if unknown
    admin_priority = prio_raw  # already 0-1 scale

    view_count = getattr(notice, "view_count", 0) or 0
    engagement_score = min(view_count / 500.0, 1.0)

    category_weight = CATEGORY_WEIGHTS.get(notice.category, 0.50)

    notice_target_year = getattr(notice, 'target_year', 'ALL') or 'ALL'
    year_imp = _year_importance(notice_target_year, student_year)

    pref_score = _student_preference_score(notice.category, student_prefs)

    return {
        "dept_match":              dept_match,
        "days_left":               days_left,
        "admin_priority":          admin_priority,
        "engagement_score":        engagement_score,
        "category_weight":         category_weight,
        "year_importance":         year_imp,
        "student_preference_score": pref_score,
    }


# ── Public API ─────────────────────────────────────────────────────────

def compute_priority_score(
    notice,
    student_dept: str = "CSE",
    student_year: str = '',
    student_prefs: dict = None,
) -> float:
    """
    Compute priority score for a single notice using weighted formula.
    Called on notice create / update to persist score in DB.
    Returns float 0.0–1.0.
    
    Formula:
    Priority Score = (0.50 × year_importance)
                   + (0.30 × student_preference_score)
                   + (0.08 × days_left)
                   + (0.05 × admin_priority)
                   + (0.04 × dept_match)
                   + (0.02 × category_weight)
                   + (0.01 × engagement_score)
    """
    try:
        feats = _build_features(notice, student_dept, student_year, student_prefs)
        score = (
            feats["year_importance"]          * 0.50 +
            feats["student_preference_score"] * 0.30 +
            feats["days_left"]                * 0.08 +
            feats["admin_priority"]           * 0.05 +
            feats["dept_match"]               * 0.04 +
            feats["category_weight"]          * 0.02 +
            feats["engagement_score"]         * 0.01
        )
        return round(min(max(score, 0.0), 1.0), 4)
    except Exception:
        # Fallback to neutral score if any calculation fails
        return 0.50


def rank_notices(
    notices,
    student_dept: str = "CSE",
    student_year: str = '',
    student_prefs: dict = None,
):
    """
    Batch-rank a list of Notice objects for a student using weighted formula.
    Attaches notice.priority_score and returns sorted list (highest first).

    Used in: StudentDashboardView – live re-ranking of the dashboard feed.

    Formula:
    Priority Score = (0.50 × year_importance)
                   + (0.30 × student_preference_score)
                   + (0.08 × days_left)
                   + (0.05 × admin_priority)
                   + (0.04 × dept_match)
                   + (0.02 × category_weight)
                   + (0.01 × engagement_score)
    
    Workflow example
    ----------------
    1. Student (CSE, Final Year, prefers Placement+Scholarship) logs in
    2. 50 approved notices fetched from DB
    3. For each notice: calculate 7 feature scores
    4. Apply weighted formula → priority score 0-1
    5. Sort descending → top notice shown first
    """
    if not notices:
        return []

    try:
        scores = [
            compute_priority_score(n, student_dept, student_year, student_prefs)
            for n in notices
        ]
    except Exception:
        # Fallback: neutral scores
        scores = [0.5] * len(notices)

    ranked = sorted(
        zip(notices, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    for notice, score in ranked:
        notice.priority_score = round(float(score), 4)

    return [n for n, _ in ranked]
