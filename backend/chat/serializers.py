from rest_framework import serializers
from .models import ChatMessage
from django.contrib.auth import get_user_model

User = get_user_model()

# Class chuyển đổi dữ liệu (Serializer) cho ChatMessage
class ChatMessageSerializer(serializers.ModelSerializer):
    # Trường dữ liệu mở rộng (Serializer Field): sender_name
    sender_name = serializers.ReadOnlyField(source='sender.username')
    # Trường dữ liệu mở rộng (Serializer Field): receiver_name
    receiver_name = serializers.ReadOnlyField(source='receiver.username')

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'receiver', 'content', 'image', 'file', 'is_read', 'created_at', 'sender_name', 'receiver_name', 'is_offer', 'offer_status', 'offer_details', 'application', 'is_submission', 'submission_status', 'submission_details']
        read_only_fields = ['sender', 'created_at', 'is_offer', 'offer_status', 'offer_details', 'application', 'is_submission', 'submission_status', 'submission_details']

# Class chuyển đổi dữ liệu (Serializer) cho Conversation
class ConversationSerializer(serializers.Serializer):
    # Trường dữ liệu mở rộng (Serializer Field): other_user_id
    other_user_id = serializers.IntegerField()
    # Trường dữ liệu mở rộng (Serializer Field): other_user_name
    other_user_name = serializers.CharField()
    # Trường dữ liệu mở rộng (Serializer Field): last_message
    last_message = serializers.CharField()
    # Trường dữ liệu mở rộng (Serializer Field): timestamp
    timestamp = serializers.DateTimeField()
    # Trường dữ liệu mở rộng (Serializer Field): unread_count
    unread_count = serializers.IntegerField()
