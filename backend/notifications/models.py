from django.db import models
from django.conf import settings

# Class định nghĩa dữ liệu (Model/Entity) cho Notification
class Notification(models.Model):
    TYPE_CHOICES = (
        ('job', 'Job'),
        ('application', 'Application'),
        ('match', 'AI Match'),
        ('system', 'System'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    
    title = models.CharField(max_length=255, default="Thông báo mới")
    
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        ordering = ['-created_at']

# Class định nghĩa dữ liệu (Model/Entity) cho AIChatHistory
class AIChatHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    user_message = models.TextField()
    ai_response = models.TextField()
    session_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)
