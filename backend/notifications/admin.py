from django.contrib import admin
from .models import Notification, AIChatHistory

# Đăng ký giao diện quản trị Admin cho model Notification
@admin.register(Notification)
# Class cấu hình giao diện Admin cho Notification
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')
    list_filter = ('is_read',)

# Đăng ký giao diện quản trị Admin cho model AIChatHistory
@admin.register(AIChatHistory)
# Class cấu hình giao diện Admin cho AIChatHistory
class AIChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'timestamp')
    search_fields = ('user__username', 'user_message', 'ai_response')