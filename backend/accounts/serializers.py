from rest_framework import serializers
from .models import User, FreelancerProfile, CompanyProfile, Industry, WorkExperience, Education
from jobs.models import Job
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Class chuyển đổi dữ liệu (Serializer) cho User
class UserSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'is_email_verified']
        # Đảm bảo không bao giờ trả password qua API
        extra_kwargs = {'password': {'write_only': True}}

# Class chuyển đổi dữ liệu (Serializer) cho Register
class RegisterSerializer(serializers.ModelSerializer):
    # Trường dữ liệu mở rộng (Serializer Field): full_name
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    otp = serializers.CharField(
        write_only=True, 
        required=True, 
        min_length=6, 
        max_length=6,
        error_messages={
            'required': 'Vui lòng nhập mã xác thực OTP gửi về email của bạn.',
            'min_length': 'Mã OTP phải gồm 6 chữ số.',
            'max_length': 'Mã OTP phải gồm 6 chữ số.'
        }
    )
    
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'role', 'full_name', 'otp')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    # Hàm kiểm tra tính hợp lệ của trường email
    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email này đã được sử dụng. Mỗi email chỉ có thể đăng ký một tài khoản duy nhất (không thể dùng chung cho cả Freelancer và Client).")
        return value

    # Hàm kiểm tra tính hợp lệ của trường username
    def validate_username(self, value):
        return value.lower()

    # Xác thực mã OTP trước khi tạo tài khoản
    def validate(self, attrs):
        email = attrs.get('email', '').lower()
        otp = attrs.get('otp', '').strip()

        from .models import EmailVerificationCode
        from django.utils import timezone

        valid_code = EmailVerificationCode.objects.filter(
            email__iexact=email,
            code=otp,
            purpose=EmailVerificationCode.Purpose.REGISTER,
            is_verified=False,
            expires_at__gte=timezone.now()
        ).first()

        if not valid_code:
            raise serializers.ValidationError({"otp": "Mã xác thực OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc yêu cầu mã mới."})

        self._verification_code = valid_code
        return attrs

    # Hàm tạo mới đối tượng
    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        validated_data.pop('otp', None)
        
        # Đảm bảo role in hoa để khớp với Database (FREELANCER / CLIENT)
        if 'role' in validated_data:
            validated_data['role'] = validated_data['role'].upper()
            
        # Tài khoản đã xác thực OTP email thành công khi đăng ký
        validated_data['is_email_verified'] = True
        user = User.objects.create_user(**validated_data)

        # Đánh dấu OTP đã được sử dụng
        if hasattr(self, '_verification_code') and self._verification_code:
            self._verification_code.is_verified = True
            self._verification_code.save()
        
        # Tự động tạo profile trống
        if user.role == User.Role.FREELANCER:
            FreelancerProfile.objects.create(user=user, full_name=full_name)
        elif user.role == User.Role.CLIENT:
            CompanyProfile.objects.create(user=user, company_name=full_name if full_name else user.username)
            
        return user

# Class chuyển đổi dữ liệu (Serializer) cho WorkExperience
class WorkExperienceSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()

    class Meta:
        model = WorkExperience
        fields = ['id', 'company', 'position', 'start_date', 'end_date', 'is_current', 'description', 'duration']

    def get_duration(self, obj):
        if not obj.start_date:
            return ""
        start = obj.start_date.strftime("%m/%Y")
        end = "Hiện tại" if obj.is_current or not obj.end_date else obj.end_date.strftime("%m/%Y")
        return f"{start} - {end}"

# Class chuyển đổi dữ liệu (Serializer) cho Education
class EducationSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Education
        fields = ['id', 'school', 'degree', 'field_of_study', 'start_date', 'end_date', 'duration']

    def get_duration(self, obj):
        if not obj.start_date:
            return ""
        start = obj.start_date.strftime("%m/%Y")
        end = obj.end_date.strftime("%m/%Y") if obj.end_date else "Đang học"
        return f"{start} - {end}"

# Class chuyển đổi dữ liệu (Serializer) cho FreelancerProfile
class FreelancerProfileSerializer(serializers.ModelSerializer):
    # Lấy thêm thông tin user cơ bản để hiển thị
    user_info = UserSerializer(source='user', read_only=True)
    # Trường dữ liệu mở rộng (Serializer Field): first_name
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    # Trường dữ liệu mở rộng (Serializer Field): last_name
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)
    
    # Trường dữ liệu mở rộng (Serializer Field): professional_title
    professional_title = serializers.CharField(source='ext_info.professional_title', allow_blank=True, required=False)
    # Trường dữ liệu mở rộng (Serializer Field): hourly_rate
    hourly_rate = serializers.DecimalField(source='ext_info.hourly_rate', max_digits=10, decimal_places=2, allow_null=True, required=False)
    # Trường dữ liệu mở rộng (Serializer Field): location
    location = serializers.CharField(source='ext_info.location', allow_blank=True, required=False)
    
    # Nested fields
    work_experiences = WorkExperienceSerializer(many=True, required=False)
    educations = EducationSerializer(many=True, required=False)
    
    # Trường dữ liệu mở rộng (Serializer Field): skills
    skills = serializers.ListField(
        # Trường dữ liệu mở rộng (Serializer Field): child
        child=serializers.CharField(), write_only=True, required=False
    )
    # Trường dữ liệu mở rộng (Serializer Field): skill_list
    skill_list = serializers.SerializerMethodField()
    saved_interview_question_ids = serializers.SerializerMethodField()
    saved_interview_questions_data = serializers.SerializerMethodField()

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = FreelancerProfile
        fields = [
            'id', 'user', 'user_info', 'full_name', 'avatar', 
            'bio', 'cv_url', 'portfolio_url', 'ai_score', 'ai_summary_report',
            'work_experiences', 'educations', 'first_name', 'last_name',
            'professional_title', 'hourly_rate', 'location', 'skills', 'skill_list',
            'experience_level', 'career_goal', 'xp', 'level', 'learning_roadmap', 'completed_tasks', 'saved_projects', 'interview_prep_data',
            'saved_interview_question_ids', 'saved_interview_questions_data', 'is_pro'
        ]

    # Hàm lấy dữ liệu skill list
    def get_skill_list(self, obj):
        try:
            return [fs.skill.name for fs in obj.skills.all()]
        except Exception:
            return []

    def get_saved_interview_question_ids(self, obj):
        try:
            return list(obj.saved_interview_questions.values_list('question_id', flat=True))
        except Exception:
            return []

    def get_saved_interview_questions_data(self, obj):
        try:
            questions = [sq.question for sq in obj.saved_interview_questions.select_related('question').all()]
            return [{
                'id': q.id,
                'question': q.question_text,
                'type': q.question_type,
                'difficulty': q.difficulty,
                'company_type': q.company_type,
                'category': q.category,
                'key_concepts_or_star': q.key_concepts_or_star
            } for q in questions]
        except Exception as e:
            return []

    def to_representation(self, instance):
        # Gọi phương thức gốc để lấy dữ liệu đã được serialize
        data = super().to_representation(instance)
        
        # Thêm email
        data['email'] = instance.user.email if hasattr(instance, 'user') and instance.user else ""
        
        # Nếu ai_score là 0, tính toán điểm dựa trên độ hoàn thiện hồ sơ
        if data.get('ai_score') == 0:
            score = 0
            if instance.bio: score += 20
            if instance.avatar: score += 10
            
            # Kỹ năng (Max 30)
            skills_count = instance.skills.count()
            score += min(skills_count * 5, 30)
            
            # Kinh nghiệm (Max 25)
            exp_count = instance.work_experiences.count()
            score += min(exp_count * 10, 25)
            
            # Học vấn (Max 15)
            edu_count = instance.educations.count()
            score += min(edu_count * 15, 15)
            
            # Thêm chút bù trừ cố định (dựa trên ID) để các hồ sơ không bị trùng lặp con số
            if score > 0:
                score += (instance.id % 9) + 1
                
            data['ai_score'] = min(score, 100)
            
        return data

    # Hàm cập nhật đối tượng
    def update(self, instance, validated_data):

        raw_email = self.initial_data.get('email')
        if raw_email is not None and hasattr(instance, 'user') and instance.user:
            instance.user.email = raw_email
            instance.user.save()

        # Extract nested data
        ext_info_data = validated_data.pop('ext_info', {})
        work_exp_data = validated_data.pop('work_experiences', None)
        edu_data = validated_data.pop('educations', None)
        skills_data = validated_data.pop('skills', None)
        user_data = validated_data.pop('user', {})

        # 1. Update Ext Info
        if ext_info_data:
            from .models import ExtFreelancerInfo
            ext_info, _ = ExtFreelancerInfo.objects.get_or_create(profile=instance)
            for attr, value in ext_info_data.items():
                setattr(ext_info, attr, value)
            ext_info.save()

        # 2. Update Work Experience (Rewrite approach for simplicity)
        if work_exp_data is not None:
            instance.work_experiences.all().delete()
            for exp in work_exp_data:
                WorkExperience.objects.create(profile=instance, **exp)

        # 3. Update Education
        if edu_data is not None:
            instance.educations.all().delete()
            for edu in edu_data:
                Education.objects.create(profile=instance, **edu)

        # 4. Update Skills
        if skills_data is not None:
            from jobs.models import Skill, FreelancerSkill
            FreelancerSkill.objects.filter(freelancer=instance).delete()
            for skill_name in skills_data:
                if skill_name.strip():
                    skill_obj, _ = Skill.objects.get_or_create(name=skill_name.strip())
                    FreelancerSkill.objects.create(freelancer=instance, skill=skill_obj)

        # 5. Update User
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
            instance.full_name = f"{user.last_name} {user.first_name}".strip()

        return super().update(instance, validated_data)

# Class định nghĩa dữ liệu (Model/Entity) cho CreatableSlugRelatedField
class CreatableSlugRelatedField(serializers.SlugRelatedField):
    # Hàm thực hiện to internal value
    def to_internal_value(self, data):
        try:
            # Thử tìm xem ngành nghề này có trong DB chưa
            return self.get_queryset().get_or_create(**{self.slug_field: data})[0]
        except (TypeError, ValueError):
            self.fail('invalid')

# Class chuyển đổi dữ liệu (Serializer) cho BasicJob
class BasicJobSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Job
        # Liệt kê các trường bạn muốn hiện trên React
        fields = ['id', 'title', 'budget'] 
        # (Lưu ý: Phần skills có thể thêm sau nếu đã set up quan hệ Many-to-Many hoặc qua bảng trung gian JobRequirement)

# Class chuyển đổi dữ liệu (Serializer) cho CompanyProfile
class CompanyProfileSerializer(serializers.ModelSerializer):
    user_info = UserSerializer(source='user', read_only=True)

    industries = CreatableSlugRelatedField(
        many=True,
        slug_field='name',
        queryset=Industry.objects.all(),
        required=False
    )
    
    # Trường dữ liệu mở rộng (Serializer Field): jobs
    jobs = serializers.SerializerMethodField()

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = CompanyProfile
        fields = [
            'id', 'user', 'user_info', 'company_name', 'logo', 
            'industries', 'website', 'description', 
            'slogan', 'phone', 'address', 'founded_year', 'size',
            'facebook', 'linkedin', 'twitter', 'jobs'
        ]

    # Hàm lấy dữ liệu jobs
    def get_jobs(self, obj):
        try:
            user_jobs = Job.objects.filter(client=obj) 
            return BasicJobSerializer(user_jobs, many=True).data
        except Exception as e:
            print(f"Lỗi lấy Job của công ty {obj.company_name}:", e)
            return []

    # Hàm cập nhật đối tượng
    def update(self, instance, validated_data):
        # 1. Lấy danh sách industries mới từ dữ liệu gửi lên
        new_industries = validated_data.pop('industries', None)
        
        # 2. Cập nhật các trường thông thường (tên, website, address...)
        instance = super().update(instance, validated_data)

        # 3. ÉP DJANGO CẬP NHẬT LẠI DANH SÁCH TAGS
        if new_industries is not None:
            # .set() sẽ xóa sạch các liên kết cũ và thay bằng danh sách mới hoàn toàn
            instance.industries.set(new_industries)
            
        return instance

# Class chuyển đổi dữ liệu (Serializer) cho CustomTokenObtainPair
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    # Hàm lấy dữ liệu token
    def get_token(cls, user):
        token = super().get_token(user)

        # Thêm các trường tùy chỉnh vào "payload" (phần dữ liệu mã hóa của token)
        token['role'] = user.role
        token['username'] = user.username

        return token

    # Hàm kiểm tra tính hợp lệ của dữ liệu
    def validate(self, attrs):
        # Hàm này định nghĩa những gì sẽ được trả về trong response JSON (không bị mã hóa)
        data = super().validate(attrs)
        
        data['role'] = self.user.role
        data['user_id'] = self.user.id
        data['username'] = self.user.username
        
        return data