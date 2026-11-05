import stripe
import requests
import time
import json
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response
from .models import Wallet, Transaction, Escrow
from .serializers import WalletSerializer, TransactionSerializer, EscrowSerializer
from .momo_utils import create_momo_payment, verify_momo_signature, query_momo_payment
from jobs.models import Job

stripe.api_key = settings.STRIPE_SECRET_KEY
webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

# Class xử lý API (View) cho WalletDetailView
class WalletDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện get
    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = WalletSerializer(wallet)
        return Response(serializer.data)

# Class xử lý API (View) cho DepositView
class DepositView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        amount = request.data.get('amount')
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        with transaction.atomic():
            wallet.balance += Decimal(str(amount))
            wallet.save()

            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type=Transaction.TransactionType.DEPOSIT,
                status=Transaction.Status.COMPLETED,
                description=f"Nạp tiền vào ví: {int(float(amount)):,} VNĐ"
            )

        return Response({'message': f'Nạp thành công {int(float(amount)):,} VNĐ', 'balance': wallet.balance})

# Class xử lý API (View) cho CreatePaymentIntentView
class CreatePaymentIntentView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        amount = request.data.get('amount')
        if not amount or float(amount) <= 0:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create a PaymentIntent with the order amount and currency
            intent = stripe.PaymentIntent.create(
                amount=int(float(amount) * 100), # Stripe expects cents
                currency='usd',
                automatic_payment_methods={'enabled': True},
                metadata={
                    'user_id': request.user.id,
                    'type': 'deposit'
                }
            )
            return Response({'clientSecret': intent.client_secret})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Class xử lý API (View) cho StripeWebhookView
class StripeWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny] # Stripe needs to call this without auth

    # Hàm thực hiện post
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError as e:
            return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            user_id = payment_intent['metadata'].get('user_id')
            amount = payment_intent['amount'] / 100.0

            if user_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    user = User.objects.get(id=user_id)
                    wallet, _ = Wallet.objects.get_or_create(user=user)
                    
                    with transaction.atomic():
                        wallet.balance += Decimal(str(amount))
                        wallet.save()

                        Transaction.objects.create(
                            wallet=wallet,
                            amount=amount,
                            transaction_type=Transaction.TransactionType.DEPOSIT,
                            status=Transaction.Status.COMPLETED,
                            description=f"Stripe Deposit: {payment_intent['id']}"
                        )
                except User.DoesNotExist:
                    pass

        return Response({'status': 'success'})

# Class xử lý API (View) cho MoMoCreatePaymentView
class MoMoCreatePaymentView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        amount = request.data.get('amount')
        order_info = request.data.get('order_info', 'Nạp tiền vào ví FreelanceAI')
        payment_type = request.data.get('payment_type', 'DEPOSIT')
        
        if not amount or int(amount) < 1000:
            return Response({'error': 'Số tiền tối thiểu là 1,000đ'}, status=status.HTTP_400_BAD_REQUEST)

        # Đảm bảo mã đơn hàng luôn là duy nhất tuyệt đối (tránh lỗi duplicate orderId)
        order_id = f"PAY_{request.user.id}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        
        # Define URLs
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        backend_url = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000')
        return_url = f"{frontend_url}/wallet?status=success"
        notify_url = f"{backend_url}/api/payments/momo-ipn/"

        response = create_momo_payment(amount, order_id, order_info, return_url, notify_url)
        
        if response.get('resultCode') == 0:
            tx_type = Transaction.TransactionType.PRO_UPGRADE if payment_type == 'PRO_UPGRADE' else Transaction.TransactionType.DEPOSIT
            wallet, _ = Wallet.objects.get_or_create(user=request.user)
            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type=tx_type,
                status=Transaction.Status.PENDING,
                order_id=order_id,
                description=order_info
            )
            response['orderId'] = order_id
            return Response(response)
        else:
            return Response({'error': response.get('message', 'MoMo API Error')}, status=status.HTTP_400_BAD_REQUEST)

# Class xử lý API (View) cho MoMoIPNView
class MoMoIPNView(views.APIView):
    permission_classes = [permissions.AllowAny]

    # Hàm thực hiện post
    def post(self, request):
        payload = request.body.decode('utf-8')
        try:
            data = json.loads(payload)
        except:
            return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)
            
        secret_key = getattr(settings, 'MOMO_SECRET_KEY', '')

        # 1. Verify Signature using original fields
        if not verify_momo_signature(data.copy(), secret_key):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        order_id = data.get('orderId')
        result_code = data.get('resultCode')
        amount = data.get('amount')

        # 2. Check Idempotency & Process with Row-level locking
        try:
            with transaction.atomic():
                tx = Transaction.objects.select_for_update().get(order_id=order_id)
                
                if tx.status == Transaction.Status.COMPLETED:
                    return Response(status=status.HTTP_204_NO_CONTENT)

                if result_code == 0:
                    tx.status = Transaction.Status.COMPLETED
                    if tx.transaction_type == Transaction.TransactionType.PRO_UPGRADE:
                        profile = getattr(tx.wallet.user, 'freelancer_profile', None)
                        if profile:
                            profile.is_pro = True
                            profile.save()
                    else:
                        tx.wallet.balance += Decimal(str(amount))
                        tx.wallet.save()
                    tx.save()
                else:
                    tx.status = Transaction.Status.FAILED
                    tx.save()
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)

# Class xử lý kiểm tra trạng thái thanh toán MoMo (Polling từ MoMo Query API)
class MoMoCheckStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện get
    def get(self, request):
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response({'error': 'Thiếu tham số order_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tx = Transaction.objects.select_related('wallet__user').get(order_id=order_id, wallet__user=request.user)
        except Transaction.DoesNotExist:
            return Response({'error': 'Không tìm thấy giao dịch tương ứng'}, status=status.HTTP_404_NOT_FOUND)

        if tx.status == Transaction.Status.COMPLETED:
            return Response({
                'status': 'COMPLETED',
                'message': 'Giao dịch đã được thanh toán thành công!',
                'balance': tx.wallet.balance
            }, status=status.HTTP_200_OK)

        # Nếu đang PENDING, gọi MoMo Query API để kiểm tra kết quả thực tế
        momo_res = query_momo_payment(order_id)
        result_code = momo_res.get('resultCode')

        if result_code == 0:
            with transaction.atomic():
                tx = Transaction.objects.select_for_update().get(id=tx.id)
                if tx.status != Transaction.Status.COMPLETED:
                    tx.status = Transaction.Status.COMPLETED
                    if tx.transaction_type == Transaction.TransactionType.PRO_UPGRADE:
                        profile = getattr(tx.wallet.user, 'freelancer_profile', None)
                        if profile:
                            profile.is_pro = True
                            profile.save()
                    else:
                        tx.wallet.balance += Decimal(str(tx.amount))
                        tx.wallet.save()
                    tx.save()

            return Response({
                'status': 'COMPLETED',
                'message': 'Thanh toán MoMo thành công!',
                'balance': tx.wallet.balance
            }, status=status.HTTP_200_OK)

        elif result_code == 1000:
            return Response({
                'status': 'PENDING',
                'message': momo_res.get('message', 'Đang chờ người dùng quét mã / xác nhận thanh toán.'),
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'PENDING',
                'result_code': result_code,
                'message': momo_res.get('message', 'Đang xử lý giao dịch.'),
            }, status=status.HTTP_200_OK)

# Class xử lý API (View) cho MockPaymentSuccessView
class MockPaymentSuccessView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        order_id = request.data.get('orderId')
        amount = request.data.get('amount')

        if not order_id or not amount:
            return Response({'error': 'Missing orderId or amount'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                tx = Transaction.objects.select_for_update().get(order_id=order_id)
                
                if tx.status == Transaction.Status.COMPLETED:
                    return Response({'message': 'Already processed', 'balance': tx.wallet.balance}, status=status.HTTP_200_OK)

                tx.status = Transaction.Status.COMPLETED
                if tx.transaction_type == Transaction.TransactionType.PRO_UPGRADE:
                    profile = getattr(tx.wallet.user, 'freelancer_profile', None)
                    if profile:
                        profile.is_pro = True
                        profile.save()
                else:
                    tx.wallet.balance += Decimal(str(amount))
                    tx.wallet.save()
                tx.save()

                return Response({'message': 'Simulation Success!', 'balance': tx.wallet.balance}, status=status.HTTP_200_OK)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

# Class xử lý nâng cấp Pro bằng Số dư ví nội bộ (Trừ 50.000 VNĐ từ balance)
class UpgradeProWithWalletView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        PRO_COST = Decimal('50000')
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        profile = getattr(request.user, 'freelancer_profile', None)
        if not profile:
            return Response({'error': 'Tài khoản không phải là Freelancer.'}, status=status.HTTP_400_BAD_REQUEST)

        if profile.is_pro:
            return Response({'error': 'Tài khoản của bạn đã là FreelanceAI Pro rồi!'}, status=status.HTTP_400_BAD_REQUEST)

        if wallet.balance < PRO_COST:
            return Response({
                'error': f'Số dư ví không đủ ({wallet.balance:,.0f} VNĐ). Cần 50,000 VNĐ để nâng cấp. Vui lòng nạp thêm tiền hoặc chọn thanh toán qua MoMo.'
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            wallet.balance -= PRO_COST
            wallet.save()

            Transaction.objects.create(
                wallet=wallet,
                amount=PRO_COST,
                transaction_type=Transaction.TransactionType.PRO_UPGRADE,
                status=Transaction.Status.COMPLETED,
                description="Nâng cấp tài khoản FreelanceAI Pro (Trừ số dư ví)"
            )

            profile.is_pro = True
            profile.save()

        return Response({
            'message': 'Đã trừ 50,000 VNĐ từ số dư ví và nâng cấp tài khoản FreelanceAI Pro thành công!',
            'balance': wallet.balance,
            'is_pro': True
        }, status=status.HTTP_200_OK)

# Class xử lý API (View) cho BuyAICreditsView
class BuyAICreditsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        cost = settings.AI_CREDIT_PRICE
        credits_to_add = settings.AI_CREDITS_PER_PURCHASE

        if wallet.balance < cost:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            wallet.balance -= Decimal(str(cost))
            wallet.ai_credits += credits_to_add
            wallet.save()

            Transaction.objects.create(
                wallet=wallet,
                amount=cost,
                transaction_type=Transaction.TransactionType.AI_CREDIT_PURCHASE,
                status=Transaction.Status.COMPLETED,
                description=f"Purchased {credits_to_add} AI Credits"
            )

        return Response({'message': f'Successfully purchased {credits_to_add} credits', 'ai_credits': wallet.ai_credits})

# Class xử lý API (View) cho EscrowActionView
class EscrowActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request, action):
        job_id = request.data.get('job_id')
        if not job_id:
            return Response({'error': 'Vui lòng cung cấp job_id'}, status=status.HTTP_400_BAD_REQUEST)

        job = Job.objects.filter(id=job_id).first()
        if not job:
            return Response({'error': 'Không tìm thấy công việc.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'lock':
            if not hasattr(job.client, 'user') or job.client.user != request.user:
                return Response({'error': 'Chỉ khách hàng sở hữu công việc này mới có thể ký quỹ.'}, status=status.HTTP_403_FORBIDDEN)

            existing_escrow = Escrow.objects.filter(job=job, status=Escrow.Status.LOCKED).first()
            if existing_escrow:
                return Response({'error': 'Khoản thanh toán cho công việc này đã được ký quỹ trước đó.'}, status=status.HTTP_400_BAD_REQUEST)

            wallet, _ = Wallet.objects.get_or_create(user=request.user)
            if wallet.balance < job.budget:
                return Response({
                    'error': f'Số dư khả dụng ({wallet.balance:,.0f} VNĐ) không đủ để ký quỹ ngân sách dự án ({job.budget:,.0f} VNĐ). Vui lòng nạp thêm tiền.'
                }, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                wallet.balance -= job.budget
                wallet.escrow_balance += job.budget
                wallet.save()

                escrow, created = Escrow.objects.update_or_create(
                    job=job,
                    defaults={
                        'client': request.user,
                        'amount': job.budget,
                        'status': Escrow.Status.LOCKED
                    }
                )

                Transaction.objects.create(
                    wallet=wallet,
                    amount=job.budget,
                    transaction_type=Transaction.TransactionType.ESCROW_LOCK,
                    status=Transaction.Status.COMPLETED,
                    description=f"Ký quỹ bảo đảm dự án: {job.title}"
                )

            return Response({
                'message': f'Đã ký quỹ thành công {job.budget:,.0f} VNĐ vào quỹ bảo đảm dự án!',
                'escrow_status': 'LOCKED',
                'balance': wallet.balance,
                'escrow_balance': wallet.escrow_balance
            }, status=status.HTTP_200_OK)

        elif action == 'release':
            escrow = Escrow.objects.filter(job=job).first()
            if not escrow:
                return Response({'error': 'Dự án này chưa có khoản ký quỹ nào.'}, status=status.HTTP_400_BAD_REQUEST)

            if escrow.client != request.user:
                return Response({'error': 'Chỉ chủ dự án mới có quyền giải phóng tiền ký quỹ.'}, status=status.HTTP_403_FORBIDDEN)

            if escrow.status != Escrow.Status.LOCKED:
                return Response({'error': 'Khoản ký quỹ không ở trạng thái Đang khóa (LOCKED).'}, status=status.HTTP_400_BAD_REQUEST)

            winning_app = job.applications.filter(
                status__in=['Accepted', 'accepted', 'Hired', 'hired', 'Completed', 'completed']
            ).first()

            if not winning_app:
                return Response({'error': 'Không tìm thấy Freelancer trúng tuyển dự án này.'}, status=status.HTTP_400_BAD_REQUEST)

            freelancer_user = winning_app.freelancer.user
            freelancer_wallet, _ = Wallet.objects.get_or_create(user=freelancer_user)
            client_wallet, _ = Wallet.objects.get_or_create(user=request.user)

            with transaction.atomic():
                platform_fee = Decimal(str(escrow.amount)) * Decimal('0.10') # 10% fee
                payout_amount = Decimal(str(escrow.amount)) - platform_fee

                client_wallet.escrow_balance = max(Decimal('0'), client_wallet.escrow_balance - Decimal(str(escrow.amount)))
                client_wallet.save()

                freelancer_wallet.balance += payout_amount
                freelancer_wallet.save()

                escrow.status = Escrow.Status.RELEASED
                escrow.freelancer = freelancer_user
                escrow.released_at = timezone.now()
                escrow.save()

                job.status = 'Completed'
                job.save()

                winning_app.status = 'Completed'
                winning_app.save()

                Transaction.objects.create(
                    wallet=freelancer_wallet,
                    amount=payout_amount,
                    transaction_type=Transaction.TransactionType.ESCROW_RELEASE,
                    status=Transaction.Status.COMPLETED,
                    description=f"Nhận thù lao hoàn thành dự án: {job.title} (Khấu trừ 10% phí sàn)"
                )

                from notifications.models import Notification
                Notification.objects.create(
                    user=freelancer_user,
                    notification_type='system',
                    title="Thanh toán dự án thành công",
                    message=f"Khách hàng đã giải phóng khoản tiền ký quỹ {payout_amount:,.0f} VNĐ cho dự án '{job.title}'."
                )

            return Response({
                'message': f'Đã giải phóng tiền ký quỹ {payout_amount:,.0f} VNĐ cho Freelancer thành công!',
                'escrow_status': 'RELEASED'
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Hành động không hợp lệ. Chỉ chấp nhận lock hoặc release.'}, status=status.HTTP_400_BAD_REQUEST)
