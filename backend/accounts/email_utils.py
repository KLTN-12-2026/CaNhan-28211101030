import logging
from django.conf import settings
from django.core.mail import send_mail
from smtplib import SMTPAuthenticationError, SMTPException

logger = logging.getLogger(__name__)

def send_otp_email(to_email, otp_code, purpose="REGISTER"):
    """
    Gửi mã OTP qua email với giao diện HTML chuẩn đẹp mắt, hỗ trợ hiển thị tốt trên Gmail (App & Web).
    Trả về: (success: bool, error_message: str | None, is_dev: bool)
    """
    is_console = getattr(settings, 'EMAIL_BACKEND', '').endswith('console.EmailBackend')
    
    # Chuẩn hóa địa chỉ người gửi
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
    if not from_email:
        host_user = getattr(settings, 'EMAIL_HOST_USER', '')
        from_email = f"FreelanceAI Platform <{host_user}>" if host_user else 'FreelanceAI Platform <noreply@freelancer.ai>'

    if purpose == 'REGISTER':
        subject = f"[FreelanceAI] Mã xác thực đăng ký tài khoản: {otp_code}"
        action_text = "đăng ký tài khoản mới"
    elif purpose == 'PROFILE_VERIFY':
        subject = f"[FreelanceAI] Mã xác thực địa chỉ email: {otp_code}"
        action_text = "xác thực địa chỉ email hồ sơ"
    elif purpose == 'RESET_PASSWORD':
        subject = f"[FreelanceAI] Mã đặt lại mật khẩu: {otp_code}"
        action_text = "đặt lại mật khẩu tài khoản"
    else:
        subject = f"[FreelanceAI] Mã xác nhận bảo mật: {otp_code}"
        action_text = "thực hiện thao tác bảo mật"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; padding: 40px 15px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #111827; border-radius: 20px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #ffffff;">
                                    Freelance<span style="color: #10b981;">AI</span>
                                </h1>
                                <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">
                                    Nền tảng kết nối nhân tài & doanh nghiệp AI
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 36px 40px;">
                                <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #f3f4f6; text-align: center;">
                                    Xác thực địa chỉ Email
                                </h2>
                                <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; text-align: center;">
                                    Bạn vừa yêu cầu {action_text} trên hệ thống <strong>FreelanceAI</strong>. Vui lòng nhập mã OTP 6 chữ số dưới đây để tiếp tục:
                                </p>

                                <!-- OTP Box -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td align="center">
                                            <div style="background-color: rgba(16, 185, 129, 0.08); border: 2px dashed #10b981; border-radius: 16px; padding: 20px 30px; display: inline-block; margin: 10px 0 24px;">
                                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #10b981; display: block; margin-left: 12px;">
                                                    {otp_code}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 24px; font-size: 13px; color: #94a3b8; text-align: center;">
                                    ⏳ Mã xác thực có hiệu lực trong vòng <strong style="color: #f1f5f9;">10 phút</strong>.
                                </p>

                                <div style="background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fca5a5;">
                                        <strong>⚠️ Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Ban quản trị hệ thống sẽ không bao giờ yêu cầu bạn cung cấp mã OTP.
                                    </p>
                                </div>

                                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc thông báo cho chúng tôi để được trợ giúp.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background-color: #0d121f; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #475569;">
                                    © 2026 FreelanceAI Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    plain_message = f"""
Xin chào,

Bạn vừa thực hiện thao tác {action_text} trên FreelanceAI Platform.
Mã xác thực (OTP) của bạn là: {otp_code}

Mã này có hiệu lực trong vòng 10 phút.
Vui lòng không chia sẻ mã này cho bất kỳ ai để bảo vệ an toàn tài khoản.

Trân trọng,
Đội ngũ FreelanceAI Platform
    """.strip()

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_content,
            fail_silently=False,
        )
        return True, None, is_console
    except SMTPAuthenticationError as e:
        err = "Xác thực tài khoản Gmail thất bại. Vui lòng kiểm tra EMAIL_HOST_USER và Mật khẩu ứng dụng (App Password 16 chữ cái) trong backend/.env."
        logger.error(f"{err} Chi tiết: {str(e)}")
        return False, err, is_console
    except SMTPException as e:
        err = f"Lỗi gửi email qua máy chủ SMTP Gmail: {str(e)}"
        logger.error(err)
        return False, err, is_console
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False, f"Không thể gửi email: {str(e)}", is_console
