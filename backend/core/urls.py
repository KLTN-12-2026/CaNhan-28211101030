"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.views import FreelancerProfileViewSet, CompanyProfileViewSet
from jobs.views import SkillViewSet, JobViewSet, ApplicationViewSet, SavedJobViewSet
from ai_engine.views import (
    AIAnalysisViewSet, ChatWithAIView, AnalyzeCVView, GenerateQuizView, 
    GenerateMiniProjectView, GenerateInterviewPrepView, SaveInterviewQuestionView, 
    ReviewInterviewAnswerView, PracticeHistoryView, SemanticMatchJobsView,
    VerifyQuizSubmissionView, RecommendedOpportunitiesView, RegenerateRoadmapView
)
from notifications.views import NotificationViewSet, AIChatHistoryViewSet
from interactions.views import ReviewViewSet
from chat.views import ChatMessageViewSet

from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import (
    CustomTokenObtainPairView, RegisterView, GoogleLoginView, 
    ChangePasswordView, SendVerificationOTPView, VerifyEmailView,
    SendRegisterOTPView, SendResetPasswordOTPView, ResetPasswordView
)
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()

# Đăng ký routes cho Accounts
router.register(r'freelancers', FreelancerProfileViewSet, basename='freelancer')
router.register(r'companies', CompanyProfileViewSet, basename='company')

# Đăng ký routes cho Jobs
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'applications', ApplicationViewSet, basename='application')
router.register(r'saved-jobs', SavedJobViewSet, basename='saved-job')

# Đăng ký routes cho AI & Notifications
router.register(r'ai-analysis', AIAnalysisViewSet, basename='ai-analysis')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'chat-history', AIChatHistoryViewSet, basename='chat-history')
# Đăng ký routes cho Interactions & Chat
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'messages', ChatMessageViewSet, basename='message')

from django.views.generic import RedirectView

urlpatterns = [
    path('', RedirectView.as_view(url='/api/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/ai-chat/', ChatWithAIView.as_view(), name='chat_with_ai'),
    path('api/ai-analyze-cv/', AnalyzeCVView.as_view(), name='ai_analyze_cv'),
    path('api/ai-engine/generate-quiz/', GenerateQuizView.as_view(), name='ai_generate_quiz'),
    path('api/ai-engine/verify-quiz-submission/', VerifyQuizSubmissionView.as_view(), name='ai_verify_quiz_submission'),
    path('api/ai-engine/recommended-opportunities/', RecommendedOpportunitiesView.as_view(), name='ai_recommended_opportunities'),
    path('api/ai-engine/regenerate-roadmap/', RegenerateRoadmapView.as_view(), name='ai_regenerate_roadmap'),
    path('api/ai-engine/generate-project/', GenerateMiniProjectView.as_view(), name='ai_generate_project'),
    path('api/ai-engine/generate-interview/', GenerateInterviewPrepView.as_view(), name='ai_generate_interview'),
    path('api/ai-engine/save-interview-question/', SaveInterviewQuestionView.as_view(), name='ai_save_interview_question'),
    path('api/ai-engine/review-answer/', ReviewInterviewAnswerView.as_view(), name='ai_review_answer'),
    path('api/ai-engine/practice-history/', PracticeHistoryView.as_view(), name='ai_practice_history'),
    path('api/ai-engine/match-jobs/', SemanticMatchJobsView.as_view(), name='ai_match_jobs'),
    
    # --- CÁC API XÁC THỰC JWT ---
    # Gửi OTP xác thực trước khi đăng ký
    path('api/auth/send-register-otp/', SendRegisterOTPView.as_view(), name='send_register_otp'),
    # Đăng ký (Tạo tài khoản mới cùng mã OTP)
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    # Đăng nhập (Truyền email/username và password vào đây)
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Đăng nhập với Google
    path('api/auth/google/', GoogleLoginView.as_view(), name='auth_google'),
    # Làm mới token (Truyền refresh token vào đây khi access token hết hạn)
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Đổi mật khẩu
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    # Quên mật khẩu
    path('api/auth/send-reset-password-otp/', SendResetPasswordOTPView.as_view(), name='send_reset_password_otp'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    # Xác thực Email
    path('api/accounts/send-verification-otp/', SendVerificationOTPView.as_view(), name='send_verification_otp'),
    path('api/accounts/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/payments/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
