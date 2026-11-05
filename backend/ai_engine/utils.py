import pdfplumber
import os

# Hàm thực hiện extract text from cv
def extract_text_from_cv(file_path):
    """
    Đọc file PDF từ đường dẫn và trả về chuỗi văn bản thuần túy.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError("Không tìm thấy file CV trên server.")

    extracted_text = ""
    
    try:
        # Mở file PDF
        with pdfplumber.open(file_path) as pdf:
            # Duyệt qua từng trang
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    # Nối text và thêm khoảng trắng để tránh dính chữ giữa các trang
                    extracted_text += text + "\n"
                    
        # Xóa các khoảng trắng thừa để tối ưu token khi gửi cho AI
        cleaned_text = " ".join(extracted_text.split())
        return cleaned_text
        
    except Exception as e:
        raise Exception(f"Lỗi khi đọc file PDF: {str(e)}")