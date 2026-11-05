from django.db import models
from rest_framework import viewsets, permissions
from .models import Review
from .serializers import ReviewSerializer
from accounts.permissions import IsOwnerOrReadOnly

# Class xử lý API (View) cho ReviewViewSet
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    # Hàm thực hiện lưu đối tượng mới vào database
    def perform_create(self, serializer):
        # BẢO MẬT BUSINESS LOGIC: Chỉ cho phép review nếu Freelancer đã được chấp nhận (Accepted) cho Job này
        from jobs.models import Application
        from rest_framework.exceptions import ValidationError
        
        job = serializer.validated_data.get('job')
        user = self.request.user
        
        # Kiểm tra xem user hiện tại có đơn ứng tuyển 'Accepted' cho công việc này không
        # (Trường hợp Client review Freelancer hoặc Freelancer review Client đều cần sự kết nối qua đơn ứng tuyển)
        has_permission = Application.objects.filter(
            job=job, 
            status__in=['Accepted', 'accepted', 'Hired', 'hired', 'Completed', 'completed']
        ).filter(
            models.Q(freelancer__user=user) | models.Q(job__client__user=user)
        ).exists()

        if not has_permission:
            raise ValidationError("Bạn không có quyền đánh giá vì chưa có sự hợp tác chính thức (Accepted/Hired/Completed) trong dự án này.")

        serializer.save(reviewer=user)

    # Hàm lấy danh sách đối tượng từ database
    def get_queryset(self):
        queryset = Review.objects.all()
        reviewee_id = self.request.query_params.get('reviewee_id')
        if reviewee_id:
            queryset = queryset.filter(reviewee_id=reviewee_id)
        return queryset
