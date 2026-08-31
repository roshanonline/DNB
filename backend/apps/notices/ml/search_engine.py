"""
Smart Search Engine – Lightweight Lexical Semantic Search
========================================================
Algorithm : Token-overlap + fuzzy (difflib) similarity with a small
            synonym/stemming map for "meaning aware" matching.
Where used: GET /api/notices/search/?q=<query>
            Auto-category suggestion when creating a notice

Why not DistilBERT / sentence-transformers?
-------------------------------------------
The transformer stack (torch + transformers + sentence-transformers) is
~2 GB, needs a model download on first use, and re-initialises heavy DLLs
on every process. That made every search request slow and, on some
Windows setups, crash on a torch DLL load error.

This pure-Python engine has **zero heavy dependencies**, imports instantly,
and is more than good enough for ranking a few dozen short notice texts:

  query "exam postponed"  →  matches "examination rescheduled"
  (via synonym map: exam≈examination, postponed≈rescheduled≈delayed)

No pickled cache and no model files are needed.
"""

import difflib
import logging
import re

logger = logging.getLogger(__name__)

# ── Lightweight synonym / normalisation map ─────────────────────────────
# Maps many surface forms onto a single canonical token so that
# "examination", "exams", "exam" all compare equal.
_SYNONYMS = {
    "exam": "exam", "exams": "exam", "examination": "exam", "examinations": "exam",
    "test": "exam", "tests": "exam", "assessment": "exam", "quiz": "exam",
    "midterm": "exam", "endsem": "exam", "semester": "exam",
    "postponed": "reschedule", "postpone": "reschedule", "rescheduled": "reschedule",
    "reschedule": "reschedule", "delayed": "reschedule", "delay": "reschedule",
    "moved": "reschedule", "shifted": "reschedule", "preponed": "reschedule",
    "placement": "placement", "placements": "placement", "recruitment": "placement",
    "hiring": "placement", "job": "placement", "jobs": "placement", "drive": "placement",
    "company": "placement", "campus": "placement", "career": "placement",
    "internship": "internship", "internships": "internship", "intern": "internship",
    "trainee": "internship",
    "scholarship": "scholarship", "scholarships": "scholarship", "fellowship": "scholarship",
    "grant": "scholarship", "stipend": "scholarship", "funding": "scholarship",
    "financial": "scholarship", "aid": "scholarship",
    "workshop": "workshop", "workshops": "workshop", "seminar": "workshop",
    "webinar": "workshop", "training": "workshop", "bootcamp": "workshop",
    "session": "workshop", "hands-on": "workshop",
    "event": "event", "events": "event", "fest": "event", "festival": "event",
    "cultural": "event", "sports": "event", "competition": "event", "hackathon": "event",
    "holiday": "holiday", "holidays": "holiday", "vacation": "holiday", "leave": "holiday",
    "closed": "holiday", "closure": "holiday", "off": "holiday",
    "academic": "academic", "lecture": "academic", "class": "academic", "classes": "academic",
    "syllabus": "academic", "curriculum": "academic", "course": "academic",
    "notice": "notice", "notification": "notice", "circular": "notice",
    "announcement": "notice", "update": "notice", "information": "notice",
    "deadline": "deadline", "duedate": "deadline", "due": "deadline", "lastdate": "deadline",
    "submit": "submit", "submission": "submit", "apply": "submit", "application": "submit",
    "registration": "submit", "register": "submit", "enroll": "submit",
    "result": "result", "results": "result", "marks": "result", "grade": "result",
    "grades": "result", "scorecard": "result",
    "fee": "fee", "fees": "fee", "payment": "fee", "pay": "fee",
}

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "for",
    "on", "in", "at", "and", "or", "with", "will", "has", "have", "this",
    "that", "it", "as", "by", "from", "about", "due",
}

_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list:
    """Lower-case, split, drop stopwords, apply synonym normalisation."""
    out = []
    for w in _WORD_RE.findall((text or "").lower()):
        if w in _STOPWORDS:
            continue
        out.append(_SYNONYMS.get(w, w))
    return out


def _notice_text(notice) -> str:
    """Combine title + description into a single string."""
    try:
        title = getattr(notice, "title", "") or ""
        desc = getattr(notice, "description", "") or ""
        text = f"{title}. {desc}"
        return text.strip() if text.strip() else "No content"
    except Exception:
        return "No content"


def _score(query_tokens: list, text: str) -> float:
    """
    Similarity 0→1 between the query and a notice text.
    Blend of:
      - normalised token overlap (Jaccard-ish, recall of query terms)
      - difflib sequence ratio on the normalised token strings (fuzzy)
    """
    if not query_tokens:
        return 0.0

    doc_tokens = _tokens(text)
    if not doc_tokens:
        return 0.0

    doc_set = set(doc_tokens)
    hits = sum(1 for t in query_tokens if t in doc_set)
    overlap = hits / len(query_tokens)

    # Fuzzy fallback so near-miss spellings still score a little
    fuzzy = difflib.SequenceMatcher(
        None, " ".join(query_tokens), " ".join(doc_tokens)
    ).ratio()

    return round(0.75 * overlap + 0.25 * fuzzy, 4)


# ── Embedding cache (kept as no-ops for API compatibility) ──────────────

def build_notice_embeddings(notices):
    """No-op – this engine needs no precomputed embeddings."""
    return None


# ── Public API ─────────────────────────────────────────────────────────

def semantic_search(query: str, notices, top_k: int = 10, threshold: float = 0.18):
    """
    Rank notices by lexical/synonym similarity to `query`.

    Returns a list of Notice objects (highest first), each with a
    `.similarity_score` attribute attached. Falls back to returning the
    first `top_k` notices if the query is empty.
    """
    if not query or not notices:
        return list(notices)[:top_k]

    try:
        notices = list(notices)
        q_tokens = _tokens(query)
        if not q_tokens:
            return notices[:top_k]

        # Short queries are more ambiguous → be more lenient
        effective_threshold = 0.10 if len(query.strip()) <= 3 else threshold

        scored = []
        for n in notices:
            s = _score(q_tokens, _notice_text(n))
            if s >= effective_threshold:
                scored.append((n, s))

        scored.sort(key=lambda x: x[1], reverse=True)
        for notice, score in scored[:top_k]:
            notice.similarity_score = score

        logger.debug(
            "lexical search q=%r → %d/%d results", query, len(scored), len(notices)
        )
        return [n for n, _ in scored[:top_k]]
    except Exception as e:
        logger.error("search error: %s", e, exc_info=True)
        return []


def suggest_category(title: str, description: str = "") -> tuple:
    """
    Suggest the best category for a new notice using the same
    token/synonym similarity against per-category keyword sets.

    Returns (category_str, confidence_float), e.g. ("Exam", 0.87).
    """
    try:
        category_keywords = {
            "Exam":        "examination test assessment evaluation paper quiz result marks",
            "Placement":   "job placement recruitment company hiring career drive campus",
            "Scholarship": "scholarship fellowship financial aid grant funding stipend",
            "Academic":    "academic lecture curriculum syllabus course class semester",
            "Workshop":    "workshop seminar training hands-on session webinar bootcamp",
            "Event":       "event fest cultural sports competition program hackathon",
            "Holiday":     "holiday vacation leave off closure closed",
            "Internship":  "internship intern trainee training industrial",
            "General":     "general announcement information update notice circular",
        }

        text = f"{title}. {description}".strip()
        if not text:
            return ("General", 0.5)

        q_tokens = _tokens(text)
        best_cat, best_score = "General", 0.0
        for cat, kw in category_keywords.items():
            s = _score(q_tokens, kw)
            if s > best_score:
                best_cat, best_score = cat, s

        if best_score == 0.0:
            return ("General", 0.5)
        return (best_cat, round(float(best_score), 3))
    except Exception as e:
        logger.error("category suggestion error: %s", e)
        return ("General", 0.5)
