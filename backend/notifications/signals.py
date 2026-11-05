from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from jobs.models import Job, Application 
from accounts.models import CompanyProfile

# 1. THÔNG BÁO KHI CÓ NGƯỜI ỨNG TUYỂN
@receiver(post_save, sender=Application)
# Hàm thực hiện notify new application
def notify_new_application(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.job.client.user, 
            message=f"Ứng viên {instance.freelancer.user.username} vừa ứng tuyển vào công việc '{instance.job.title}'."
        )

# 2. THÔNG BÁO KHI CLIENT ĐĂNG TIN MỚI THÀNH CÔNG
@receiver(post_save, sender=Job)
# Hàm thực hiện notify new job posted
def notify_new_job_posted(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.client.user, 
            message=f"Tin tuyển dụng '{instance.title}' của bạn đã được đăng thành công. Hệ thống đang quét AI để tìm ứng viên!"
        )

# 3. THÔNG BÁO KHI CẬP NHẬT HỒ SƠ CÔNG TY (Không phải tạo mới)
@receiver(post_save, sender=CompanyProfile)
# Hàm thực hiện notify profile update
def notify_profile_update(sender, instance, created, **kwargs):
    if not created: 
        Notification.objects.create(
            user=instance.user, 
            message="Hồ sơ doanh nghiệp của bạn đã được cập nhật thành công."
        )

# 4. THÔNG BÁO KHI TRẠNG THÁI ỨNG TUYỂN THAY ĐỔI (Accepted/Rejected)
@receiver(post_save, sender=Application)
# Hàm thực hiện notify application status update
def notify_application_status_update(sender, instance, created, **kwargs):
    # Chỉ thông báo khi cập nhật (không phải tạo mới) và status khác Pending
    if not created and instance.status in ['Accepted', 'Rejected']:
        status_text = "được CHẤP NHẬN" if instance.status == 'Accepted' else "bị TỪ CHỐI"
        Notification.objects.create(
            user=instance.freelancer.user,
            notification_type='application',
            title="Cập nhật trạng thái ứng tuyển",
            message=f"Đơn ứng tuyển của bạn cho công việc '{instance.job.title}' đã {status_text}."
        )