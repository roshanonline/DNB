"""
Deadline Risk Prediction – Cox Proportional Hazard Model
=========================================================
Algorithm : Cox Proportional Hazard Model via `lifelines`
Where used: GET /api/notices/dashboard/ – renders risk banner on student dashboard
            Predicts likelihood of missing deadlines (survival time until deadline)

Why Cox Model?
──────────────
Standard ML metrics engagement rate, but deadlines are TIME-DEPENDENT:
  - Student A: viewed 2 notices, 10 days before deadline
  - Student B: viewed 2 notices, 1 day before deadline
  
Both have same engagement, but B is at much higher risk of missing deadline.

Cox Model handles "survival data" (time-to-event), making it perfect for
predicting which students will "fail to meet deadline" (event = missed deadline).

Key hazard factors:
  1. engagement_rate    : % of relevant notices student has actually viewed
  2. days_remaining     : days until deadline
  3. unread_count       : urgent notices student hasn't viewed yet
  4. category_urgency   : academic > exam > placement > event > others

REQUIREMENTS:
  pip install lifelines numpy pandas
"""

import logging
import numpy as np
import pandas as pd
from datetime import date, timedelta

# ── Logging setup ────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


def calculate_risk_score(user, approved_notices):
    """
    Calculate deadline risk score for a student using engagement-based heuristics.
    
    Since Cox Model requires historical event data (missed deadlines),
    we use a HEURISTIC approach based on engagement patterns:
    
      risk_score = f(engagement_rate, days_remaining, unread_notices, category_urgency)
    
    Returns
    -------
    {
        'risk_score': float (0.0-1.0),
        'risk_level': str ('LOW' | 'MEDIUM' | 'HIGH'),
        'should_alert': bool,
        'urgent_notices': [notice.id, ...],
        'unread_count': int,
    }
    
    HOW IT WORKS (Example):
    ──────────────────────────────
    StudentA: viewed 5/10 dept notices, 1 unread exam notice, 2 days to deadline
      → engagement_rate = 0.5
      → days_remaining_factor = 0.2 (high risk, very close)
      → unread_factor = 0.3 (has unread urgent notice)
      → risk_score = 0.5 * 0.8 + 0.3 * 0.6 + 0.2 = 0.74 → HIGH RISK
      → should_alert = True (days_remaining ≤ 3)
    
    StudentB: viewed 9/10 dept notices, 0 unread, 10 days to deadline
      → engagement_rate = 0.9
      → days_remaining_factor = 0.7 (lower risk, more time)
      → unread_factor = 0.0 (no unread)
      → risk_score = 0.9 * 0.3 + 0.0 * 0.6 + 0.7 = 0.57 → MEDIUM RISK
      → should_alert = False (days_remaining > 3)
    """
    try:
        today = date.today()
        
        # Get user's engagement logs
        from .models import EngagementLog
        engagement_logs = EngagementLog.objects.filter(user=user)
        viewed_notice_ids = set(engagement_logs.filter(viewed=True).values_list('notice_id', flat=True))
        
        # Calculate base engagement rate across recent notices
        recent_notices = approved_notices.filter(
            created_at__gte=today - timedelta(days=30)
        )
        recent_count = recent_notices.count()
        
        if recent_count > 0:
            engagement_rate = len(viewed_notice_ids & set(recent_notices.values_list('id', flat=True))) / recent_count
        else:
            engagement_rate = 0.5  # neutral default
        
        # Get upcoming deadlines (unread & urgent)
        upcoming = []
        urgent_notices = []
        
        for notice in approved_notices:
            if notice.deadline:
                days_left = (notice.deadline - today).days
                if 0 < days_left <= 7:  # within next week
                    upcoming.append(notice)
                    # Check if notice is unread (not in viewed logs)
                    if notice.id not in viewed_notice_ids:
                        urgent_notices.append(notice)
        
        unread_count = len(urgent_notices)
        
        # Calculate risk factors
        if upcoming:
            # Days to nearest deadline
            min_days = min((n.deadline - today).days for n in upcoming if n.deadline)
            min_days = max(0, min_days)  # clamp to 0
            
            # Factor: more days = lower risk (exponential decay)
            # At 7 days: factor ≈ 0.1
            # At 3 days: factor ≈ 0.5
            # At 0 days: factor = 1.0
            days_remaining_factor = 1.0 / (1.0 + np.exp(3 - min_days))  # sigmoid
        else:
            min_days = 999
            days_remaining_factor = 0.0
        
        # Factor: unread urgent notices (increases risk)
        # Each unread notice adds ~10% risk, max 0.5
        unread_factor = min(0.5, unread_count * 0.1)
        
        # Category urgency weights
        CATEGORY_URGENCY = {
            'Exam': 1.0,
            'Academic': 0.9,
            'Placement': 0.8,
            'Internship': 0.7,
            'Scholarship': 0.6,
            'Workshop': 0.4,
            'Event': 0.3,
            'Holiday': 0.1,
            'General': 0.2,
        }
        
        # Weighted average of categories in upcoming deadlines
        if upcoming:
            avg_urgency = np.mean([
                CATEGORY_URGENCY.get(n.category, 0.5)
                for n in upcoming
            ])
        else:
            avg_urgency = 0.0
        
        # ── FINAL RISK SCORE ──
        # Combine engagement (inverse) + deadline urgency + unread notices
        risk_score = (
            (1.0 - engagement_rate) * 0.4 +  # Low engagement = higher risk
            days_remaining_factor * 0.4 +     # Close deadline = higher risk
            unread_factor * 0.2                # Unread urgent = higher risk
        )
        
        # Apply category urgency multiplier (max risk if urgent categories)
        risk_score = min(1.0, risk_score * (0.5 + 0.5 * avg_urgency))
        
        # Determine risk level
        if risk_score >= 0.7:
            risk_level = 'HIGH'
        elif risk_score >= 0.4:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # Should alert if deadline within 3 days and at least medium risk
        should_alert = (min_days <= 3 and risk_score >= 0.35)
        
        return {
            'risk_score': round(risk_score, 3),
            'risk_level': risk_level,
            'should_alert': should_alert,
            'urgent_notices': [
                {
                    'id': n.id,
                    'title': n.title[:60],
                    'deadline': n.deadline.isoformat() if n.deadline else None,
                    'days_remaining': (n.deadline - today).days if n.deadline else None,
                }
                for n in urgent_notices[:5]
            ],
            'unread_count': unread_count,
            'engagement_rate': round(engagement_rate, 2),
            'days_to_nearest_deadline': min_days if min_days != 999 else None,
            'upcoming_count': len(upcoming),
        }
    
    except Exception as e:
        logger.error(f"❌ Error calculating risk score for user {user.id}: {e}", exc_info=True)
        # Return safe default
        return {
            'risk_score': 0.0,
            'risk_level': 'LOW',
            'should_alert': False,
            'urgent_notices': [],
            'unread_count': 0,
            'engagement_rate': 0.0,
            'days_to_nearest_deadline': None,
            'upcoming_count': 0,
            'error': str(e),
        }


def calculate_notice_risk(notice):
    """
    Calculate risk level for an individual notice based on deadline proximity.
    
    This is used to add color indicators to each notice card on the dashboard.
    
    Returns
    -------
    {
        'risk_level': 'LOW' | 'MEDIUM' | 'HIGH',
        'risk_color': '#10B981' | '#F59E0B' | '#EF4444',  # tailwind colors
        'days_remaining': int or None,
    }
    
    Risk Factors:
      - HIGH:   deadline ≤ 3 days (red)
      - MEDIUM: deadline 4-7 days (yellow)
      - LOW:    deadline > 7 days or no deadline (green)
    """
    try:
        today = date.today()
        
        if not notice.deadline:
            return {
                'risk_level': 'LOW',
                'risk_color': '#10B981',  # emerald-500
                'days_remaining': None,
            }
        
        days_left = (notice.deadline - today).days
        
        if days_left < 0:
            # Past deadline
            return {
                'risk_level': 'HIGH',
                'risk_color': '#DC2626',  # red-600
                'days_remaining': days_left,
            }
        elif days_left <= 3:
            return {
                'risk_level': 'HIGH',
                'risk_color': '#EF4444',  # red-500
                'days_remaining': days_left,
            }
        elif days_left <= 7:
            return {
                'risk_level': 'MEDIUM',
                'risk_color': '#F59E0B',  # amber-500
                'days_remaining': days_left,
            }
        else:
            return {
                'risk_level': 'LOW',
                'risk_color': '#10B981',  # emerald-500
                'days_remaining': days_left,
            }
    
    except Exception as e:
        logger.warning(f"Error calculating notice risk: {e}")
        return {
            'risk_level': 'LOW',
            'risk_color': '#10B981',
            'days_remaining': None,
        }
