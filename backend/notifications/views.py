from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification, AIChatHistory
from .serializers import NotificationSerializer, AIChatHistorySerializer

# Class xử lý API (View) cho NotificationViewSet
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    # 1. BẢO VỆ API: Chỉ người đã đăng nhập (có token) mới được gọi API này
    permission_classes = [permissions.IsAuthenticated]

    # 2. LỌC DỮ LIỆU: Thay vì trả về toàn bộ, chỉ trả về thông báo của chính user đang gọi API
    def get_queryset(self):
        # self.request.user chứa thông tin của người đang giữ cái JWT Token
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    # (Tùy chọn) 3. TỰ ĐỘNG GÁN USER KHI TẠO THÔNG BÁO:
    # Đảm bảo ai tạo thông báo cũng không thể giả mạo gửi cho người khác
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Class xử lý API (View) cho AIChatHistoryViewSet
class AIChatHistoryViewSet(viewsets.ModelViewSet):
    queryset = AIChatHistory.objects.all()
    serializer_class = AIChatHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    # Hàm lấy danh sách đối tượng từ database
    def get_queryset(self):
        return AIChatHistory.objects.filter(user=self.request.user).order_by('-timestamp')[:50]

    # Hàm thực hiện lưu đối tượng mới vào database
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        AIChatHistory.objects.filter(user=request.user).delete()
        return Response({"status": "success", "message": "Đã xoá toàn bộ lịch sử trò chuyện."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'])
    def delete_session(self, request):
        session_id = request.data.get('session_id') or request.query_params.get('session_id')
        if not session_id:
            return Response({"error": "Thiếu session_id"}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted_count, _ = AIChatHistory.objects.filter(user=request.user, session_id=session_id).delete()
        return Response({"status": "success", "message": f"Đã xoá phiên chat.", "deleted": deleted_count}, status=status.HTTP_200_OK)