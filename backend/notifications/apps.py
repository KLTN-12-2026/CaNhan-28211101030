from django.apps import AppConfig


# Class định nghĩa dữ liệu (Model/Entity) cho NotificationsConfig
class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    # Hàm khởi tạo cấu hình khi app chạy
    def ready(self):
        import notifications.signals