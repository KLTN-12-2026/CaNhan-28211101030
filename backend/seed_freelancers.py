import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User, FreelancerProfile, ExtFreelancerInfo
from jobs.models import Skill, FreelancerSkill

mock_freelancers = [
    {
        "username": "nguyenvana",
        "email": "nguyenvana@example.com",
        "full_name": "Nguyen Van A",
        "professional_title": "Senior Frontend Developer",
        "skills": ["React", "Vue", "JavaScript", "HTML", "CSS"],
        "bio": "I am a passionate Frontend Developer with 5 years of experience building scalable web applications.",
        "experience_level": "Senior",
        "hourly_rate": 25.00
    },
    {
        "username": "tranthib",
        "email": "tranthib@example.com",
        "full_name": "Tran Thi B",
        "professional_title": "Backend Engineer",
        "skills": ["Django", "Python", "PostgreSQL", "Docker", "Node.js"],
        "bio": "Backend engineer specializing in Python and Django. Love building robust APIs and microservices.",
        "experience_level": "Mid-level",
        "hourly_rate": 30.00
    },
    {
        "username": "levanc",
        "email": "levanc@example.com",
        "full_name": "Le Van C",
        "professional_title": "UI/UX Designer",
        "skills": ["Figma", "UI Design", "UX Design"],
        "bio": "Creative UI/UX Designer focusing on user-centric design principles.",
        "experience_level": "Junior",
        "hourly_rate": 15.00
    },
    {
        "username": "phamthid",
        "email": "phamthid@example.com",
        "full_name": "Pham Thi D",
        "professional_title": "Mobile App Developer",
        "skills": ["Flutter", "React Native", "iOS", "Android"],
        "bio": "Cross-platform mobile developer with a knack for beautiful UI animations.",
        "experience_level": "Mid-level",
        "hourly_rate": 28.00
    },
    {
        "username": "hoangvane",
        "email": "hoangvane@example.com",
        "full_name": "Hoang Van E",
        "professional_title": "Data Scientist",
        "skills": ["Python", "TensorFlow", "SQL", "Machine Learning", "Pandas"],
        "bio": "Data Scientist who loves turning raw data into actionable insights.",
        "experience_level": "Senior",
        "hourly_rate": 45.00
    }
]

for data in mock_freelancers:
    # 1. Create User
    user, created = User.objects.get_or_create(
        username=data["username"],
        defaults={
            "email": data["email"],
            "role": User.Role.FREELANCER,
            "is_email_verified": True
        }
    )
    if created:
        user.set_password("password123")
        user.save()
        
    # 2. Update/Create FreelancerProfile
    profile, _ = FreelancerProfile.objects.get_or_create(
        user=user,
        defaults={'full_name': data["full_name"]}
    )
    profile.full_name = data["full_name"]
    profile.bio = data["bio"]
    profile.experience_level = data["experience_level"]
    profile.save()
    
    # 3. Update/Create ExtFreelancerInfo
    ext_info, _ = ExtFreelancerInfo.objects.get_or_create(profile=profile)
    ext_info.professional_title = data["professional_title"]
    ext_info.hourly_rate = data["hourly_rate"]
    ext_info.location = "Vietnam"
    ext_info.save()
    
    # 4. Add Skills
    FreelancerSkill.objects.filter(freelancer=profile).delete()
    for skill_name in data["skills"]:
        skill_obj = Skill.objects.filter(name__iexact=skill_name).first()
        if skill_obj:
            FreelancerSkill.objects.create(
                freelancer=profile,
                skill=skill_obj,
                level=random.randint(3, 5)
            )

print("Successfully created mock freelancers!")
