from django.db import models
from django.conf import settings

# Class định nghĩa dữ liệu (Model/Entity) cho ChatMessage
class ChatMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Offer fields
    is_offer = models.BooleanField(default=False)
    offer_status = models.CharField(max_length=20, default='pending') # pending, accepted, rejected
    offer_details = models.JSONField(null=True, blank=True)
    application = models.ForeignKey('jobs.Application', on_delete=models.SET_NULL, null=True, blank=True, related_name='offers')

    # Submission fields
    is_submission = models.BooleanField(default=False)
    submission_status = models.CharField(max_length=20, default='pending') # pending, approved, rejected
    submission_details = models.JSONField(null=True, blank=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        ordering = ['created_at']

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"From {self.sender} to {self.receiver} at {self.created_at}"
