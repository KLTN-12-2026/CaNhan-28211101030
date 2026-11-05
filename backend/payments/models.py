from django.db import models
from django.conf import settings
from jobs.models import Job

# Class định nghĩa dữ liệu (Model/Entity) cho Wallet
class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    escrow_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    ai_credits = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"Wallet: {self.user.username} (Bal: {self.balance}, Credits: {self.ai_credits})"

# Class định nghĩa dữ liệu (Model/Entity) cho Transaction
class Transaction(models.Model):
    # Class định nghĩa dữ liệu (Model/Entity) cho TransactionType
    class TransactionType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', 'Deposit'
        WITHDRAW = 'WITHDRAW', 'Withdraw'
        ESCROW_LOCK = 'ESCROW_LOCK', 'Escrow Lock'
        ESCROW_RELEASE = 'ESCROW_RELEASE', 'Escrow Release'
        AI_CREDIT_PURCHASE = 'AI_CREDIT_PURCHASE', 'AI Credit Purchase'
        PRO_UPGRADE = 'PRO_UPGRADE', 'Pro Upgrade'
        REFUND = 'REFUND', 'Refund'

    # Class định nghĩa dữ liệu (Model/Entity) cho Status
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    stripe_intent_id = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(null=True, blank=True)
    order_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} ({self.status})"

# Class định nghĩa dữ liệu (Model/Entity) cho Escrow
class Escrow(models.Model):
    # Class định nghĩa dữ liệu (Model/Entity) cho Status
    class Status(models.TextChoices):
        LOCKED = 'LOCKED', 'Locked'
        RELEASED = 'RELEASED', 'Released'
        REFUNDED = 'REFUNDED', 'Refunded'

    job = models.OneToOneField(Job, on_delete=models.CASCADE, related_name='escrow')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='escrows_paid')
    freelancer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='escrows_received')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.LOCKED)
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"Escrow for {self.job.title}: {self.amount} ({self.status})"

# Class định nghĩa dữ liệu (Model/Entity) cho AIServiceLog
class AIServiceLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    service_name = models.CharField(max_length=100)
    credits_used = models.IntegerField(default=1)
    timestamp = models.DateTimeField(auto_now_add=True)

    # Hàm trả về chuỗi đại diện cho object
    def __str__(self):
        return f"{self.user.username} used {self.service_name}"
