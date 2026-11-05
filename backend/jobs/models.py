from django.db import models

# Class định nghĩa dữ liệu (Model/Entity) cho Skill
class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, help_text="Technical or Soft skill")
    specialization = models.CharField(max_length=100, blank=True, null=True, help_text="IT Specialization (Frontend, Backend, etc.)")

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return self.name

# Class định nghĩa dữ liệu (Model/Entity) cho FreelancerSkill
class FreelancerSkill(models.Model):
    # Tham chiếu tới FreelancerProfile ở app accounts
    freelancer = models.ForeignKey('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name='skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.IntegerField(default=1, help_text="Scale 1-5")
    is_ai_extracted = models.BooleanField(default=False)


# Class định nghĩa dữ liệu (Model/Entity) cho Job
class Job(models.Model):
    client = models.ForeignKey('accounts.CompanyProfile', on_delete=models.CASCADE, related_name='jobs')
    title = models.CharField(max_length=255)
    description = models.TextField()
    budget = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default='Active')
    
    # New fields to match frontend
    category = models.CharField(max_length=255, blank=True, null=True, default='Web Development') # Will store comma-separated categories
    experience_level = models.CharField(max_length=255, blank=True, null=True, default='Junior') # Will store comma-separated levels
    project_type = models.CharField(max_length=50, blank=True, null=True)
    deadline = models.DateField(blank=True, null=True)
    duration = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    from pgvector.django import VectorField
    embedding = VectorField(null=True, blank=True)
    
    required_skills = models.ManyToManyField(Skill, through='JobRequirement')

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']

# Class định nghĩa dữ liệu (Model/Entity) cho JobRequirement
class JobRequirement(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    weight = models.FloatField(default=1.0, help_text="Độ quan trọng (0.0 - 1.0)")

# Class định nghĩa dữ liệu (Model/Entity) cho Application
class Application(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    freelancer = models.ForeignKey('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name='applications')
    applied_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='Pending')
    matching_score = models.FloatField(default=0.0)
    cover_letter = models.TextField(blank=True, null=True)
    bid_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        # Gỡ bỏ unique_together để cho phép ứng tuyển lại sau khi bị từ chối
        # unique_together = ('job', 'freelancer')
        ordering = ['-applied_at']

# Class định nghĩa dữ liệu (Model/Entity) cho SavedJob
class SavedJob(models.Model):
    freelancer = models.ForeignKey('accounts.FreelancerProfile', on_delete=models.CASCADE, related_name='saved_jobs')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(auto_now_add=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        unique_together = ('freelancer', 'job')
        ordering = ['-saved_at']
