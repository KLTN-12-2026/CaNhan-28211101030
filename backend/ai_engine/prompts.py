CV_EXTRACTION_PROMPT = """
Bạn là một chuyên gia Nhân sự (HR) và là một hệ thống phân tích dữ liệu AI xuất sắc.
Nhiệm vụ của bạn là đọc nội dung CV được cung cấp dưới đây và trích xuất danh sách các kỹ năng của ứng viên.

YÊU CẦU BẮT BUỘC:
1. Bạn CHỈ ĐƯỢC PHÉP trả về dữ liệu dưới định dạng JSON thuần túy, tuyệt đối không có markdown (```json), không có text giải thích thừa.
2. Phân loại kỹ năng thành 2 nhóm: "Technical" (Kỹ năng cứng/công nghệ) và "Soft_Skill" (Kỹ năng mềm).
3. Tự động đánh giá mức độ thành thạo (level) từ 1 đến 5 dựa trên số năm kinh nghiệm hoặc cách ứng viên mô tả trong CV. Nếu không rõ, để mặc định là 3.

ĐỊNH DẠNG JSON MONG MUỐN:
{
  "skills": [
    {
      "skill_name": "Python",
      "category": "Technical",
      "level": 4
    },
    {
      "skill_name": "Communication",
      "category": "Soft_Skill",
      "level": 3
    }
  ],
  "summary": "Tóm tắt ngắn gọn 2-3 câu về thế mạnh của ứng viên này."
}

Nội dung CV cần phân tích:
{cv_text}
"""