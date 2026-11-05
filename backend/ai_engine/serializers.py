from rest_framework import serializers
from .models import AIAnalysis

# Class chuyển đổi dữ liệu (Serializer) cho AIAnalysis
class AIAnalysisSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = AIAnalysis
        fields = ['id', 'freelancer', 'skill_gap_data', 'personalized_learning_path', 'last_analyzed']
        read_only_fields = ['last_analyzed']