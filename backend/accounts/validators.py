try:
    import magic
except (ImportError, Exception):
    magic = None
import os
import re
from django.core.exceptions import ValidationError

# Hàm kiểm tra tính hợp lệ của trường file_signature
def validate_file_signature(file_obj, allowed_mime_types, max_size_mb=5):
    """
    Kiểm tra chữ ký file (Magic Numbers) để xác thực loại file thực tế.
    """
    if not file_obj:
        return

    # 1. Kiểm tra kích thước file
    if file_obj.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"File quá lớn. Kích thước tối đa cho phép là {max_size_mb}MB.")

    # 2. Đọc header của file (thường chỉ cần 2048 bytes đầu tiên)
    file_content = file_obj.read(2048)
    file_obj.seek(0) # Đưa con trỏ về đầu file để Django xử lý tiếp

    if not file_content:
        raise ValidationError("File rỗng hoặc không hợp lệ.")

    # 3. Sử dụng python-magic để nhận diện MIME type
    try:
        if magic:
            mime_type = magic.from_buffer(file_content, mime=True)
        else:
            raise AttributeError()
    except (AttributeError, Exception):
        # Fallback cho hệ điều hành chưa có libmagic
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_obj.name)
        if not mime_type:
            mime_type = 'application/octet-stream'

    if mime_type not in allowed_mime_types:
        raise ValidationError(f"Loại file không hợp lệ ({mime_type}). Chỉ chấp nhận: {', '.join(allowed_mime_types)}")

# Hàm kiểm tra tính hợp lệ của trường cv_file
def validate_cv_file(file_obj):
    allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    validate_file_signature(file_obj, allowed, max_size_mb=10)

# Hàm kiểm tra tính hợp lệ của trường image_file
def validate_image_file(file_obj):
    allowed = ['image/jpeg', 'image/png', 'image/webp']
    validate_file_signature(file_obj, allowed, max_size_mb=5)

# hàm kiểm tra tính hợp lệ của đường dẫn porfolio_link
def validate_portfolio_url(value):
    """
    Kiểm tra URL Portfolio có bắt đầu bằng http hoặc https không
    và đảm bảo nội dung không chứa ký tự lạ.
    """
    if value: # Chỉ kiểm tra nếu người dùng có nhập
        # Regex kiểm tra định dạng URL cơ bản
        url_pattern = re.compile(
            r'^https?://'  # Phải bắt đầu bằng http:// hoặc https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|' # domain...
            r'localhost|' # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
            r'(?::\d+)?' # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)

        if not url_pattern.match(value):
            raise ValidationError(
                "Đường dẫn Portfolio không hợp lệ. Vui lòng bắt đầu bằng http:// hoặc https://"
            )
