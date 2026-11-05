from rest_framework import serializers
from .models import Notification, AIChatHistory

# Class chuyển đổi dữ liệu (Serializer) cho Notification
class NotificationSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'is_read', 'created_at']
        read_only_fields = ['created_at']

# Class chuyển đổi dữ liệu (Serializer) cho AIChatHistory
class AIChatHistorySerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = AIChatHistory
        fields = ['id', 'user', 'user_message', 'ai_response', 'session_id', 'timestamp']
        read_only_fields = ['timestamp']