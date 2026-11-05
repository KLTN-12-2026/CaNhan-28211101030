import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from jobs.models import Skill

mappings = {
    "Frontend Development": ["React", "Vue", "Angular", "HTML", "CSS", "Tailwind CSS", "JavaScript", "TypeScript", "Next.js"],
    "Backend Development": ["Django", "Python", "Node.js", "Express", "PostgreSQL", "MongoDB", "MySQL", "PHP", "Laravel", "Ruby", "Rails", "Java", "Spring Boot"],
    "Fullstack": ["MERN", "MEAN", "Next.js", "Fullstack"],
    "Mobile (iOS/Android)": ["Flutter", "React Native", "Swift", "Kotlin", "iOS", "Android", "Xamarin", "Dart"],
    "DevOps / Cloud": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Terraform", "Jenkins"],
    "Data / AI / Machine Learning": ["TensorFlow", "PyTorch", "Scikit-Learn", "Numpy", "Pandas", "SQL", "Big Data", "Machine Learning", "AI"],
    "UI/UX Design": ["Figma", "Adobe XD", "Sketch", "UI Design", "UX Design", "User Interface", "User Experience"]
}

for specialization, skills in mappings.items():
    for skill_name in skills:
        skills_found = Skill.objects.filter(name__iexact=skill_name)
        if skills_found.exists():
            for skill in skills_found:
                skill.specialization = specialization
                skill.save()
            print(f"Updated mapping for {skill_name} -> {specialization}")
        else:
            Skill.objects.create(
                name=skill_name,
                category='Technical',
                specialization=specialization
            )
            print(f"Created mapping {skill_name} -> {specialization}")

print("Seeding complete!")
