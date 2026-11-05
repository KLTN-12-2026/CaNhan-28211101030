from django.contrib import admin
# import mô hình ChatMessage từ model.py
from .models import ChatMessage

from django.utils.html import format_html

# Đăng ký model ChatMessage vào admin site
# Điều này cho phép quản lý tin nhắn qua giao diện admin
@admin.register(ChatMessage)
# Class cấu hình giao diện Admin cho model ChatMessage
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'short_content', 'offer_badge', 'is_read', 'created_at')
    list_filter = ('is_offer', 'offer_status', 'is_read', 'created_at')
    search_fields = ('content', 'offer_details')

    def short_content(self, obj):
        if not obj.content:
            return format_html("<i>{}</i>", "[Không có nội dung chữ]")
        content = obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
        if obj.is_offer:
            return format_html('<span style="color: #059669; font-weight: bold;">{}</span>', content)
        return content
    short_content.short_description = "Content"

    def offer_badge(self, obj):
        if obj.is_offer:
            color = '#10b981' if obj.offer_status == 'accepted' else '#ef4444' if obj.offer_status == 'rejected' else '#f59e0b'
            return format_html(
                '<span style="background-color: {}; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 11px;">OFFER: {}</span>',
                color, obj.offer_status.upper()
            )
        return "-"
    offer_badge.short_description = "Loại tin nhắn"
