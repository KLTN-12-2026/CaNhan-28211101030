from django.db import models
from django.contrib.auth.models import AbstractUser
from .validators import validate_cv_file, validate_image_file, validate_portfolio_url

# Class định nghĩa dữ liệu (Model/Entity) cho User
class User(AbstractUser):
    # Class định nghĩa dữ liệu (Model/Entity) cho Role
    class Role(models.TextChoices):
        FREELANCER = "FREELANCER", "Freelancer"
        CLIENT = "CLIENT", "Client"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.FREELANCER
    )
    is_email_verified = models.BooleanField(default=False)
    email_verification_otp = models.CharField(max_length=6, null=True, blank=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"{self.username} ({self.role})"


# Class định nghĩa dữ liệu (Model/Entity) cho FreelancerProfile
class FreelancerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='freelancer_profile')
    full_name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, validators=[validate_image_file])
    bio = models.TextField(blank=True)
    cv_url = models.FileField(upload_to='cvs/', null=True, blank=True, validators=[validate_cv_file])
    portfolio_url = models.URLField(null=True, blank=True, validators=[validate_portfolio_url])
    ai_score = models.IntegerField(default=0) 
    ai_summary_report = models.TextField(null=True, blank=True) 
    experience_level = models.CharField(max_length=50, default='Chưa có kinh nghiệm', blank=True, null=True)
    career_goal = models.CharField(max_length=255, blank=True, null=True)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    learning_roadmap = models.JSONField(null=True, blank=True)
    completed_tasks = models.JSONField(default=dict, blank=True)
    saved_projects = models.JSONField(default=list, blank=True)
    interview_prep_data = models.JSONField(null=True, blank=True)
    is_pro = models.BooleanField(default=False)
    from pgvector.django import VectorField
    embedding = VectorField(null=True, blank=True)


    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return self.full_name

# Class định nghĩa dữ liệu (Model/Entity) cho WorkExperience
class WorkExperience(models.Model):
    profile = models.ForeignKey(FreelancerProfile, on_delete=models.CASCADE, related_name='work_experiences')
    company = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"{self.position} at {self.company}"

# Class định nghĩa dữ liệu (Model/Entity) cho Education
class Education(models.Model):
    profile = models.ForeignKey(FreelancerProfile, on_delete=models.CASCADE, related_name='educations')
    school = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    field_of_study = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"{self.degree} from {self.school}"

# Class định nghĩa dữ liệu (Model/Entity) cho Industry
class Industry(models.Model):
    name = models.CharField(max_length=100, unique=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return self.name

# Class định nghĩa dữ liệu (Model/Entity) cho ExtFreelancerInfo
class ExtFreelancerInfo(models.Model):
    profile = models.OneToOneField(FreelancerProfile, on_delete=models.CASCADE, related_name='ext_info')
    professional_title = models.CharField(max_length=255, blank=True, null=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        db_table = 'ext_freelancer_info'

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"Ext info for {self.profile.full_name}"

# Class định nghĩa dữ liệu (Model/Entity) cho CompanyProfile
class CompanyProfile(models.Model):
    # Class định nghĩa dữ liệu (Model/Entity) cho CompanySize
    class CompanySize(models.TextChoices):
        SIZE_1_10 = "1-10", "1-10 nhân viên"
        SIZE_11_50 = "11-50", "11-50 nhân viên"
        SIZE_51_200 = "51-200", "51-200 nhân viên"
        SIZE_201_PLUS = "201+", "201+ nhân viên"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company_profile')
    company_name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='logos/', null=True, blank=True, validators=[validate_image_file])
    industries = models.ManyToManyField(Industry, blank=True, related_name='companies')
    website = models.URLField(null=True, blank=True)
    description = models.TextField(blank=True)
    slogan = models.CharField(max_length=500, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    size = models.CharField(
        max_length=20, 
        choices=CompanySize.choices, 
        default=CompanySize.SIZE_11_50
    )
    facebook = models.CharField(max_length=255, blank=True, null=True)
    linkedin = models.CharField(max_length=255, blank=True, null=True)
    twitter = models.CharField(max_length=255, blank=True, null=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return self.company_name


# Class lưu trữ mã OTP xác thực email (Đăng ký, Xác thực Profile, Quên mật khẩu)
class EmailVerificationCode(models.Model):
    class Purpose(models.TextChoices):
        REGISTER = 'REGISTER', 'Đăng ký tài khoản'
        PROFILE_VERIFY = 'PROFILE_VERIFY', 'Xác thực hồ sơ'
        RESET_PASSWORD = 'RESET_PASSWORD', 'Quên mật khẩu'

    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=20, 
        choices=Purpose.choices, 
        default=Purpose.REGISTER
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'email_verification_codes'
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        return not self.is_verified and timezone.now() <= self.expires_at

    def __str__(self):
        return f"{self.email} - {self.code} ({self.purpose})"