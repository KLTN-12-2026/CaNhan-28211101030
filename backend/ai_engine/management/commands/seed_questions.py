from django.core.management.base import BaseCommand
from ai_engine.models import InterviewQuestion
from google import genai
from google.genai import types
from django.conf import settings
import json
import time

class Command(BaseCommand):
    help = 'Tự động gọi AI sinh 500 câu hỏi phỏng vấn cho các ngành nghề phổ biến'

    def add_arguments(self, parser):
        parser.add_argument('--target', type=int, default=500, help='Số lượng câu hỏi mục tiêu')

    def handle(self, *args, **kwargs):
        target = kwargs['target']
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        hot_jobs = [
            "Senior ReactJS Developer", "Node.js Backend Engineer", "Data Scientist", 
            "Python AI Engineer", "Java Spring Boot Developer", "DevOps Engineer",
            "iOS Swift Developer", "Android Kotlin Developer", "Flutter Developer",
            "QA Automation Engineer", "Product Manager", "UI/UX Designer",
            "Cybersecurity Analyst", "Cloud Architect (AWS)", "Blockchain Developer"
        ]
        
        company_types = ["FAANG", "Startup", "Product", "Outsource"]
        
        self.stdout.write(f"Bat dau tien trinh Seed {target} Cau Hoi...")
        
        total_added = InterviewQuestion.objects.count()
        goal_total = total_added + target
        
        job_idx = 0
        company_idx = 0
        
        while total_added < goal_total:
            job = hot_jobs[job_idx % len(hot_jobs)]
            c_type = company_types[company_idx % len(company_types)]
            
            self.stdout.write(f"Dang goi AI sinh 20 cau hoi cho: {job} - {c_type}...")
            
            system_instruction = f"""
            Bạn là Senior Technical Recruiter. Nhiệm vụ của bạn là tổng hợp và tạo ra bộ 20 câu hỏi phỏng vấn dành cho vị trí "{job}" trong môi trường "{c_type}".
            Dữ liệu này dùng để đưa vào hệ thống học tập.
            Yêu cầu:
            - Tạo ra CHÍNH XÁC 20 câu hỏi (10 Technical, 6 Behavioral, 4 System Design / Soft Skill).
            - Các câu hỏi phải đa dạng độ khó (Easy, Medium, Hard).
            - Mỗi câu hỏi phải đi kèm Key Concepts hoặc phương pháp trả lời (STAR).
            - Không được trùng lặp.
            
            CHỈ TRẢ VỀ JSON hợp lệ, không bọc markdown. Format:
            {{
                "question_bank": [
                    {{
                        "question": "<nội dung>",
                        "type": "Technical", "Behavioral", "System Design", hoặc "Soft Skill",
                        "difficulty": "Easy", "Medium", hoặc "Hard",
                        "key_concepts_or_star": "<ý chính>",
                        "category": "{job.split()[0]}"
                    }}
                ]
            }}
            """
            
            try:
                response = client.models.generate_content(
                    model="gemini-flash-latest",
                    contents=[system_instruction],
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                
                raw_text = response.text.strip()
                if raw_text.startswith("```json"): raw_text = raw_text[7:]
                if raw_text.endswith("```"): raw_text = raw_text[:-3]
                
                data = json.loads(raw_text.strip())
                questions = data.get("question_bank", [])
                
                added_this_batch = 0
                for q in questions:
                    InterviewQuestion.objects.create(
                        question_text=q.get("question", ""),
                        question_type=q.get("type", "Technical"),
                        difficulty=q.get("difficulty", "Medium"),
                        company_type=c_type,
                        key_concepts_or_star=q.get("key_concepts_or_star", ""),
                        category=q.get("category", "General"),
                        tags=[job, c_type],
                        is_approved=True # Auto-approve for seeder
                    )
                    added_this_batch += 1
                    total_added += 1
                    
                self.stdout.write(self.style.SUCCESS(f"-> Them thanh cong {added_this_batch} cau. Tong DB: {total_added}"))
                
                if total_added >= goal_total:
                    break
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Loi khi sinh cho {job}: {str(e)}"))
            
            job_idx += 1
            if job_idx % len(hot_jobs) == 0:
                company_idx += 1
                
            self.stdout.write("Cho 3 giay tranh Rate Limit...")
            time.sleep(3)
            
        self.stdout.write(self.style.SUCCESS(f"Hoan tat! Da luu tru du {total_added} cau hoi."))
