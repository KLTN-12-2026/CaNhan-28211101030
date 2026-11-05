from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Job, Skill, Application, SavedJob
from .serializers import JobSerializer, SkillSerializer, ApplicationSerializer, SavedJobSerializer
from accounts.models import FreelancerProfile
from .services import calculate_and_save_matching_score

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related('client').prefetch_related('required_skills').order_by('-created_at')
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # Tự động gán công ty của người dùng hiện tại vào dự án
        from accounts.models import CompanyProfile
        try:
            company = CompanyProfile.objects.get(user=self.request.user)
            job = serializer.save(client=company)
            
            # Cập nhật embedding cho Job mới tạo
            try:
                from ai_engine.services import update_job_embedding
                update_job_embedding(job)
            except Exception as e:
                print(f"Lỗi cập nhật embedding cho Job: {e}")
                
        except CompanyProfile.DoesNotExist:
            # Nếu user không có profile công ty, ném lỗi rõ ràng hơn
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "Bạn cần cập nhật hồ sơ công ty trước khi đăng tin dự án."})

    def get_queryset(self):
        queryset = Job.objects.select_related('client').prefetch_related('required_skills').order_by('-created_at')
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        client_user_id = self.request.query_params.get('client_user_id')
        if client_user_id:
            queryset = queryset.filter(client__user_id=client_user_id)
        return queryset

    def get_serializer_class(self):
        return JobSerializer

    @action(detail=True, methods=['post'])
    def calculate_match(self, request, pk=None):
        if not getattr(request.user, 'is_email_verified', False):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Bạn phải xác minh email trước khi ứng tuyển!")

        job = self.get_object()
        freelancer_id = request.data.get('freelancer_id')
        cover_letter = request.data.get('cover_letter')
        bid_amount = request.data.get('bid_amount')
        
        try:
            freelancer = FreelancerProfile.objects.get(id=freelancer_id)
            score = calculate_and_save_matching_score(
                job, freelancer, 
                save_application=True,
                cover_letter=cover_letter,
                bid_amount=bid_amount
            )
            return Response({
                'matching_score': score,
                'message': 'Ứng tuyển thành công!'
            }, status=status.HTTP_200_OK)
        except FreelancerProfile.DoesNotExist:
            return Response({'error': 'Freelancer not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def talent_match(self, request, pk=None):
        job = self.get_object()
        freelancers = FreelancerProfile.objects.all()
        results = {}
        for f in freelancers:
            # We don't save application here, just calculate
            score = calculate_and_save_matching_score(job, f, save_application=False)
            results[f.id] = score
        return Response(results, status=status.HTTP_200_OK)

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related('job', 'job__client', 'freelancer').all()
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if not getattr(self.request.user, 'is_email_verified', False):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Bạn phải xác minh email trước khi ứng tuyển!")
        serializer.save()

    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.select_related('job', 'job__client', 'freelancer').all()
        
        # Bảo mật: Chỉ cho phép xem đơn ứng tuyển của chính mình (hoặc công việc của mình)
        if user.is_authenticated:
            if user.role == 'FREELANCER':
                queryset = queryset.filter(freelancer__user=user)
            elif user.role == 'CLIENT':
                queryset = queryset.filter(job__client__user=user)
        
        freelancer_id = self.request.query_params.get('freelancer_id')
        if freelancer_id:
            queryset = queryset.filter(freelancer_id=freelancer_id)
            
        freelancer_user_id = self.request.query_params.get('freelancer_user_id')
        if freelancer_user_id:
            queryset = queryset.filter(freelancer__user_id=freelancer_user_id)
            
        client_user_id = self.request.query_params.get('client_user_id')
        if client_user_id:
            queryset = queryset.filter(job__client__user_id=client_user_id)
            
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['Pending', 'Interviewing', 'Hired', 'Rejected', 'Accepted']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Robust permission check
        try:
            # Get the company profile associated with the user
            company = getattr(request.user, 'company_profile', None)
            if not company or application.job.client != company:
                return Response({'error': 'You do not have permission to update this application status.'}, 
                                status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({'error': f'Permission check failed: {str(e)}'}, status=status.HTTP_403_FORBIDDEN)

        application.status = new_status
        application.save()
        
        from notifications.models import Notification
        
        if new_status == 'Interviewing' or new_status == 'Accepted':
            Notification.objects.create(
                user=application.freelancer.user,
                notification_type='application',
                title="Yêu cầu trao đổi công việc",
                message=f"Nhà tuyển dụng muốn trao đổi thêm về công việc '{application.job.title}'. Vui lòng kiểm tra mục Message."
            )
        elif new_status == 'Hired':
            Notification.objects.create(
                user=application.freelancer.user,
                notification_type='application',
                title="Ứng tuyển thành công",
                message=f"Chúc mừng! Bạn đã chính thức được nhận cho công việc '{application.job.title}'."
            )
        elif new_status == 'Rejected':
            Notification.objects.create(
                user=application.freelancer.user,
                notification_type='application',
                title="Ứng tuyển bị từ chối",
                message=f"Rất tiếc, ứng tuyển của bạn cho công việc '{application.job.title}' đã bị từ chối."
            )
        elif new_status == 'Pending':
            # Khi hoàn tác (chuyển về Pending), xoá các thông báo liên quan đến thay đổi trạng thái trước đó
            Notification.objects.filter(
                user=application.freelancer.user,
                notification_type='application',
                message__contains=application.job.title
            ).delete()
        
        return Response({'status': 'updated', 'new_status': new_status}, status=status.HTTP_200_OK)

class SavedJobViewSet(viewsets.ModelViewSet):
    queryset = SavedJob.objects.select_related('job', 'job__client', 'freelancer').all()
    serializer_class = SavedJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SavedJob.objects.select_related('job', 'job__client', 'freelancer').all()
        freelancer_id = self.request.query_params.get('freelancer_id')
        if freelancer_id:
            queryset = queryset.filter(freelancer_id=freelancer_id)
        return queryset
