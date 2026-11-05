from django.db import models
from django.conf import settings
from jobs.models import Job

# Class định nghĩa dữ liệu (Model/Entity) cho Review
class Review(models.Model):
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        ordering = ['-created_at']

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"Review from {self.reviewer} to {self.reviewee} - {self.rating} stars"
