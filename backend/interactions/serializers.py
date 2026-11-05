from rest_framework import serializers
from .models import Review
from accounts.serializers import UserSerializer

# Class chuyển đổi dữ liệu (Serializer) cho Review
class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_avatar = serializers.SerializerMethodField()
    job_title = serializers.ReadOnlyField(source='job.title')

    class Meta:
        model = Review
        fields = [
            'id', 'reviewer', 'reviewee', 'job', 'job_title', 
            'rating', 'comment', 'created_at', 
            'reviewer_name', 'reviewer_avatar'
        ]
        read_only_fields = ['reviewer', 'created_at']

    def get_reviewer_name(self, obj):
        user = obj.reviewer
        if user.role == 'FREELANCER':
            return getattr(user.freelancer_profile, 'full_name', user.username)
        elif user.role == 'CLIENT':
            return getattr(user.company_profile, 'company_name', user.username)
        return user.username

    def get_reviewer_avatar(self, obj):
        user = obj.reviewer
        avatar_url = None
        if user.role == 'FREELANCER' and hasattr(user, 'freelancer_profile'):
            avatar_url = user.freelancer_profile.avatar.url if user.freelancer_profile.avatar else None
        elif user.role == 'CLIENT' and hasattr(user, 'company_profile'):
            avatar_url = user.company_profile.logo.url if user.company_profile.logo else None
        
        if avatar_url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(avatar_url)
            return avatar_url
        return f"https://ui-avatars.com/api/?name={self.get_reviewer_name(obj)}&background=random"
