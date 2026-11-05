from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from .models import FreelancerProfile, CompanyProfile, User, EmailVerificationCode
from .serializers import FreelancerProfileSerializer, CompanyProfileSerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from .permissions import IsOwnerOrReadOnly
from .email_utils import send_otp_email

# Import các hàm AI từ service
from ai_engine.services import process_cv_with_ai, generate_bio_with_ai, suggest_skills_with_ai, extract_full_cv_for_autofill 
import requests
import uuid
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
import random

# Class xử lý API (View) cho GoogleLoginView
class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    # Hàm thực hiện post
    def post(self, request):
        token = request.data.get('token')
        role_param = request.data.get('role', 'FREELANCER')  # fallback if missing
        action = request.data.get('action', 'login') # 'register' hoặc 'login'
        
        if not token:
            return Response({'error': 'No token provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Hỗ trợ chế độ giả lập Dev/Mock nếu chưa cấu hình Google Cloud
            is_mock_request = (
                str(token).startswith('mock-') or 
                str(token).startswith('dev-') or 
                request.data.get('is_mock') is True
            )

            if is_mock_request:
                email = request.data.get('email', 'phin09261@gmail.com').strip().lower()
                full_name = request.data.get('name', '').strip()
                if not full_name:
                    full_name = email.split('@')[0].replace('.', ' ').title()
            else:
                # Gọi API Google UserInfo bằng requests (tin cậy hơn urllib)
                response = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10
                )
                
                if not response.ok:
                    error_detail = response.json() if response.content else "No response body"
                    print(f"--- GOOGLE AUTH ERROR: {response.status_code} ---")
                    print(error_detail)
                    return Response({
                        'error': 'Xác thực với Google thất bại.',
                        'detail': error_detail
                    }, status=status.HTTP_401_UNAUTHORIZED)
                    
                user_info = response.json()
                email = user_info.get('email')
                full_name = user_info.get('name', '')
                
                if not email:
                    return Response({'error': 'Không thể lấy email từ Google.'}, status=status.HTTP_400_BAD_REQUEST)
                
                email = email.lower()

            # Kiểm tra xem user có tồn tại bằng email này chưa
            user = User.objects.filter(email__iexact=email).first()

            if not user:
                # Tạo user mới (Tự động đăng ký)
                base_username = email.split('@')[0]
                random_suffix = str(uuid.uuid4())[:6]
                username = f"{base_username}_{random_suffix}"
                
                role_upper = role_param.upper()
                if role_upper not in [User.Role.FREELANCER, User.Role.CLIENT]:
                    role_upper = User.Role.FREELANCER
                    
                user = User.objects.create(
                    username=username,
                    email=email,
                    role=role_upper,
                    is_email_verified=True
                )
                user.set_unusable_password()
                user.save()
                
                if role_upper == User.Role.FREELANCER:
                    FreelancerProfile.objects.create(user=user, full_name=full_name)
                elif role_upper == User.Role.CLIENT:
                    CompanyProfile.objects.create(user=user, company_name=full_name)
            else:
                # User đã tồn tại (Tự động đăng nhập)
                if not user.is_email_verified:
                    user.is_email_verified = True
                    user.save(update_fields=['is_email_verified'])

                # Kiểm tra vai trò của người dùng có khớp với vai trò đang chọn không
                role_upper = role_param.upper()
                if user.role != role_upper:
                    actual_role = "Freelancer" if user.role == "FREELANCER" else "Client"
                    return Response({
                        'error': f'Email này đã được liên kết với vai trò {actual_role}. Vui lòng chọn đúng vai trò để tiếp tục.'
                    }, status=status.HTTP_403_FORBIDDEN)

            # Tạo JWT Token
            refresh = RefreshToken.for_user(user)

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            return Response({'error': f'Lỗi kết nối tới Google: {str(e)}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Class xử lý API (View) cho FreelancerProfileViewSet
class FreelancerProfileViewSet(viewsets.ModelViewSet):
    queryset = FreelancerProfile.objects.select_related('user', 'ext_info').prefetch_related('work_experiences', 'educations', 'skills__skill').all()
    serializer_class = FreelancerProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        profile = FreelancerProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    # API Custom: /api/freelancers/{id}/extract_cv/
    @action(detail=True, methods=['post'])
    # Hàm thực hiện extract cv
    def extract_cv(self, request, pk=None):
        profile = self.get_object()
        
        # Kiểm tra quyền: Chỉ chủ sở hữu mới được extract CV của chính mình
        if profile.user != request.user:
            return Response({"error": "Bạn không có quyền thực hiện hành động này."}, status=status.HTTP_403_FORBIDDEN)
        
        if not profile.cv_url:
            return Response({"error": "Chưa có CV để phân tích"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Lấy đường dẫn vật lý thực tế của file PDF trên máy
            cv_absolute_path = profile.cv_url.path
            
            # Gọi hàm xử lý AI và chờ kết quả
            ai_result = process_cv_with_ai(profile.id, cv_absolute_path)
            
            if ai_result.get("status") == "success":
                return Response(ai_result, status=status.HTTP_200_OK)
            else:
                return Response(ai_result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # API mới cho button extract CV toàn diện - Auto-fill Profile
    @action(detail=True, methods=['post'])
    def autofill_cv(self, request, pk=None):
        profile = self.get_object()
        
        if profile.user != request.user:
            return Response({"error": "Bạn không có quyền thực hiện hành động này."}, status=status.HTTP_403_FORBIDDEN)
            
        if not profile.cv_url:
            return Response({"error": "Chưa có CV để tự động điền."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            cv_absolute_path = profile.cv_url.path
            
            # Gọi hàm AI mới tạo
            ai_result = extract_full_cv_for_autofill(cv_absolute_path)
            
            if ai_result.get("status") == "success":
                return Response(ai_result, status=status.HTTP_200_OK)
            else:
                return Response(ai_result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    # Hàm thực hiện generate bio
    def generate_bio(self, request, pk=None):
        profile = self.get_object()
        if profile.user != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        result = generate_bio_with_ai(profile)
        if result.get("status") == "success":
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    # Hàm thực hiện suggest skills
    def suggest_skills(self, request, pk=None):
        profile = self.get_object()
        if profile.user != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        result = suggest_skills_with_ai(profile)
        if result.get("status") == "success":
            return Response(result, status=status.HTTP_200_OK)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class CompanyProfileViewSet(viewsets.ModelViewSet):
    queryset = CompanyProfile.objects.select_related('user').prefetch_related('industries', 'jobs').all()
    serializer_class = CompanyProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        profile = CompanyProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({"error": "Company profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
# Class xử lý API (View) cho CustomTokenObtainPairView
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Class xử lý API (View) cho RegisterView
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"error": "Vui lòng cung cấp đầy đủ mật khẩu cũ và mới."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Mật khẩu cũ không chính xác."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user.set_password(new_password)
            user.save()
            return Response({"message": "Đổi mật khẩu thành công!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SendRegisterOTPView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Vui lòng nhập địa chỉ email."}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra định dạng email
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return Response({"error": "Địa chỉ email không đúng định dạng."}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra email đã được đăng ký trước đó chưa
        if User.objects.filter(email__iexact=email).exists():
            return Response({
                "error": "Email này đã được sử dụng. Vui lòng đăng nhập hoặc sử dụng email khác."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Chống spam: Giới hạn gửi lại sau 60 giây
        from django.utils import timezone
        from datetime import timedelta
        recent_code = EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.REGISTER
        ).order_by('-created_at').first()

        if recent_code and (timezone.now() - recent_code.created_at).total_seconds() < 60:
            remaining = int(60 - (timezone.now() - recent_code.created_at).total_seconds())
            return Response({
                "error": f"Vui lòng đợi {remaining} giây trước khi yêu cầu gửi lại mã xác thực."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Tạo mã OTP ngẫu nhiên 6 chữ số
        otp = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        # Hủy các mã đăng ký chưa xác thực cũ của email này
        EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.REGISTER,
            is_verified=False
        ).delete()

        EmailVerificationCode.objects.create(
            email=email,
            code=otp,
            purpose=EmailVerificationCode.Purpose.REGISTER,
            expires_at=expires_at
        )

        # Gửi email xác thực
        success, err_msg, is_dev = send_otp_email(
            to_email=email,
            otp_code=otp,
            purpose=EmailVerificationCode.Purpose.REGISTER
        )

        if not success:
            return Response({"error": f"Không thể gửi email qua Gmail: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if is_dev:
            return Response({
                "message": f"Mã xác thực: {otp} (Đang chạy Dev Mode do chưa cấu hình SMTP Gmail trong backend/.env)",
                "dev_otp": otp
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Mã xác thực gồm 6 số đã được gửi đến hộp thư Gmail của bạn. Vui lòng kiểm tra hộp thư đến (và mục Thư rác/Spam nếu cần)."
        }, status=status.HTTP_200_OK)


class SendVerificationOTPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        target_email = request.data.get('email', '').strip().lower() or user.email
        if not target_email:
            return Response({"error": "Vui lòng cung cấp địa chỉ email hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        # Nếu là email hiện tại và đã xác thực rồi
        if target_email == user.email and user.is_email_verified:
            return Response({"error": "Email này đã được xác thực trước đó."}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra nếu đổi sang email mới thì email mới đã bị ai đăng ký chưa
        if target_email != user.email and User.objects.filter(email__iexact=target_email).exclude(id=user.id).exists():
            return Response({"error": "Email này đã được sử dụng bởi một tài khoản khác."}, status=status.HTTP_400_BAD_REQUEST)

        email = target_email

        # Chống spam: Giới hạn gửi lại sau 60 giây
        from django.utils import timezone
        from datetime import timedelta
        recent_code = EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.PROFILE_VERIFY
        ).order_by('-created_at').first()

        if recent_code and (timezone.now() - recent_code.created_at).total_seconds() < 60:
            remaining = int(60 - (timezone.now() - recent_code.created_at).total_seconds())
            return Response({
                "error": f"Vui lòng đợi {remaining} giây trước khi gửi lại mã OTP."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate 6-digit OTP
        otp = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        user.email_verification_otp = otp
        user.save(update_fields=['email_verification_otp'])

        EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.PROFILE_VERIFY,
            is_verified=False
        ).delete()

        EmailVerificationCode.objects.create(
            email=email,
            code=otp,
            purpose=EmailVerificationCode.Purpose.PROFILE_VERIFY,
            expires_at=expires_at
        )

        success, err_msg, is_dev = send_otp_email(
            to_email=email,
            otp_code=otp,
            purpose=EmailVerificationCode.Purpose.PROFILE_VERIFY
        )

        if not success:
            return Response({"error": f"Không thể gửi email: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if is_dev:
            return Response({
                "message": f"Mã xác thực: {otp} (Đang chạy Dev Mode)",
                "dev_otp": otp
            }, status=status.HTTP_200_OK)

        return Response({"message": f"Mã xác thực đã được gửi đến email {email}."}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        otp_input = request.data.get('otp')
        target_email = request.data.get('email', '').strip().lower() or user.email

        if not otp_input:
            return Response({"error": "Vui lòng nhập mã OTP."}, status=status.HTTP_400_BAD_REQUEST)

        otp_str = str(otp_input).strip()
        from django.utils import timezone
        code_record = EmailVerificationCode.objects.filter(
            email__iexact=target_email,
            code=otp_str,
            purpose=EmailVerificationCode.Purpose.PROFILE_VERIFY,
            is_verified=False,
            expires_at__gte=timezone.now()
        ).first()

        if not code_record and user.email_verification_otp != otp_str:
            return Response({"error": "Mã xác thực không hợp lệ hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)
        
        if code_record:
            code_record.is_verified = True
            code_record.save()

        # Cập nhật email và trạng thái xác thực
        user.email = target_email
        user.is_email_verified = True
        user.email_verification_otp = None
        user.save()
        return Response({
            "message": "Xác thực email thành công!",
            "email": user.email,
            "is_email_verified": True
        }, status=status.HTTP_200_OK)


class SendResetPasswordOTPView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Vui lòng nhập địa chỉ email."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "Không tìm thấy tài khoản liên kết với địa chỉ email này."}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        from datetime import timedelta
        recent_code = EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.RESET_PASSWORD
        ).order_by('-created_at').first()

        if recent_code and (timezone.now() - recent_code.created_at).total_seconds() < 60:
            remaining = int(60 - (timezone.now() - recent_code.created_at).total_seconds())
            return Response({
                "error": f"Vui lòng đợi {remaining} giây trước khi yêu cầu gửi lại mã xác thực."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        otp = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        EmailVerificationCode.objects.filter(
            email__iexact=email,
            purpose=EmailVerificationCode.Purpose.RESET_PASSWORD,
            is_verified=False
        ).delete()

        EmailVerificationCode.objects.create(
            email=email,
            code=otp,
            purpose=EmailVerificationCode.Purpose.RESET_PASSWORD,
            expires_at=expires_at
        )

        success, err_msg, is_dev = send_otp_email(
            to_email=email,
            otp_code=otp,
            purpose=EmailVerificationCode.Purpose.RESET_PASSWORD
        )

        if not success:
            return Response({"error": f"Không thể gửi email: {err_msg}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if is_dev:
            return Response({
                "message": f"Mã xác thực: {otp} (Đang chạy Dev Mode)",
                "dev_otp": otp
            }, status=status.HTTP_200_OK)

        return Response({
            "message": "Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')

        if not email or not otp or not new_password:
            return Response({"error": "Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "Mật khẩu mới phải có ít nhất 6 ký tự."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "Người dùng không tồn tại."}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        code_record = EmailVerificationCode.objects.filter(
            email__iexact=email,
            code=otp,
            purpose=EmailVerificationCode.Purpose.RESET_PASSWORD,
            is_verified=False,
            expires_at__gte=timezone.now()
        ).first()

        if not code_record:
            return Response({"error": "Mã xác thực OTP không chính xác hoặc đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        code_record.is_verified = True
        code_record.save()

        user.set_password(new_password)
        user.save()

        return Response({"message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay."}, status=status.HTTP_200_OK)
