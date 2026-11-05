from rest_framework import serializers
from .models import Wallet, Transaction, Escrow

# Class chuyển đổi dữ liệu (Serializer) cho Transaction
class TransactionSerializer(serializers.ModelSerializer):
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Transaction
        fields = '__all__'

# Class chuyển đổi dữ liệu (Serializer) cho Wallet
class WalletSerializer(serializers.ModelSerializer):
    # Trường dữ liệu mở rộng (Serializer Field): recent_transactions
    recent_transactions = serializers.SerializerMethodField()

    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Wallet
        fields = ['balance', 'escrow_balance', 'ai_credits', 'recent_transactions']

    # Hàm lấy dữ liệu recent transactions
    def get_recent_transactions(self, obj):
        transactions = Transaction.objects.filter(wallet=obj).order_by('-created_at')[:10]
        return TransactionSerializer(transactions, many=True).data

# Class chuyển đổi dữ liệu (Serializer) cho Escrow
class EscrowSerializer(serializers.ModelSerializer):
    # Trường dữ liệu mở rộng (Serializer Field): job_title
    job_title = serializers.CharField(source='job.title', read_only=True)
    # Lớp Meta chứa thông tin cấu hình cho class này
    class Meta:
        model = Escrow
        fields = '__all__'
