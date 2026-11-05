from .models import Application, JobRequirement

def calculate_and_save_matching_score(job, freelancer, save_application=True, cover_letter=None, bid_amount=None):
    """
    Calculates matching score based on weighted skills and experience level.
    Matches the logic in FindJobs.jsx.
    """
    # Nếu Freelancer có cấp bậc là "Chưa có kinh nghiệm" -> 0%
    if freelancer.experience_level == 'Chưa có kinh nghiệm':
        if save_application:
            defaults = {'matching_score': 0, 'status': 'Pending'}
            if cover_letter is not None:
                defaults['cover_letter'] = cover_letter
            if bid_amount is not None:
                defaults['bid_amount'] = bid_amount
            Application.objects.update_or_create(
                job=job,
                freelancer=freelancer,
                defaults=defaults
            )
        return 0

    # 1. Skill Score (Max 70 points)
    requirements = JobRequirement.objects.filter(job=job)
    freelancer_skills = set(freelancer.skills.all().values_list('skill__name', flat=True).iterator())
    freelancer_skills_lower = {s.lower() for s in freelancer_skills}
    
    total_weight = 0
    matched_weight = 0
    
    if not requirements.exists():
        skill_score = 70.0
    else:
        for req in requirements:
            weight = req.weight or 1.0
            total_weight += weight
            skill_name = req.skill.name.lower()
            
            # Substring match for flexibility (e.g. "React" matches "React.js")
            if any(skill_name in fs or fs in skill_name for fs in freelancer_skills_lower):
                matched_weight += weight
        
        skill_score = (matched_weight / total_weight) * 70.0 if total_weight > 0 else 70.0

    # 2. Experience Score (Max 30 points)
    def get_level_value(level_str):
        levels = {
            'intern': 1,
            'fresher': 2,
            'junior': 3,
            'senior': 4,
            'leader': 5,
            'manager': 6
        }
        return levels.get(level_str.lower(), 2) if level_str else 2

    # Job can have multiple levels comma-separated
    jd_levels_str = job.experience_level or 'Junior'
    jd_levels = [l.strip() for l in jd_levels_str.split(',') if l.strip()]
    jd_min_val = min([get_level_value(l) for l in jd_levels]) if jd_levels else 3
    
    fl_val = get_level_value(freelancer.experience_level or 'Intern')
    
    exp_score = 0
    diff = jd_min_val - fl_val
    
    if diff <= 0:
        exp_score = 30
    elif diff == 1:
        exp_score = 15
    else:
        exp_score = 0

    total_score = int(round(skill_score + exp_score, 0))

    if save_application:
        defaults = {
            'matching_score': total_score,
            'status': 'Pending'  # Reset status to Pending on re-apply
        }
        if cover_letter is not None:
            defaults['cover_letter'] = cover_letter
        if bid_amount is not None:
            defaults['bid_amount'] = bid_amount

        Application.objects.update_or_create(
            job=job,
            freelancer=freelancer,
            defaults=defaults
        )
    
    return total_score
