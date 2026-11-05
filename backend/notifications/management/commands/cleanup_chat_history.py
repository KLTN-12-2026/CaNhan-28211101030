from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.models import AIChatHistory
from datetime import timedelta

class Command(BaseCommand):
    help = 'Xóa các đoạn chat AI cũ hơn 30 ngày để giảm tải cơ sở dữ liệu'

    def handle(self, *args, **kwargs):
        cutoff_date = timezone.now() - timedelta(days=30)
        old_chats = AIChatHistory.objects.filter(timestamp__lt=cutoff_date)
        
        count = old_chats.count()
        if count > 0:
            old_chats.delete()
            self.stdout.write(self.style.SUCCESS(f'Thành công: Đã xóa {count} tin nhắn AI cũ hơn 30 ngày (trước {cutoff_date.strftime("%Y-%m-%d")}).'))
        else:
            self.stdout.write(self.style.SUCCESS('Không có tin nhắn AI nào quá 30 ngày cần xóa.'))
