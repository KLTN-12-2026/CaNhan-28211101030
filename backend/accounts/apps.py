import os
import sys
from django.apps import AppConfig


# Class định nghĩa cấu hình cho Accounts
class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Tự động kiểm tra và kết nối database khi chạy server
        if os.environ.get('RUN_MAIN') == 'true':
            from django.db import connection
            try:
                connection.ensure_connection()
                print(f" Database: Đã tự động kết nối thành công tới PostgreSQL ({connection.settings_dict.get('NAME')})")
            except Exception as e:
                print(f" Database: LỖI KẾT NỐI DATABASE - {e}")

