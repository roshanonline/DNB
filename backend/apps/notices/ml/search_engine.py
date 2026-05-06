"""
Smart Search Engine – DistilBERT Semantic Search
=================================================
Algorithm : DistilBERT sentence embeddings via `sentence-transformers`
            + cosine similarity for ranking
Where used: GET /api/notices/search/?q=<query>
            Auto-category suggestion when creating a notice

Why DistilBERT and not plain SQL LIKE?
---------------------------------------
SQL search: "exam rescheduled" → finds "exam" or "rescheduled" literally
DistilBERT: "exam rescheduled" → also finds "examination postponed",
            "test delayed", "assessment moved" because it understands meaning

Workflow example
----------------
1. Student types: "exam postponed"
2. All approved notice titles+descriptions are converted to 384-dim vectors
3. Query is also converted to a 384-dim vector
4. Cosine similarity: sim(query_vec, notice_vec)  → score 0→1
5. Notices sorted by score; only those ≥ threshold shown
6. "Examination rescheduled due to festival" shows up even though no word matches

Model used : paraphrase-MiniLM-L3-v2
  - 61 MB  (much lighter than full DistilBERT 250 MB)
  - Runs on CPU in <1 s for 60 notices
  - Same quality for short notice texts

REQUIREMENTS:
  pip install sentence-transformers torch transformers scikit-learn numpy
"""

import os
import pickle
import numpy as np
import logging
from sklearn.metrics.pairwise import cosine_similarity
import warnings
warnings.filterwarnings("ignore")

# ── Logging setup ────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Model config ────────────────────────────────────────────────────────
# Swap to 'distilbert-base-nli-mean-tokens' for full DistilBERT (needs ~250 MB)
_MODEL_NAME  = "paraphrase-MiniLM-L3-v2"
_CACHE_PATH  = os.path.join(os.path.dirname(__file__), "notice_embeddings.pkl")
_model       = None   # lazy-loaded


def _get_model():
    """
    Lazy-load the DistilBERT model with error handling.
    Downloads ~61 MB on first use (cached afterwards).
    """
    global _model
    if _model is None:
        try:
            logger.info(f"🔄 Loading DistilBERT model '{_MODEL_NAME}'...")
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(_MODEL_NAME)
            logger.info(f"✅ Model loaded successfully (384-dim embeddings)")
        except ImportError as e:
            logger.error(f"❌ Missing dependency: {e}")
            logger.error("   Install: pip install sentence-transformers torch transformers")
            raise
        except Exception as e:
            logger.error(f"❌ Error loading model: {e}")
            raise
    return _model


def _notice_text(notice) -> str:
    """Combine title + description into a single string for embedding."""
    try:
        title = getattr(notice, "title", "") or ""
        desc  = getattr(notice, "description", "") or ""
        text = f"{title}. {desc}"[:512]  # truncate to 512 chars
        return text.strip() if text.strip() else "No content"
    except Exception as e:
        logger.warning(f"Error extracting notice text: {e}")
        return "No content"


# ── Embedding cache ─────────────────────────────────────────────────────

def build_notice_embeddings(notices):
    """
    Pre-compute and cache DistilBERT embeddings for all notices.
    Call this after seeding the DB or when many notices change.
    The cache speeds up subsequent searches significantly.
    """
    model = _get_model()
    texts      = [_notice_text(n) for n in notices]
    notice_ids = [n.id for n in notices]

    embeddings = model.encode(texts, show_progress_bar=False, batch_size=32)

    with open(_CACHE_PATH, "wb") as f:
        pickle.dump({"ids": notice_ids, "embeddings": embeddings}, f)

    return embeddings


# ── Public API ─────────────────────────────────────────────────────────

def semantic_search(query: str, notices, top_k: int = 10, threshold: float = 0.25):
    """
    Search notices using DistilBERT semantic similarity.

    Parameters
    ----------
    query     : student's search string
    notices   : queryset / list of Notice objects
    top_k     : max results to return
    threshold : minimum cosine similarity (0→1) to include a result
                (adjusted for short queries to be more lenient)

    Returns
    -------
    List of Notice objects sorted by semantic similarity DESC.
    Each notice gets a `.similarity_score` attribute attached.
    
    HOW IT WORKS (Example):
    ─────────────────────────
    Query: "exam postponed"
    
    Step 1: Encode query to 384-dim vector
            "exam postponed" → [0.12, -0.45, 0.89, ..., 0.01]
    
    Step 2: Encode all notices to 384-dim vectors
            "Examination rescheduled" → [0.11, -0.44, 0.87, ..., 0.02]  (similar!)
            "Test delayed due to..." → [0.10, -0.46, 0.88, ..., 0.00]  (similar!)
            "Workshop on Python" → [0.01, 0.15, 0.02, ..., 0.99]  (different)
    
    Step 3: Calculate cosine similarity between query and all notices
            sim(query, "Examination...") = 0.95  ← HIGH similarity
            sim(query, "Test delayed...") = 0.87  ← HIGH similarity
            sim(query, "Workshop...") = 0.12  ← LOW similarity
    
    Step 4: Filter by threshold (adjusted for query length) and sort DESC
            Return: ["Examination rescheduled", "Test delayed..."]
    
    SHORT QUERY HANDLING:
    ────────────────────
    For queries ≤ 3 characters, threshold is lowered to 0.15
    to allow more results for abbreviations like "fe", "ai", "ml"
    """
    if not query or not notices:
        logger.debug(f"Early return: query={bool(query)}, notices={bool(notices)}")
        return list(notices)[:top_k]

    try:
        notices = list(notices)
        
        if not notices:
            logger.debug("No notices to search")
            return []
        
        # ── Adjust threshold for short queries ──
        effective_threshold = threshold
        if len(query) <= 3:
            effective_threshold = 0.15  # More lenient for short queries
            logger.debug(f"Short query detected: '{query}' → threshold lowered to {effective_threshold}")
        
        logger.info(f"🔍 Semantic search: query='{query}' (len={len(query)}) | notices={len(notices)} | threshold={effective_threshold}")
        
        # Get model
        model = _get_model()
        
        # Encode query
        try:
            query_emb = model.encode([query], show_progress_bar=False)
            logger.debug(f"   Query encoded: {query_emb.shape}")
        except Exception as e:
            logger.error(f"Error encoding query: {e}")
            return []
        
        # Encode notices
        try:
            notice_texts = [_notice_text(n) for n in notices]
            notice_embs = model.encode(
                notice_texts,
                show_progress_bar=False,
                batch_size=32,
            )
            logger.debug(f"   Notices encoded: {notice_embs.shape}")
        except Exception as e:
            logger.error(f"Error encoding notices: {e}")
            return []
        
        # Calculate similarity
        try:
            sims = cosine_similarity(query_emb, notice_embs)[0]
            logger.debug(f"   Similarities: min={sims.min():.3f}, max={sims.max():.3f}, mean={sims.mean():.3f}")
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return []
        
        # Filter and sort
        results = [
            (n, float(s))
            for n, s in zip(notices, sims)
            if s >= effective_threshold  # Use adjusted threshold
        ]
        results.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"   ✅ Found {len(results)} results (threshold={effective_threshold})")

        # Attach scores
        for notice, score in results[:top_k]:
            notice.similarity_score = round(score, 4)

        return [n for n, _ in results[:top_k]]
        
    except Exception as e:
        logger.error(f"❌ Semantic search error: {e}", exc_info=True)
        return []


def suggest_category(title: str, description: str = "") -> tuple:
    """
    Auto-suggest best category for a new notice based on semantic similarity.
    
    Uses DistilBERT to match the notice title + description against
    category-specific keywords, returning the best matching category.

    Returns (category_str, confidence_float)
    Example: ("EXAM", 0.87)
    
    EXAMPLE WORKFLOW:
    ──────────────────
    Input: title="Exam Rescheduled", desc="Due to festival closure"
    
    1. Encode input: "Exam Rescheduled. Due to festival closure"
       → [0.15, -0.32, 0.78, ..., 0.05]
    
    2. Encode category descriptions:
       "Exam"        → "examination test assessment evaluation paper quiz"
       "Placement"   → "job placement recruitment company hiring drive"
       "Scholarship" → "scholarship fellowship financial aid grant"
       etc...
    
    3. Calculate similarity vs each category:
       Exam similarity:        0.92  ← HIGHEST
       Placement similarity:   0.15
       Scholarship similarity: 0.08
    
    4. Return highest: ("Exam", 0.92)
    """
    try:
        model = _get_model()

        category_descriptions = {
            "Exam":        "examination test assessment evaluation paper quiz",
            "Placement":   "job placement recruitment company hiring career drive",
            "Scholarship": "scholarship fellowship financial aid grant funding",
            "Academic":    "academic lecture curriculum syllabus course class",
            "Workshop":    "workshop seminar training hands-on session",
            "Event":       "event fest cultural sports competition program",
            "Holiday":     "holiday vacation leave off closure",
            "General":     "general announcement information update notice circular",
        }

        text_to_encode = f"{title}. {description}".strip()
        if not text_to_encode:
            logger.warning("Empty text for category suggestion, returning 'General'")
            return ("General", 0.5)

        text_emb = model.encode([text_to_encode], show_progress_bar=False)
        cat_embs = model.encode(list(category_descriptions.values()), show_progress_bar=False)
        sims     = cosine_similarity(text_emb, cat_embs)[0]

        best_idx  = int(np.argmax(sims))
        best_cat  = list(category_descriptions.keys())[best_idx]
        confidence = round(float(sims[best_idx]), 3)
        
        logger.debug(f"Category suggestion: '{title}' → {best_cat} ({confidence:.1%})")
        return best_cat, confidence
        
    except Exception as e:
        logger.error(f"Error suggesting category: {e}", exc_info=True)
        # Fallback to "General" if error occurs
        return ("General", 0.5)
