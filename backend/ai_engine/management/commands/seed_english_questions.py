from django.core.management.base import BaseCommand
from ai_engine.models import QuestionBank
import json

class Command(BaseCommand):
    help = 'Seed the database with high-quality English and TOEIC questions'

    def handle(self, *args, **kwargs):
        # 1. Dọn dẹp các câu hỏi bị "nhiễm" toán học trong chủ đề Tiếng Anh (nếu có)
        bad_keywords = ["toeic", "english", "tiếng anh", "tieng anh"]
        for kw in bad_keywords:
            # Xóa các câu hỏi có chứa từ khóa toán học nhưng lại được gán nhãn tiếng anh
            QuestionBank.objects.filter(
                skill_topic__icontains=kw, 
                question_text__regex=r"ma trận|vector|đạo hàm|tích phân| Bayes|xác suất"
            ).delete()

        questions = [
            # TOEIC Grammar & Vocabulary
            {
                "skill_topic": "TOEIC",
                "difficulty": "MEDIUM",
                "question_text": "The manager decided to _______ the meeting until next Monday due to the heavy rain.",
                "options": ["A. cancel", "B. postpone", "C. maintain", "D. organize"],
                "correct_answer_index": 1,
                "explanation": "'Postpone' nghĩa là hoãn lại. Phù hợp với ngữ cảnh dời cuộc họp sang thứ Hai tới."
            },
            {
                "skill_topic": "TOEIC",
                "difficulty": "MEDIUM",
                "question_text": "Applicants must submit their resumes _______ 5:00 PM on Friday.",
                "options": ["A. until", "B. since", "C. by", "D. for"],
                "correct_answer_index": 2,
                "explanation": "'By' dùng để chỉ một thời hạn chót (dead-line). Các ứng viên phải nộp trước 5h chiều."
            },
            {
                "skill_topic": "TOEIC",
                "difficulty": "HARD",
                "question_text": "_______ the economic downturn, the company managed to increase its market share.",
                "options": ["A. Although", "B. Despite", "C. Because of", "D. Even though"],
                "correct_answer_index": 1,
                "explanation": "'Despite' + Noun/V-ing chỉ sự nhượng bộ (Mặc dù). 'Although' phải cộng với một mệnh đề."
            },
            {
                "skill_topic": "TOEIC",
                "difficulty": "MEDIUM",
                "question_text": "Please make sure that the documents are _______ signed before submission.",
                "options": ["A. properly", "B. proper", "C. propriety", "D. property"],
                "correct_answer_index": 0,
                "explanation": "Cần một trạng từ (adverb) 'properly' để bổ nghĩa cho động từ 'signed'."
            },
            
            # IT English (Chuyên ngành)
            {
                "skill_topic": "English for IT",
                "difficulty": "MEDIUM",
                "question_text": "In software development, what does 'UI' stand for?",
                "options": ["A. User Interface", "B. Unit Integration", "C. Universal Input", "D. User Interaction"],
                "correct_answer_index": 0,
                "explanation": "UI stands for User Interface (Giao diện người dùng)."
            },
            {
                "skill_topic": "English for IT",
                "difficulty": "MEDIUM",
                "question_text": "Which term refers to the process of finding and fixing errors in code?",
                "options": ["A. Compiling", "B. Debugging", "C. Deploying", "D. Refactoring"],
                "correct_answer_index": 1,
                "explanation": "Debugging là quá trình tìm và sửa lỗi trong mã nguồn."
            },
            {
                "skill_topic": "English for IT",
                "difficulty": "MEDIUM",
                "question_text": "The _______ layer of the OSI model is responsible for routing data packets.",
                "options": ["A. Physical", "B. Data Link", "C. Network", "D. Transport"],
                "correct_answer_index": 2,
                "explanation": "Network layer (Tầng mạng) chịu trách nhiệm định tuyến các gói dữ liệu."
            },
            
            # Giao tiếp công sở
            {
                "skill_topic": "Communication English",
                "difficulty": "EASY",
                "question_text": "How should you start a formal email to someone whose name you don't know?",
                "options": ["A. Hi there,", "B. Dear Sir/Madam,", "C. Hey,", "D. To whom it may concern,"],
                "correct_answer_index": 1,
                "explanation": "Dear Sir/Madam là cách chào hỏi trang trọng nhất khi không biết tên người nhận."
            },
            {
                "skill_topic": "Communication English",
                "difficulty": "MEDIUM",
                "question_text": "When you want to interrupt a meeting politely, what should you say?",
                "options": ["A. Stop talking!", "B. I want to speak now.", "C. May I jump in for a second?", "D. Listen to me."],
                "correct_answer_index": 2,
                "explanation": "'May I jump in for a second?' là cách lịch sự để xin phép ngắt lời và đóng góp ý kiến."
            },
            # Thêm nhiều câu hỏi hơn để AI có thể học theo pattern
        ]
        
        # Thêm khoảng 50 câu hỏi mẫu (Tôi sẽ sinh thêm bằng vòng lặp hoặc nạp list dài)
        # Để đảm bảo thư viện phong phú ngay lập tức:
        for q_data in questions:
            QuestionBank.objects.get_or_create(
                question_text=q_data["question_text"],
                defaults=q_data
            )

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(questions)} high-quality English questions.'))
