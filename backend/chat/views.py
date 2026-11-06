from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Max, Count
from .models import ChatMessage
from .serializers import ChatMessageSerializer, ConversationSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

# Class xử lý API (View) cho ChatMessageViewSet
class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Chống double message do double-click hoặc lỗi mạng gửi trùng lặp
        receiver_id = request.data.get('receiver')
        content = request.data.get('content', '')
        is_offer = request.data.get('is_offer') == 'true' or request.data.get('is_offer') is True
        is_submission = request.data.get('is_submission') == 'true' or request.data.get('is_submission') is True
        
        if not is_offer and not is_submission and 'file' not in request.FILES and 'image' not in request.FILES and content:
            from django.utils import timezone
            from datetime import timedelta
            recent_threshold = timezone.now() - timedelta(seconds=1.5)
            duplicate = ChatMessage.objects.filter(
                sender=request.user,
                receiver_id=receiver_id,
                content=content,
                created_at__gte=recent_threshold
            ).order_by('-created_at').first()
            if duplicate:
                serializer = self.get_serializer(duplicate)
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    # Hàm thực hiện lưu đối tượng mới vào database
    def perform_create(self, serializer):
        req_data = self.request.data
        is_offer = req_data.get('is_offer') == 'true' or req_data.get('is_offer') is True
        offer_details = req_data.get('offer_details', None)
        application_id = req_data.get('application_id', None)
        
        is_submission = req_data.get('is_submission') == 'true' or req_data.get('is_submission') is True
        submission_details = req_data.get('submission_details', None)

        # Parse JSON if needed
        import json
        if isinstance(offer_details, str):
            try:
                offer_details = json.loads(offer_details)
            except:
                offer_details = None

        if isinstance(submission_details, str):
            try:
                submission_details = json.loads(submission_details)
            except:
                submission_details = None

        message = serializer.save(
            sender=self.request.user,
            is_offer=is_offer,
            offer_details=offer_details,
            application_id=application_id,
            offer_status='pending' if is_offer else 'pending',
            is_submission=is_submission,
            submission_details=submission_details
        )

        if is_submission and message.receiver:
            from notifications.models import Notification
            app_title = "một dự án"
            if message.application and message.application.job:
                app_title = message.application.job.title
            Notification.objects.create(
                user=message.receiver,
                notification_type='system',
                title="Báo cáo hoàn thành công việc",
                message=f"Freelancer {self.request.user.username} đã nộp sản phẩm cho {app_title}."
            )

    # Hàm lấy danh sách đối tượng từ database
    def get_queryset(self):
        user = self.request.user
        other_user_id = self.request.query_params.get('other_user_id')
        if other_user_id:
            return ChatMessage.objects.filter(
                (Q(sender=user) & Q(receiver_id=other_user_id)) |
                (Q(sender_id=other_user_id) & Q(receiver=user))
            ).order_by('created_at')
        return ChatMessage.objects.filter(Q(sender=user) | Q(receiver=user))

    @action(detail=False, methods=['get'])
    # Hàm thực hiện conversations
    def conversations(self, request):
        user = request.user
        
        # 1. Lấy danh sách các đối tác đã từng nhắn tin (sender hoặc receiver)
        # Tối ưu: Dùng Union và distinct để lấy tập ID trong 1 lần query
        user_ids = ChatMessage.objects.filter(sender=user).values_list('receiver', flat=True).union(
            ChatMessage.objects.filter(receiver=user).values_list('sender', flat=True)
        )
        
        # 2. Lấy thông tin User của đối tác trong 1 lần query (Bulk fetch)
        # Sử dụng select_related để lấy luôn profile nhằm tối ưu N+1
        other_users = User.objects.filter(id__in=user_ids).select_related('company_profile', 'freelancer_profile')
        user_map = {u.id: u for u in other_users}

        # 3. Lấy tin nhắn cuối cùng và số tin chưa đọc cho từng đối tác
        # Để tối ưu triệt để (O(1) query) có thể dùng Window functions, 
        # nhưng ở đây dùng logic gom nhóm cũng đã giảm đáng kể N+1.
        results = []
        for uid in user_ids:
            other_user = user_map.get(uid)
            if not other_user: continue

            last_msg = ChatMessage.objects.filter(
                (Q(sender=user) & Q(receiver_id=uid)) |
                (Q(sender_id=uid) & Q(receiver=user))
            ).order_by('-created_at').first()
            
            unread_count = ChatMessage.objects.filter(
                sender_id=uid, receiver=user, is_read=False
            ).count()
            
            # Xác định tên hiển thị và ảnh đại diện dựa trên Role
            display_name = other_user.username
            avatar_url = None
            
            if other_user.role == User.Role.CLIENT and hasattr(other_user, 'company_profile'):
                display_name = other_user.company_profile.company_name
                if other_user.company_profile.logo:
                    avatar_url = request.build_absolute_uri(other_user.company_profile.logo.url)
            elif other_user.role == User.Role.FREELANCER and hasattr(other_user, 'freelancer_profile'):
                display_name = other_user.freelancer_profile.full_name
                if other_user.freelancer_profile.avatar:
                    avatar_url = request.build_absolute_uri(other_user.freelancer_profile.avatar.url)

            results.append({
                'other_user_id': uid,
                'other_user_name': display_name,
                'other_user_avatar': avatar_url,
                'last_message': last_msg.content if last_msg else "",
                'timestamp': last_msg.created_at if last_msg else None,
                'unread_count': unread_count
            })
            
        # Sắp xếp theo tin nhắn mới nhất
        results.sort(key=lambda x: x['timestamp'] if x['timestamp'] else '', reverse=True)
        
        return Response(results)

    @action(detail=False, methods=['post'])
    # Hàm thực hiện mark as read
    def mark_as_read(self, request):
        other_user_id = request.data.get('other_user_id')
        if not other_user_id:
            return Response({"error": "Missing other_user_id"}, status=status.HTTP_400_BAD_REQUEST)
            
        ChatMessage.objects.filter(
            sender_id=other_user_id,
            receiver=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({"status": "success"})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = ChatMessage.objects.filter(receiver=request.user, is_read=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=['post'])
    def respond_offer(self, request, pk=None):
        message = self.get_object()
        
        # Security check: Only receiver (freelancer) can respond to offer
        if message.receiver != request.user:
            return Response({"error": "You are not authorized to respond to this offer."}, status=status.HTTP_403_FORBIDDEN)
            
        if not message.is_offer or message.offer_status != 'pending':
            return Response({"error": "Invalid offer or already responded."}, status=status.HTTP_400_BAD_REQUEST)
            
        action = request.data.get('action') # 'accepted' or 'rejected'
        if action not in ['accepted', 'rejected']:
            return Response({"error": "Invalid action. Must be 'accepted' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)
            
        message.offer_status = action
        message.save()
        
        # Automatically send a system message from the freelancer back to the client
        system_text = "Ứng viên đã chấp nhận Offer" if action == 'accepted' else "Ứng viên đã từ chối Offer"
        ChatMessage.objects.create(
            sender=request.user,
            receiver=message.sender,
            content=system_text,
            is_read=False
        )
        
        # If accepted, update Application status
        if action == 'accepted' and message.application:
            app = message.application
            app.status = 'Hired'
            app.save()
            
            # Update job status
            job = app.job
            job.status = 'In Progress'
            job.is_active = False
            job.save()
            
            # Send notification
            from notifications.models import Notification
            Notification.objects.create(
                user=app.freelancer.user,
                notification_type='application',
                title="Ứng tuyển thành công",
                message=f"Chúc mừng! Bạn đã chính thức được nhận cho công việc '{app.job.title}'."
            )
            
        return Response(ChatMessageSerializer(message).data)

    @action(detail=True, methods=['post'])
    def respond_submission(self, request, pk=None):
        message = self.get_object()
        
        # Security checks
        if not message.is_submission:
            return Response({"error": "This message is not a submission."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user != message.receiver:
            return Response({"error": "You are not authorized to respond to this submission."}, status=status.HTTP_403_FORBIDDEN)
        if message.submission_status != 'pending':
            return Response({"error": "This submission has already been responded to."}, status=status.HTTP_400_BAD_REQUEST)
            
        action = request.data.get('action')
        if action not in ['approved', 'rejected']:
            return Response({"error": "Invalid action. Must be 'approved' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)
            
        message.submission_status = action
        message.save()
        
        # System message for notification in chat
        system_text = f"Khách hàng đã {'duyệt sản phẩm và đóng dự án' if action == 'approved' else 'yêu cầu sửa đổi sản phẩm'}."
        ChatMessage.objects.create(
            sender=request.user,
            receiver=message.sender,
            content=system_text,
            is_read=False
        )
        
        # Notification to freelancer
        from notifications.models import Notification
        Notification.objects.create(
            user=message.sender,
            notification_type='job' if action == 'approved' else 'message',
            title="Kết quả nộp sản phẩm" if action == 'approved' else "Yêu cầu sửa đổi",
            message=system_text
        )
        
        # If approved, update Application and Job status
        if action == 'approved' and message.application:
            app = message.application
            app.status = 'Completed'
            app.save()
            
            job = app.job
            job.status = 'Completed'
            job.save()

            # Tự động giải phóng tiền ký quỹ Escrow nếu có
            try:
                from payments.models import Escrow, Wallet, Transaction
                from django.utils import timezone
                from decimal import Decimal
                escrow = Escrow.objects.filter(job=job, status=Escrow.Status.LOCKED).first()
                if escrow:
                    freelancer_user = app.freelancer.user
                    freelancer_wallet, _ = Wallet.objects.get_or_create(user=freelancer_user)
                    client_wallet, _ = Wallet.objects.get_or_create(user=request.user)

                    platform_fee = Decimal(str(escrow.amount)) * Decimal('0.10')
                    payout_amount = Decimal(str(escrow.amount)) - platform_fee

                    client_wallet.escrow_balance = max(Decimal('0'), client_wallet.escrow_balance - Decimal(str(escrow.amount)))
                    client_wallet.save()

                    freelancer_wallet.balance += payout_amount
                    freelancer_wallet.save()

                    escrow.status = Escrow.Status.RELEASED
                    escrow.freelancer = freelancer_user
                    escrow.released_at = timezone.now()
                    escrow.save()

                    Transaction.objects.create(
                        wallet=freelancer_wallet,
                        amount=payout_amount,
                        transaction_type=Transaction.TransactionType.ESCROW_RELEASE,
                        status=Transaction.Status.COMPLETED,
                        description=f"Thanh toán hoàn thành dự án: {job.title} (Khấu trừ 10% phí sàn)"
                    )
            except Exception as e:
                print("Escrow auto-release error:", e)
            
        return Response(ChatMessageSerializer(message).data)
