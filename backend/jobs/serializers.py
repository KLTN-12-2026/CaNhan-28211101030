from rest_framework import serializers
from .models import Skill, Job, JobRequirement, Application, SavedJob
from accounts.serializers import CompanyProfileSerializer, FreelancerProfileSerializer

# Class chuyển đổi dữ liệu (Serializer) cho Skill
class SkillSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Skill
        fields = '__all__'

# Class chuyển đổi dữ liệu (Serializer) cho JobRequirement
class JobRequirementSerializer(serializers.Serializer):
    # Trường dữ liệu mở rộng (Serializer Field): skill
    skill = serializers.CharField()
    # Trường dữ liệu mở rộng (Serializer Field): weight
    weight = serializers.FloatField(default=1.0)

    # Hàm thực hiện to representation
    def to_representation(self, instance):
        return {
            'skill': instance.skill.name,
            'weight': instance.weight
        }

# Class chuyển đổi dữ liệu (Serializer) cho Job
class JobSerializer(serializers.ModelSerializer):
    company = CompanyProfileSerializer(source='client', read_only=True)
    requirements = JobRequirementSerializer(source='jobrequirement_set', many=True, required=False)
    # Trường dữ liệu mở rộng (Serializer Field): application_count
    application_count = serializers.SerializerMethodField()
    # Trường dữ liệu mở rộng (Serializer Field): matching_score
    matching_score = serializers.SerializerMethodField()

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Job
        fields = [
            'id', 'client', 'company', 'title', 'description', 
            'budget', 'created_at', 'is_active', 'status', 'requirements',
            'project_type', 'deadline', 'duration', 'location', 'category',
            'experience_level', 'application_count', 'matching_score'
        ]
        read_only_fields = ['client']

    # Hàm lấy dữ liệu matching score
    def get_matching_score(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        from accounts.models import FreelancerProfile
        from .services import calculate_and_save_matching_score
        
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            # Truyền chính object job (obj) và profile thay vì ID
            return calculate_and_save_matching_score(obj, profile, save_application=False)
        except FreelancerProfile.DoesNotExist:
            return 0
        except Exception as e:
            print(f"Error calculating score: {e}")
            return 0

    def get_application_count(self, obj):
        """
        Đếm số lượng ứng viên thực tế từ bảng Application.
        """
        return obj.applications.count()

    # Hàm tạo mới đối tượng
    def create(self, validated_data):
        requirements_data = validated_data.pop('jobrequirement_set', [])
        try:
            job = Job.objects.create(**validated_data)
        except Exception as e:
            raise serializers.ValidationError({"detail": f"Database error: {str(e)}"})

        for req_data in requirements_data:
            skill_name = req_data['skill'] 
            weight = req_data.get('weight', 1.0)
            skill_obj, _ = Skill.objects.get_or_create(
                name__iexact=skill_name,
                defaults={'name': skill_name, 'category': 'Technical'}
            )
            JobRequirement.objects.create(job=job, skill=skill_obj, weight=weight)
        return job

    # Hàm cập nhật đối tượng
    def update(self, instance, validated_data):
        requirements_data = validated_data.pop('jobrequirement_set', None)
        instance = super().update(instance, validated_data)
        if requirements_data is not None:
            instance.jobrequirement_set.all().delete()
            for req_data in requirements_data:
                skill_name = req_data['skill']
                weight = req_data.get('weight', 1.0)
                skill_obj, _ = Skill.objects.get_or_create(
                    name__iexact=skill_name,
                    defaults={'name': skill_name, 'category': 'Technical'}
                )
                JobRequirement.objects.create(job=instance, skill=skill_obj, weight=weight)
        return instance

# Class chuyển đổi dữ liệu (Serializer) cho Application
class ApplicationSerializer(serializers.ModelSerializer):
    # Trả về thông tin đầy đủ của Freelancer để Client xem profile
    freelancer_info = FreelancerProfileSerializer(source='freelancer', read_only=True)

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Application
        fields = [
            'id', 'job', 'freelancer', 'freelancer_info', 
            'matching_score', 'status', 'applied_at',
            'cover_letter', 'bid_amount'
        ]

# Class chuyển đổi dữ liệu (Serializer) cho SavedJob
class SavedJobSerializer(serializers.ModelSerializer):
    job_details = JobSerializer(source='job', read_only=True)
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = SavedJob
        fields = ['id', 'freelancer', 'job', 'saved_at', 'job_details']