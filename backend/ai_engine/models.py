from django.db import models
from django.conf import settings

# Class định nghĩa dữ liệu (Model/Entity) cho AIAnalysis
class AIAnalysis(models.Model):
    freelancer = models.OneToOneField('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name='ai_analysis')
    # Lưu Skill Gap, Learning Path dưới dạng JSON
    skill_gap_data = models.JSONField(null=True, blank=True)
    personalized_learning_path = models.JSONField(null=True, blank=True)
    last_analyzed = models.DateTimeField(auto_now=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"AI Analysis for {self.freelancer.full_name}"

class QuestionBank(models.Model):
    DIFFICULTY_CHOICES = [
        ('EASY', 'Dễ'),
        ('MEDIUM', 'Trung bình'),
        ('HARD', 'Khó'),
    ]
    skill_topic = models.CharField(max_length=255, db_index=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    question_text = models.TextField()
    options = models.JSONField(help_text="Mảng các lựa chọn, VD: ['A', 'B', 'C', 'D']")
    correct_answer_index = models.IntegerField()
    explanation = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.skill_topic}] {self.question_text[:50]}..."

class InterviewQuestion(models.Model):
    QUESTION_TYPES = [
        ('Technical', 'Technical'),
        ('Behavioral', 'Behavioral'),
        ('System Design', 'System Design'),
        ('Soft Skill', 'Soft Skill'),
    ]
    DIFFICULTY_CHOICES = [
        ('Easy', 'Easy'),
        ('Medium', 'Medium'),
        ('Hard', 'Hard'),
    ]

    question_text = models.TextField()
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPES, default='Technical')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='Medium')
    company_type = models.CharField(max_length=50, blank=True, null=True, help_text="FAANG, Startup, Product Company, etc.")
    key_concepts_or_star = models.TextField()
    category = models.CharField(max_length=100, db_index=True)
    tags = models.JSONField(default=list, help_text="Mảng các tag ví dụ: ['React', 'Frontend']")
    version_or_valid_until = models.CharField(max_length=50, blank=True, null=True)
    used_count = models.IntegerField(default=0)
    success_rate = models.FloatField(default=0.0)
    is_approved = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_interview_questions")
    rejected_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.category}] {self.question_text[:50]}..."

class SavedInterviewQuestion(models.Model):
    freelancer = models.ForeignKey('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name="saved_interview_questions")
    question = models.ForeignKey(InterviewQuestion, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('freelancer', 'question')

    def __str__(self):
        return f"{self.freelancer.full_name} saved {self.question.id}"

class InterviewPracticeHistory(models.Model):
    freelancer = models.ForeignKey('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name="practice_history")
    question_text = models.TextField()
    question_type = models.CharField(max_length=50)
    user_answer = models.TextField()
    ai_feedback = models.JSONField(help_text="Lưu toàn bộ kết quả đánh giá (score, strengths, weaknesses, better_version)")
    career_goal = models.CharField(max_length=255, blank=True, null=True, help_text="Mục tiêu nghề nghiệp tại thời điểm luyện tập")
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Practice: {self.freelancer.full_name} - {self.score}/100"
