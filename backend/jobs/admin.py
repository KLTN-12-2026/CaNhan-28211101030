from django.contrib import admin
from .models import Skill, FreelancerSkill, Job, JobRequirement, Application

# Đăng ký giao diện quản trị Admin cho model Skill
@admin.register(Skill)
# Class cấu hình giao diện Admin cho Skill
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)

# Đăng ký giao diện quản trị Admin cho model FreelancerSkill
@admin.register(FreelancerSkill)
# Class cấu hình giao diện Admin cho FreelancerSkill
class FreelancerSkillAdmin(admin.ModelAdmin):
    list_display = ('freelancer', 'skill', 'level', 'is_ai_extracted')
    list_filter = ('is_ai_extracted', 'level')

# Cho phép thêm nhanh Kỹ năng yêu cầu ngay trong form tạo Công việc
class JobRequirementInline(admin.TabularInline):
    model = JobRequirement
    extra = 1

# Đăng ký giao diện quản trị Admin cho model Job
@admin.register(Job)
# Class cấu hình giao diện Admin cho Job
class JobAdmin(admin.ModelAdmin):
    list_display = ('title', 'client', 'budget', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'client__company_name')
    inlines = [JobRequirementInline] # Nhúng form con vào đây

# Đăng ký giao diện quản trị Admin cho model Application
@admin.register(Application)
# Class cấu hình giao diện Admin cho Application
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('job', 'freelancer', 'status', 'matching_score', 'applied_at')
    list_filter = ('status',)
    search_fields = ('job__title', 'freelancer__full_name')