from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, FreelancerProfile, CompanyProfile, Industry

# Đăng ký Custom User
@admin.register(User)
# Class cấu hình giao diện Admin cho CustomUser
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    # Thêm trường 'role' vào giao diện chỉnh sửa chi tiết
    fieldsets = UserAdmin.fieldsets + (
        ('Phân quyền Role', {'fields': ('role',)}),
    )

# Đăng ký giao diện quản trị Admin cho model Industry
@admin.register(Industry)
# Class cấu hình giao diện Admin cho Industry
class IndustryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

# Đăng ký giao diện quản trị Admin cho model FreelancerProfile
@admin.register(FreelancerProfile)
# Class cấu hình giao diện Admin cho FreelancerProfile
class FreelancerProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'cv_url')
    search_fields = ('full_name', 'user__username', 'user__email')

# Đăng ký giao diện quản trị Admin cho model CompanyProfile
@admin.register(CompanyProfile)
# Class cấu hình giao diện Admin cho CompanyProfile
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'display_industries')
    search_fields = ('company_name',)
    # Hàm thực hiện display industries
    def display_industries(self, obj):
        return ", ".join([i.name for i in obj.industries.all()])
    display_industries.short_description = 'Industries'
    filter_horizontal = ('industries',)