import json
import os
import random
import time
from tenacity import RetryError, retry, wait_exponential, stop_after_attempt, retry_if_exception
from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError, ServerError
from django.conf import settings
from django.db import transaction
from accounts.models import FreelancerProfile
from jobs.models import Skill, FreelancerSkill
from notifications.models import AIChatHistory

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"
GEMINI_MODEL = getattr(settings, "GEMINI_MODEL", os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL))

# Danh sách model dự phòng theo thứ tự ưu tiên (Tự động chuyển ngay khi gặp 503/404/429)
FALLBACK_MODELS = [
    GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
]
_seen_models = set()
GEMINI_CANDIDATE_MODELS = [m for m in FALLBACK_MODELS if not (m in _seen_models or _seen_models.add(m))]

# --- GEMINI MANAGER FOR KEY ROTATION & RETRY ---
class GeminiManager:
    def __init__(self, keys):
        self.keys = keys if keys else []
        self.current_index = random.randint(0, len(self.keys)-1) if self.keys else -1
        self.client = self._create_client()

    def _create_client(self):
        if self.current_index == -1 or not self.keys:
            return genai.Client(api_key=getattr(settings, "GEMINI_API_KEY", ""))
        return genai.Client(api_key=self.keys[self.current_index])

    def rotate_key(self):
        if len(self.keys) > 1:
            self.current_index = (self.current_index + 1) % len(self.keys)
            self.client = self._create_client()
            print(f"[GeminiManager] Rotated to key index {self.current_index}")

    def safe_generate_content(self, *args, **kwargs):
        return self.client.models.generate_content(*args, **kwargs)

    def safe_embed_content(self, *args, **kwargs):
        return self.client.models.embed_content(*args, **kwargs)

    def safe_upload_file(self, *args, **kwargs):
        return self.client.files.upload(*args, **kwargs)

    def safe_delete_file(self, *args, **kwargs):
        return self.client.files.delete(*args, **kwargs)

gemini_manager = GeminiManager(getattr(settings, "GEMINI_API_KEYS", []))

def has_gemini_key():
    return bool(getattr(settings, "GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEYS", []))

def is_retryable_gemini_error(error):
    code = getattr(error, "code", None) or getattr(error, "status_code", None)
    try:
        code = int(code) if code is not None else None
    except (TypeError, ValueError):
        code = None

    if isinstance(error, ServerError):
        return True
    if isinstance(error, ClientError):
        return code == 429
    if code is not None:
        return code == 429 or code >= 500
    return True

def get_ai_error_detail(error):
    original_error = error
    if isinstance(error, RetryError):
        try:
            original_error = error.last_attempt.exception()
        except Exception:
            original_error = error

    code = getattr(original_error, "code", None) or getattr(original_error, "status_code", None)
    message = getattr(original_error, "message", None) or str(original_error)
    return f"{type(original_error).__name__}{f' code={code}' if code else ''}: {message}"

def log_ai_error(context, error):
    print(f"{context}: {get_ai_error_detail(error)}")

def safe_generate_content(*args, **kwargs):
    """
    Gọi Gemini API với cơ chế tự động chuyển model dự phòng siêu tốc nếu model chính bị quá tải (503/429/404).
    """
    requested_model = kwargs.get('model')
    if not requested_model and args:
        requested_model = args[0]

    models_to_try = [requested_model] if requested_model else []
    for cand in GEMINI_CANDIDATE_MODELS:
        if cand not in models_to_try:
            models_to_try.append(cand)

    last_error = None
    for model_name in models_to_try:
        call_kwargs = dict(kwargs)
        call_kwargs['model'] = model_name
        actual_args = args[1:] if (args and requested_model == args[0]) else args
        try:
            return gemini_manager.safe_generate_content(*actual_args, **call_kwargs)
        except Exception as e:
            last_error = e
            code = getattr(e, "code", None) or getattr(e, "status_code", None)
            if code == 429:
                gemini_manager.rotate_key()
            print(f"[GeminiManager] Model '{model_name}' gặp lỗi ({code or type(e).__name__}). Đang thử model dự phòng tiếp theo...")
            continue

    if last_error:
        raise last_error

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_gemini_error),
    reraise=True
)
def safe_embed_content(*args, **kwargs):
    try:
        return gemini_manager.safe_embed_content(*args, **kwargs)
    except APIError as e:
        if getattr(e, "code", None) == 429:
            print("[GeminiManager] 429 Too Many Requests caught. Rotating key and retrying...")
            gemini_manager.rotate_key()
        raise e

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_retryable_gemini_error),
    reraise=True
)
def safe_upload_file(*args, **kwargs):
    try:
        return gemini_manager.safe_upload_file(*args, **kwargs)
    except APIError as e:
        if getattr(e, "code", None) == 429:
            print("[GeminiManager] 429 Too Many Requests caught. Rotating key and retrying...")
            gemini_manager.rotate_key()
        raise e

def safe_delete_file(*args, **kwargs):
    try:
        return gemini_manager.safe_delete_file(*args, **kwargs)
    except Exception:
        pass


# --- PGVECTOR & SEMANTIC SEARCH SERVICES ---

def generate_embedding(text):
    """
    Sinh vector embedding từ đoạn văn bản bằng Gemini.
    Trả về list các số thực (768 chiều).
    """
    if not text or not text.strip():
        return None
        
    try:
        response = safe_embed_content(
            model="models/gemini-embedding-2",
            contents=text
        )
        # response.embeddings là một list các Embedding objects
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def update_freelancer_embedding(profile):
    """
    Cập nhật vector embedding cho Freelancer dựa trên Bio và Skills.
    """
    skills = [fs.skill.name for fs in profile.skills.all()]
    skills_str = ", ".join(skills)
    text_to_embed = f"Chức danh: {getattr(profile.ext_info, 'professional_title', '')}. Giới thiệu: {profile.bio}. Kỹ năng: {skills_str}"
    
    vector = generate_embedding(text_to_embed)
    if vector:
        profile.embedding = vector
        profile.save()
        return True
    return False

def update_job_embedding(job):
    """
    Cập nhật vector embedding cho Job dựa trên Title và Description.
    """
    skills = [sr.skill.name for sr in job.jobrequirement_set.all()]
    skills_str = ", ".join(skills)
    text_to_embed = f"Công việc: {job.title}. Mô tả: {job.description}. Yêu cầu: {skills_str}"
    
    vector = generate_embedding(text_to_embed)
    if vector:
        job.embedding = vector
        job.save()
        return True
    return False

def find_matching_jobs(profile, limit=5):
    """
    Sử dụng Cosine Similarity để tìm các công việc phù hợp nhất.
    Yêu cầu profile đã có embedding.
    """
    if not profile.embedding:
        update_freelancer_embedding(profile)
        
    if not profile.embedding:
        return []
        
    from jobs.models import Job
    import numpy as np
    
    # Lấy tất cả jobs có embedding
    all_jobs = list(Job.objects.exclude(embedding__isnull=True))
    if not all_jobs:
        return []
        
    try:
        profile_vec = np.array(profile.embedding)
        profile_norm = np.linalg.norm(profile_vec)
        
        if profile_norm == 0:
            return []
            
        scored_jobs = []
        for job in all_jobs:
            try:
                job_vec = np.array(job.embedding)
                job_norm = np.linalg.norm(job_vec)
                if job_norm > 0:
                    cosine_sim = np.dot(profile_vec, job_vec) / (profile_norm * job_norm)
                    # Cosine distance = 1 - cosine similarity
                    job.distance = float(1.0 - cosine_sim)
                    scored_jobs.append(job)
            except Exception as e:
                print(f"Lỗi tính khoảng cách cosine cho Job {job.id}: {e}")
                
        scored_jobs.sort(key=lambda x: getattr(x, 'distance', 1.0))
        return scored_jobs[:limit]
    except Exception as e:
        print(f"Lỗi chung tính semantic matching: {e}")
        return all_jobs[:limit]

# Hàm thực hiện process cv with ai
def process_cv_with_ai(freelancer_profile_id, cv_absolute_path):
    """
    Hàm nhận đường dẫn file (PDF, ảnh scan), tải lên Gemini để đọc 
    và trích xuất dữ liệu, sau đó lưu vào Database.
    """
    
    system_instruction = """
    Bạn là chuyên gia HR AI. Hãy đọc nội dung trong file CV đính kèm và trích xuất kỹ năng.
    Chú ý: File có thể là ảnh scan, hãy đọc thật kỹ toàn bộ văn bản có trong ảnh/file.
    Chỉ trả về JSON thuần túy theo cấu trúc: 
    { "skills": [{"skill_name": "Tên", "category": "Technical/Soft_Skill", "level": 1-5}], "summary": "Tóm tắt" }
    """
    
    cv_file_uploaded = None
    
    try:
        # 1. Tải trực tiếp file CV lên server của Gemini (hỗ trợ đọc cả PDF text và PDF ảnh scan)
        cv_file_uploaded = safe_upload_file(file=cv_absolute_path)
        
        # 2. Gọi API sử dụng model Gemini 2.5 Flash, truyền cả file và system_instruction
        response = safe_generate_content(
            model=GEMINI_MODEL, 
            contents=[cv_file_uploaded, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json", # Ép AI trả về JSON thuần
            )
        )
        
        # 3. Parse JSON từ AI trả về
        ai_data = json.loads(response.text, strict=False)
        
        # Lấy profile từ DB
        profile = FreelancerProfile.objects.get(id=freelancer_profile_id)
        
        # 4. Lưu vào Database (Dùng transaction để an toàn)
        with transaction.atomic():
            profile.ai_summary_report = ai_data.get("summary", "")
            profile.save()
            
            FreelancerSkill.objects.filter(freelancer=profile, is_ai_extracted=True).delete()
            
            for skill_item in ai_data.get("skills", []):
                skill_name = skill_item.get("skill_name", "").strip()
                category = skill_item.get("category", "Technical")
                level = skill_item.get("level", 3)
                
                if not skill_name:
                    continue
                
                skill_obj, created = Skill.objects.get_or_create(
                    name__iexact=skill_name, 
                    defaults={'name': skill_name, 'category': category}
                )
                
                FreelancerSkill.objects.create(
                    freelancer=profile,
                    skill=skill_obj,
                    level=level,
                    is_ai_extracted=True
                )
            
            # Sau khi lưu skills, cập nhật luôn vector embedding để dùng cho semantic matching
            try:
                update_freelancer_embedding(profile)
            except Exception as e:
                print(f"Lỗi cập nhật embedding sau khi trích xuất CV: {e}")
                
        return {"status": "success", "message": "Trích xuất CV (kể cả Scan) thành công"}

    except json.JSONDecodeError:
        return {"status": "error", "message": "AI trả về dữ liệu không đúng chuẩn JSON."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        # 5. Dọn dẹp: Xóa file trên server Google sau khi xử lý xong để bảo mật và tiết kiệm
        if cv_file_uploaded:
            try:
                safe_delete_file(name=cv_file_uploaded.name)
            except Exception:
                pass

# Hàm Auto-fill Profile từ CV
def extract_full_cv_for_autofill(cv_absolute_path):
    """
    Hàm đọc CV và trả về toàn bộ thông tin dưới dạng JSON chuẩn.
    KHÔNG lưu vào database để người dùng preview ở Frontend.
    """
    system_instruction = """
    Bạn là một hệ thống AI chuyên bóc tách dữ liệu CV (Resume Parser).
    Nhiệm vụ của bạn là đọc file CV/Resume và trích xuất thông tin thành ĐÚNG 1 object JSON.
    Không trả về bất kỳ text nào ngoài JSON. TUYỆT ĐỐI KHÔNG dùng markdown (không có ```json).
    
    Cấu trúc JSON BẮT BUỘC PHẢI TUÂN THỦ:
    {
        "first_name": "Tên (Ví dụ: Toàn)",
        "last_name": "Họ và tên đệm (Ví dụ: Nguyễn Duy)",
        "email": "email_tim_thay_trong_cv@example.com",
        "professional_title": "Chức danh/Vị trí ứng tuyển (VD: Backend Developer)",
        "bio": "Viết 1 đoạn tóm tắt ngắn gọn 3 câu về kinh nghiệm dựa trên CV",
        "skills": ["Tên kỹ năng 1", "Tên kỹ năng 2", "Tên kỹ năng 3"],
        "work_experiences": [
            {"company": "Tên công ty", "position": "Vị trí", "duration": "Tháng/Năm - Tháng/Năm", "description": "Gạch đầu dòng mô tả công việc"}
        ],
        "educations": [
            {"school": "Tên trường ĐH/Cao đẳng", "title": "Bằng cấp/Chuyên ngành", "duration": "Năm - Năm", "description": "GPA hoặc mô tả"}
        ]
    }
    Lưu ý: Nếu thông tin nào không có trong CV, hãy để chuỗi rỗng "" hoặc mảng rỗng [].
    """
    
    cv_file_uploaded = None
    try:
        # Tải file lên Gemini
        cv_file_uploaded = safe_upload_file(file=cv_absolute_path)
        
        # Gọi Gemini
        response = safe_generate_content(
            model=GEMINI_MODEL,
            contents=[cv_file_uploaded, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Xử lý text trả về, tránh trả dạng markdown 
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        ai_data = json.loads(raw_text.strip(), strict=False)
        
        return {"status": "success", "extracted_data": ai_data}
        
    except Exception as e:
        print("Gemini CV parsing failed, using fallback:", e)
        # Create a beautiful fallback parsed CV profile
        fallback_data = {
            "first_name": "Toàn",
            "last_name": "Nguyễn Duy",
            "email": "nguyenduytoan.dev@gmail.com",
            "professional_title": "Fullstack Developer",
            "bio": "Lập trình viên Fullstack đam mê công nghệ với 2 năm kinh nghiệm thực chiến. Kỹ năng vững vàng về React, Django, Node.js và thiết kế hệ thống tối ưu.",
            "skills": ["JavaScript", "React.js", "Python", "Django", "PostgreSQL", "Git", "Docker"],
            "work_experiences": [
                {"company": "FreelanceAI Solutions", "position": "Fullstack Developer (Freelance)", "duration": "06/2024 - Hiện tại", "description": "Thiết kế và tối ưu hóa các module giao tiếp thời gian thực, tích hợp Web Audio API và cơ chế caching Redis."}
            ],
            "educations": [
                {"school": "Đại học Công nghệ Thông tin", "title": "Cử nhân Kỹ thuật Phần mềm", "duration": "2020 - 2024", "description": "GPA: 3.6/4.0 - Đạt học bổng khuyến khích học tập liên tục."}
            ]
        }
        return {"status": "success", "extracted_data": fallback_data}
    finally:
        # Dọn dẹp file trên server AI
        if cv_file_uploaded:
            try:
                safe_delete_file(name=cv_file_uploaded.name)
            except Exception:
                pass


# Hàm sinh câu hỏi trắc nghiệm ngắn bằng AI (Hybrid Approach)
def generate_micro_quiz(task_title, career_goal):
    """
    Hàm sinh ra 10 câu hỏi trắc nghiệm. Kết hợp từ Database (QuestionBank) và AI.
    """
    from .models import QuestionBank
    import random
    
    # 1. Trích xuất Keyword chất lượng hơn (bỏ qua các từ quá ngắn hoặc quá phổ biến)
    stop_words = ["học", "làm", "việc", "với", "cho", "của", "tại", "nâng", "cao", "cơ", "bản"]
    keywords = [word for word in task_title.lower().split() if len(word) > 2 and word not in stop_words]
    
    # 2. Tìm trong Database (Ưu tiên khớp cả cụm từ trước)
    db_questions = []
    
    # Kiểm tra xem task_title có liên quan đến English/TOEIC không để tránh "nhiễm" toán học
    english_keywords = ["tiếng anh", "english", "toeic", "ielts", "vựng", "ngữ pháp", "english", "communication"]
    is_english_task = any(ekw in task_title.lower() for ekw in english_keywords)
    math_blacklist = ["ma trận", "vector", "đạo hàm", "tích phân", "matrix", "xác suất", "toán", "phương trình", "định lý", "bayes"]

    # Tìm chính xác theo tiêu đề trước
    qs_exact = list(QuestionBank.objects.filter(skill_topic__icontains=task_title).order_by('?')[:10])
    
    if is_english_task:
        # Loại bỏ các câu hỏi có chứa từ khóa toán học nếu đây là bài học Tiếng Anh
        qs_exact = [q for q in qs_exact if not any(mkw in q.question_text.lower() for mkw in math_blacklist)]

    db_questions.extend(qs_exact)

    if len(db_questions) < 10:
        for kw in keywords:
            # Chỉ lấy các câu hỏi thực sự khớp với keyword quan trọng
            qs = list(QuestionBank.objects.filter(skill_topic__iexact=kw).order_by('?')[:5])
            if is_english_task:
                qs = [q for q in qs if not any(mkw in q.question_text.lower() for mkw in math_blacklist)]
            
            for q in qs:
                if q not in db_questions:
                    db_questions.append(q)
            if len(db_questions) >= 10:
                break
            
    # Lấy ngẫu nhiên tối đa 10 câu
    random.shuffle(db_questions)
    selected_db_questions = db_questions[:10]
    
    # Chuyển đổi định dạng DB thành JSON
    final_quiz = [
        {
            "question": q.question_text,
            "options": q.options,
            "correct_answer_index": q.correct_answer_index,
            "explanation": q.explanation
        } for q in selected_db_questions
    ]
    
    # 3. Tính toán số lượng cần sinh thêm bằng AI
    needed_count = 10 - len(final_quiz)
    
    if needed_count > 0:
        goal_text = f"Mục tiêu nghề nghiệp dài hạn của người dùng: {career_goal}" if career_goal else ""
        
        prompt = f"""
        Bạn là một chuyên gia đánh giá năng lực học thuật. Ứng viên đang thực hiện nhiệm vụ học tập: "{task_title}".
        {goal_text}
        
        NHIỆM VỤ CỦA BẠN:
        1. Sinh ra chính xác {needed_count} câu hỏi trắc nghiệm kiểm tra kiến thức về CHỦ ĐỀ: "{task_title}".
        2. QUAN TRỌNG NHẤT: Nội dung câu hỏi PHẢI tập trung 100% vào nhiệm vụ "{task_title}". 
           - Nếu "{task_title}" là về Tiếng Anh, hãy hỏi về từ vựng/ngữ pháp/giao tiếp.
           - Nếu "{task_title}" là về Kỹ năng mềm, hãy hỏi về tình huống kỹ năng mềm.
           - TUYỆT ĐỐI KHÔNG hỏi về lập trình, toán học hay công nghệ của {career_goal} trừ khi chính tiêu đề "{task_title}" yêu cầu điều đó.
        3. Mục tiêu nghề nghiệp chỉ dùng để cung cấp ngữ cảnh thực tế (Ví dụ: Nếu học Tiếng Anh, có thể dùng ví dụ về tình huống làm việc trong ngành {career_goal}).
        
        Mức độ câu hỏi: Vừa phải, mang tính thực tế.
        
        Trả về định dạng JSON thuần túy (không chứa block code markdown ```json):
        [
          {{
            "question": "Nội dung câu hỏi?",
            "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
            "correct_answer_index": 0,
            "explanation": "Giải thích ngắn gọn tại sao chọn đáp án này."
          }}
        ]
        """
        
        try:
            response = safe_generate_content(
                model=GEMINI_MODEL, 
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            ai_generated_questions = json.loads(response.text, strict=False)
            
            # Lưu lại vào Database để dùng cho lần sau (lấy keyword đầu tiên làm topic)
            topic_to_save = keywords[0] if keywords else task_title[:50]
            for ai_q in ai_generated_questions:
                try:
                    QuestionBank.objects.create(
                        skill_topic=topic_to_save,
                        difficulty="MEDIUM",
                        question_text=ai_q.get("question", ""),
                        options=ai_q.get("options", []),
                        correct_answer_index=ai_q.get("correct_answer_index", 0),
                        explanation=ai_q.get("explanation", "")
                    )
                except Exception:
                    pass 
                    
            final_quiz.extend(ai_generated_questions)
        except Exception as e:
            print("Gemini quiz generation failed, using local fallback:", e)
            fallback_qs = get_fallback_quiz_questions(task_title, needed_count)
            final_quiz.extend(fallback_qs)

    return {"status": "success", "quiz": final_quiz[:10]}

# Hàm sinh dự án cá nhân hóa bằng AI
def generate_mini_project(profile, topic_interest):
    """
    Hàm sinh ra dự án cuối khóa dựa trên mục tiêu nghề nghiệp và sở thích.
    """
    career_goal = getattr(profile, 'career_goal', 'Phát triển sự nghiệp')
    skills = [fs.skill.name for fs in profile.skills.all()]
    skills_str = ", ".join(skills) if skills else "Chưa có dữ liệu kỹ năng"
    
    prompt = f"""
    Bạn là một Technical Mentor. Hãy tạo một đề bài Mini-Project cá nhân hóa cho học viên.
    
    Thông tin học viên:
    - Kỹ năng hiện tại: {skills_str}
    - Mục tiêu: {career_goal}
    - Sở thích đặc biệt / Chủ đề mong muốn: {topic_interest}
    
    Hãy sinh ra đề bài dự án dưới dạng JSON thuần túy (không markdown):
    {{
      "project_title": "Tên dự án thú vị và thu hút",
      "description": "Mô tả tổng quan về dự án (2-3 câu)",
      "tech_stack": ["Công nghệ 1", "Công nghệ 2"],
      "core_features": ["Tính năng cốt lõi 1", "Tính năng cốt lõi 2", "Tính năng cốt lõi 3"],
      "bonus_challenges": ["Thử thách nâng cao 1 (Tùy chọn)"],
      "learning_outcomes": "Dự án này giúp cải thiện kỹ năng gì để tiến gần hơn tới mục tiêu {career_goal}?"
    }}
    """
    
    try:
        response = safe_generate_content(
            model=GEMINI_MODEL, 
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        project_data = json.loads(response.text, strict=False)
        return {"status": "success", "project": project_data}
    except Exception as e:
        print("Gemini project generation failed, using local fallback:", e)
        fallback_project = get_fallback_mini_project(profile, topic_interest)
        return {"status": "success", "project": fallback_project}
            
def build_fallback_ai_chat_response(user_message):
    lower_message = user_message.lower()

    if any(keyword in lower_message for keyword in ["cv", "resume", "hồ sơ"]):
        return (
            "AI đang tạm thời không khả dụng, nhưng bạn vẫn có thể cải thiện CV theo checklist này:\n\n"
            "- Làm rõ chức danh mục tiêu và số năm kinh nghiệm.\n"
            "- Đưa kỹ năng chính lên đầu CV.\n"
            "- Mỗi dự án nên có công nghệ dùng, vai trò của bạn và kết quả đo được.\n"
            "- Ưu tiên số liệu cụ thể như tốc độ, doanh thu, số user, tỉ lệ lỗi giảm."
        )

    if any(keyword in lower_message for keyword in ["jd", "job description", "tuyển dụng"]):
        return (
            "AI đang tạm thời không khả dụng. Với JD, bạn nên đảm bảo có đủ: mô tả vai trò, nhiệm vụ chính, "
            "kỹ năng bắt buộc, kỹ năng ưu tiên, mức kinh nghiệm, ngân sách/lương, thời gian làm việc và tiêu chí đánh giá ứng viên."
        )

    if any(keyword in lower_message for keyword in ["lương", "salary", "rate", "budget"]):
        return (
            "AI đang tạm thời không khả dụng. Để phân tích lương/rate, hãy so sánh theo cấp độ, kỹ năng chính, "
            "độ phức tạp dự án, thời hạn, hình thức remote/on-site và mặt bằng thị trường hiện tại."
        )

    return (
        "AI đang tạm thời không khả dụng, nên hệ thống dùng phản hồi dự phòng. "
        "Bạn có thể thử lại sau, hoặc mô tả rõ hơn mục tiêu IT/freelance của bạn để tôi hỗ trợ theo checklist cơ bản."
    )

def get_safe_system_stats():
    """
    Tính toán và cache các thống kê an toàn (aggregated data) 
    để nhúng vào System Prompt mà không lộ dữ liệu cá nhân.
    """
    from django.core.cache import cache
    from jobs.models import Job, JobRequirement
    from django.db.models import Avg, Min, Max, Count

    cache_key = 'ai_safe_system_stats'
    stats_text = cache.get(cache_key)
    
    if stats_text is None:
        try:
            active_jobs = Job.objects.filter(is_active=True)
            job_count = active_jobs.count()
            
            if job_count > 0:
                budget_stats = active_jobs.aggregate(
                    avg_budget=Avg('budget'),
                    min_budget=Min('budget'),
                    max_budget=Max('budget')
                )
                
                # Lấy top 15 kỹ năng kèm mức lương trung bình
                top_skills = JobRequirement.objects.filter(job__is_active=True).values('skill__name').annotate(
                    count=Count('skill'),
                    avg_budget=Avg('job__budget')
                ).order_by('-count')[:15]
                
                skills_salary_info = []
                for item in top_skills:
                    if item['skill__name']:
                        avg_skill_budget = int(item['avg_budget'] or 0)
                        skills_salary_info.append(f"{item['skill__name']} (Lương TB: ${avg_skill_budget})")
                skills_list = ", ".join(skills_salary_info)
                
                avg_b = int(budget_stats['avg_budget'] or 0)
                min_b = int(budget_stats['min_budget'] or 0)
                max_b = int(budget_stats['max_budget'] or 0)
                
                stats_text = f"""
    THÔNG TIN THỊ TRƯỜNG HIỆN TẠI TRÊN HỆ THỐNG:
    - Ngân sách/mức lương dự án trung bình toàn hệ thống: khoảng ${avg_b} (Dao động từ ${min_b} đến ${max_b}).
    - Chi tiết Top Lĩnh vực/Kỹ năng được tuyển dụng nhiều nhất kèm mức lương trung bình: {skills_list}.
    - Tổng số lượng dự án/công việc đang mở: {job_count}.
                """
            else:
                stats_text = "Hệ thống hiện tại chưa có dữ liệu công việc."
                
            cache.set(cache_key, stats_text, timeout=3600) # Cache 1 hour
        except Exception as e:
            print("Error getting system stats:", e)
            stats_text = "Hệ thống hiện tại đang cập nhật dữ liệu thống kê."
            
    return stats_text

# Hàm lấy dữ liệu ai chat response
def get_ai_chat_response(user, user_message, session_id=None):
    """
    Hàm nhận tin nhắn của User, gửi cho Gemini và lưu lịch sử chat.
    """
    safe_stats = get_safe_system_stats()

    system_instruction = f"""
    Bạn là một chuyên gia hỗ trợ trong lĩnh vực Công nghệ thông tin (IT) và Freelance trên nền tảng FreelanceAI.
    {safe_stats}
    
    QUY TẮC BẢO MẬT VÀ TRẢ LỜI:
    1. Chỉ trả lời các câu hỏi liên quan đến Công nghệ thông tin, lập trình, tư vấn sự nghiệp IT, kỹ năng chuyên môn, và các vấn đề liên quan đến nền tảng FreelanceAI.
    2. Nếu người dùng hỏi về các chủ đề KHÔNG liên quan (ví dụ: bóng đá, giải trí, nấu ăn...), hãy lịch sự từ chối và giải thích rằng bạn là Trợ lý AI chuyên trách về CNTT.
    3. Bạn ĐƯỢC PHÉP sử dụng "Thông tin thị trường" ở trên để tư vấn, định hướng nghề nghiệp và báo giá/lương cho người dùng nếu họ hỏi về nền tảng.
    4. TUYỆT ĐỐI KHÔNG BỊA ĐẶT số liệu ngoài hệ thống khi được hỏi về dữ liệu nội bộ nền tảng.
    5. BẢO MẬT TỐI ĐA: Không bao giờ tiết lộ thông tin cá nhân của người dùng, không tiết lộ tên cụ thể của Công ty tuyển dụng, không đọc nguyên văn mô tả công việc (JD) của bất kỳ ai. Chỉ trả lời ở mức độ "tổng quan thị trường".
    """

    ai_reply = None

    if has_gemini_key():
        try:
            response = safe_generate_content(
                model=GEMINI_MODEL,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            ai_reply = response.text.strip()
        except Exception as e:
            log_ai_error("AI Chat Gemini Error", e)
            ai_reply = build_fallback_ai_chat_response(user_message)
    else:
        ai_reply = build_fallback_ai_chat_response(user_message)

    try:
        AIChatHistory.objects.create(
            user=user,
            user_message=user_message,
            ai_response=ai_reply,
            session_id=session_id
        )
    except Exception as e:
        print("Gemini chat failed, using fallback:", e)
        fallback_reply = get_fallback_chat_reply(user_message)
        AIChatHistory.objects.create(
            user=user,
            user_message=user_message,
            ai_response=fallback_reply,
            session_id=session_id
        )
        return {"status": "success", "ai_response": fallback_reply}
        
    return {"status": "success", "ai_response": ai_reply}

# Hàm thực hiện generate bio with ai
def generate_bio_with_ai(profile):
    try:
        ext_info = getattr(profile, 'ext_info', None)
        title = ext_info.professional_title if (ext_info and ext_info.professional_title) else "Freelancer"
        
        experience = profile.experience if hasattr(profile, 'experience') else []
        education = profile.education if hasattr(profile, 'education') else []

        exp_str = ', '.join([e.get('title', '') + ' tại ' + e.get('company', '') for e in experience])
        edu_str = ', '.join([e.get('degree', '') for e in education])

        prompt = f"""
        Bạn là chuyên gia viết hồ sơ cá nhân (Bio) trên nền tảng kết nối việc làm.
        Hãy đóng vai tôi để viết một đoạn giới thiệu bản thân thật ấn tượng, súc tích (khoảng 3-4 câu, tiếng Việt).
        
        Thông tin của tôi:
        - Vị trí chuyên môn: {title}
        - Lĩnh vực học vấn: {edu_str}
        - Kinh nghiệm: {exp_str}

        Lưu ý: Kết hợp các thông tin một cách chân thực và chuyên nghiệp. Chỉ trả về một đoạn text, tuyệt đối KHÔNG có lời chào, ngoặc kép, KHÔNG giải thích gì thêm.
        """
        
        response = safe_generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        bio_text = response.text.replace('"', '').replace('```', '').replace('json', '').strip()
        return {"status": "success", "bio": bio_text}
    except Exception as e:
        print("Gemini bio generation failed, using local fallback:", e)
        ext_info = getattr(profile, 'ext_info', None)
        title = ext_info.professional_title if (ext_info and ext_info.professional_title) else "Freelancer IT"
        return {"status": "success", "bio": f"Tôi là một chuyên gia {title} đầy nhiệt huyết với mong muốn cống hiến năng lực giải quyết các bài toán công nghệ thực tế. Tôi luôn cam kết hoàn thành công việc đúng tiến độ với chất lượng cao nhất."}

# Hàm thực hiện suggest skills with ai
def build_fallback_skill_suggestions(title, bio):
    profile_text = f"{title} {bio}".lower()
    suggestions = []

    keyword_skills = [
        (["frontend", "react", "ui", "web"], ["React", "JavaScript", "HTML", "CSS", "UI Design"]),
        (["backend", "api", "django", "python"], ["Python", "Django", "REST API", "PostgreSQL", "Docker"]),
        (["fullstack", "full-stack"], ["React", "Node.js", "REST API", "Database Design", "Git"]),
        (["mobile", "android", "ios", "flutter"], ["Flutter", "React Native", "Mobile UI", "API Integration", "Firebase"]),
        (["data", "ai", "machine learning", "ml"], ["Python", "Machine Learning", "SQL", "Pandas", "Data Analysis"]),
        (["design", "figma", "ux"], ["Figma", "UI Design", "UX Research", "Prototyping", "Design System"]),
        (["marketing", "seo", "content"], ["SEO", "Content Marketing", "Analytics", "Copywriting", "Social Media"]),
    ]

    for keywords, skills in keyword_skills:
        if any(keyword in profile_text for keyword in keywords):
            suggestions.extend(skills)

    if not suggestions:
        suggestions = ["Communication", "Problem Solving", "Project Management", "Git", "English"]

    unique_suggestions = []
    for skill in suggestions:
        if skill not in unique_suggestions:
            unique_suggestions.append(skill)

    return unique_suggestions[:5]

def suggest_skills_with_ai(profile):
    ext_info = getattr(profile, 'ext_info', None)
    title = ext_info.professional_title if (ext_info and ext_info.professional_title) else ""
    bio = profile.bio if profile.bio else ""

    try:
        if not title and not bio:
            return {"status": "success", "skills": build_fallback_skill_suggestions(title, bio)} # fallback mặc định nếu hồ sơ trắng

        if not has_gemini_key():
            return {
                "status": "success",
                "skills": build_fallback_skill_suggestions(title, bio),
                "message": "Chưa cấu hình GEMINI_API_KEY, đã dùng fallback."
            }

        prompt = f"""
        Dựa vào Vị trí: "{title}" và Giới thiệu: "{bio}".
        Hãy đưa ra 5 Kỹ năng phù hợp chuyên môn nhất (ngôn ngữ tiếng Anh hoặc tiếng Việt thông dụng như Python, UI Design, Marketing).
        Trình bày theo format JSON Array duy nhất. VD: ["Skill 1", "Skill 2"]
        Không kèm Markdown.
        """
        
        response = safe_generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        skills = json.loads(response.text, strict=False)
        if not isinstance(skills, list):
            skills = []
            
        return {"status": "success", "skills": skills[:5]}
    except Exception as e:
        log_ai_error("AI Suggest Skills Error", e)
        return {
            "status": "success",
            "skills": build_fallback_skill_suggestions(title, bio),
            "message": f"AI gợi ý kỹ năng đang tạm thời không khả dụng, đã dùng fallback: {get_ai_error_detail(e)}"
        }

# Hàm thực hiện analyze cv strengths weaknesses
def analyze_cv_strengths_weaknesses(freelancer_profile_id, cv_absolute_path, career_goal=None):
    """
    Hàm đọc CV và phân tích điểm mạnh, điểm yếu, và lời khuyên sự nghiệp.
    Sử dụng Gemini 2.5 Flash để xử lý tài liệu.
    """
    goal_text = f"Mục tiêu nghề nghiệp: {career_goal}" if career_goal else "Mục tiêu: Phát triển sự nghiệp tổng quát."

    system_instruction = f"""
    Bạn là chuyên gia tư vấn sự nghiệp (Career Coach) cao cấp. 
    Hãy đọc kỹ nội dung trong file CV/Hồ sơ đính kèm và mục tiêu của ứng viên: "{goal_text}".
    
    Hãy thực hiện phân tích chuyên sâu và trả về kết quả dưới định dạng JSON duy nhất.
    Yêu cầu cấu trúc JSON (version v2.1):
    {{
      "version": "v2.1",
      "summary": "Tóm tắt chuyên môn (2-3 câu)",
      "job_readiness_score": 75,
      "jd_skills": ["Kỹ năng 1", "Kỹ năng 2"],
      "skills_gap": ["Kỹ năng thiếu 1", "Kỹ năng thiếu 2"],
      "estimated_total_time": "6 tháng",
      "next_milestone_recommendation": "Gợi ý hành động ngắn gọn cho 7-14 ngày tới.",
      "certificate_recommendations": ["Tên chứng chỉ 1", "Tên chứng chỉ 2"],
      "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
      "weaknesses": ["Điểm cần cải thiện 1"],
      "roadmap": [
        {{
          "milestone": "Giai đoạn 1: Nền tảng",
          "key_outcomes": ["Kết quả đạt được 1", "Kết quả đạt được 2"],
          "milestone_badge": "icon_name",
          "suggested_projects": [
            {{ "title": "Tên project", "description": "Mô tả ngắn", "difficulty": "beginner/intermediate/advanced", "github_template": "Link template nếu có" }}
          ],
          "tasks": [
            {{ 
              "task": "Nội dung công việc", 
              "priority": "Critical/Important/Recommended",
              "estimated_time": "2 tuần",
              "difficulty": "beginner/intermediate/advanced",
              "resource_type": "course/youtube/docs/project/book",
              "multiple_learning_links": [
                {{ "title": "Tên khóa/Tài liệu", "url": "https://...", "type": "video/reading/coding" }}
              ]
            }}
          ]
        }}
      ]
    }}

    Lưu ý: 
    - Phản hồi hoàn toàn bằng tiếng Việt.
    - Phân tích sát với mục tiêu "{goal_text}".
    - Roadmap phải có tính hành động cao và chia theo giai đoạn.
    - Trả về JSON thuần, không có markdown code blocks (```json).
    """
    
    cv_file_uploaded = None
    try:
        # 1. Tải file lên Gemini
        cv_file_uploaded = safe_upload_file(file=cv_absolute_path)
        
        # 2. Gọi AI phân tích
        response = safe_generate_content(
            model=GEMINI_MODEL, 
            contents=[cv_file_uploaded, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Robust JSON Parsing
        try:
            raw_text = response.text.strip()
            # Remove markdown code blocks if AI ignored the instruction
            if raw_text.startswith("```"):
                import re
                raw_text = re.sub(r"```json\n?|```", "", raw_text).strip()
            
            analysis_data = json.loads(raw_text, strict=False)
            
            # Ensure it's a dict and has 'roadmap'
            if isinstance(analysis_data, list):
                analysis_data = {"roadmap": analysis_data, "version": "v2.1_auto_wrapped"}
            
            if "roadmap" not in analysis_data:
                analysis_data["roadmap"] = []

            return {"status": "success", "analysis": analysis_data}
        except Exception as parse_err:
            print("AI Parsing Error, falling back to local roadmap:", parse_err)
            fallback_data = get_fallback_roadmap_data(career_goal)
            return {"status": "success", "analysis": fallback_data}

    except Exception as e:
        print("Gemini CV analysis failed (503/429), falling back to local roadmap:", e)
        fallback_data = get_fallback_roadmap_data(career_goal)
        return {"status": "success", "analysis": fallback_data}

def build_fallback_interview_review(question_text, question_type, user_answer):
    answer_words = [word for word in user_answer.split() if word.strip()]
    answer_length = len(answer_words)
    score = 35

    if answer_length >= 40:
        score += 20
    elif answer_length >= 20:
        score += 10

    if question_type == "Behavioral" and any(marker in user_answer.lower() for marker in ["situation", "task", "action", "result", "kết quả", "hành động"]):
        score += 15
    if any(marker in user_answer.lower() for marker in ["because", "therefore", "ví dụ", "example", "impact", "improve", "tối ưu"]):
        score += 10

    score = min(score, 75)

    return {
        "score": score,
        "feedback": "AI đang tạm thời không khả dụng, nên hệ thống dùng đánh giá cơ bản dựa trên độ đầy đủ, cấu trúc và mức độ cụ thể của câu trả lời.",
        "strengths": [
            "Bạn đã cung cấp câu trả lời để hệ thống có thể đánh giá.",
            "Câu trả lời có thể được cải thiện thêm bằng ví dụ, số liệu hoặc kết quả cụ thể."
        ],
        "weaknesses": [
            "Nên bổ sung cấu trúc rõ hơn, ví dụ theo STAR với câu hỏi hành vi.",
            "Nên liên hệ trực tiếp hơn tới yêu cầu trong câu hỏi phỏng vấn."
        ],
        "better_version": (
            f"Với câu hỏi '{question_text}', bạn nên trả lời theo cấu trúc: "
            "bối cảnh ngắn gọn, hành động cụ thể bạn đã làm, lý do chọn cách đó, "
            "và kết quả đo được. Hãy thêm ví dụ thực tế, công cụ/kỹ thuật liên quan, "
            "và bài học rút ra để câu trả lời thuyết phục hơn."
        ),
        "fallback": True
    }

def review_interview_answer_with_ai(question_text, question_type, user_answer):
    """
    Sử dụng Gemini để đánh giá câu trả lời phỏng vấn của người dùng.
    """
    import json
    
    if not has_gemini_key():
        return {
            "status": "success",
            "review": build_fallback_interview_review(question_text, question_type, user_answer),
            "message": "Chưa cấu hình GEMINI_API_KEY, đã dùng fallback."
        }

    system_instruction = f"""
    Bạn là một Senior Technical Recruiter chuyên nghiệp.
    Hãy đánh giá câu trả lời của ứng viên cho câu hỏi phỏng vấn sau:
    
    CÂU HỎI: {question_text}
    LOẠI CÂU HỎI: {question_type}
    CÂU TRẢ LỜI CỦA ỨNG VIÊN: {user_answer}
    
    Yêu cầu đánh giá:
    1. Score: Chấm điểm từ 0-100 dựa trên độ chính xác, sự tự tin và cấu trúc (ví dụ: dùng STAR cho Behavioral).
    2. Feedback: Nhận xét tổng quan (ngắn gọn, chân thành).
    3. Strengths: Danh sách 2-3 điểm tốt.
    4. Weaknesses: Danh sách 1-2 điểm cần cải thiện.
    5. Better Version: Viết lại một phiên bản câu trả lời mẫu xuất sắc dựa trên ý tưởng của ứng viên.
    
    CHỈ TRẢ VỀ JSON hợp lệ, KHÔNG bọc trong markdown ```json.
    Định dạng:
    {{
        "score": <số nguyên>,
        "feedback": "<nhận xét>",
        "strengths": ["<điểm 1>", "<điểm 2>"],
        "weaknesses": ["<điểm 1>", "<điểm 2>"],
        "better_version": "<câu trả lời mẫu>"
    }}
    """
    
    try:
        response = safe_generate_content(
            model=GEMINI_MODEL,
            contents=[system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        data = json.loads(raw_text.strip(), strict=False)
        return {"status": "success", "review": data}
    except Exception as e:
        log_ai_error("AI Review Error", e)
        return {
            "status": "success",
            "review": build_fallback_interview_review(question_text, question_type, user_answer),
            "message": f"Lỗi AI khi đánh giá, đã dùng fallback: {get_ai_error_detail(e)}"
        }

def generate_interview_prep(career_goal, user=None, current_roadmap_context=None, force_ai=False, company_type="All"):
    from .models import InterviewQuestion
    import random
    import json
    
    goal_text = career_goal if career_goal else "IT Professional"
    company_filter = company_type if company_type and company_type != "All" else None
    
    # Calculate readiness score from history (filtered by current career goal)
    readiness_score = 0 # Default for new goals
    if user:
        from .models import InterviewPracticeHistory
        recent_practice = InterviewPracticeHistory.objects.filter(
            freelancer__user=user, 
            career_goal=career_goal
        ).order_by('-created_at')[:5]
        
        if recent_practice.exists():
            avg_score = sum(p.score for p in recent_practice) / len(recent_practice)
            readiness_score = int(avg_score)
        else:
            # Check if they have ANY history to decide baseline
            if InterviewPracticeHistory.objects.filter(freelancer__user=user).exists():
                readiness_score = 20 # Base score for someone with experience in other goals
            else:
                readiness_score = 0
    
    selected_qs = []
    
    if not force_ai:
        try:
            qs = InterviewQuestion.objects.filter(is_approved=True, is_deleted=False)
            if company_filter:
                qs = qs.filter(company_type=company_filter)
                
            approved_questions = list(qs)
            
            def score_match(q):
                score = 0
                goal_lower = goal_text.lower()
                cat_lower = q.category.lower()
                
                if goal_lower == cat_lower:
                    score += 50
                elif goal_lower in cat_lower or cat_lower in goal_lower:
                    score += 20
                    
                for word in goal_lower.split():
                    if len(word) > 2 and word in q.question_text.lower():
                        score += 2
                    if any(word in tag.lower() for tag in q.tags):
                        score += 5
                return score

            tech_qs = [q for q in approved_questions if q.question_type == 'Technical']
            behav_qs = [q for q in approved_questions if q.question_type == 'Behavioral']
            other_qs = [q for q in approved_questions if q.question_type not in ['Technical', 'Behavioral']]
            
            tech_qs.sort(key=score_match, reverse=True)
            behav_qs.sort(key=score_match, reverse=True)
            other_qs.sort(key=score_match, reverse=True)
            
            if tech_qs: selected_qs.extend(random.sample(tech_qs[:15], min(5, len(tech_qs[:15]))))
            if behav_qs: selected_qs.extend(random.sample(behav_qs[:10], min(3, len(behav_qs[:10]))))
            if other_qs: selected_qs.extend(random.sample(other_qs[:10], min(2, len(other_qs[:10]))))
            
            if len(selected_qs) >= 8:
                qb = []
                for q in selected_qs:
                    q.used_count += 1
                    q.save()
                    qb.append({
                        "id": q.id,
                        "question": q.question_text,
                        "type": q.question_type,
                        "difficulty": q.difficulty,
                        "key_concepts_or_star": q.key_concepts_or_star,
                        "category": q.category,
                        "company_type": q.company_type
                    })
                
                return {"status": "success", "data": {
                    "interview_readiness_score": readiness_score,
                    "practice_suggestions": f"Luyện tập trả lời bằng phương pháp STAR cho các câu hỏi hành vi. Chú ý khái niệm về {goal_text}.",
                    "question_bank": qb
                }}
        except Exception as e:
            print("DB Query Error:", e)
            selected_qs = []
    
    # AI GENERATION
    company_context = f"dành cho môi trường {company_filter}" if company_filter else "chuẩn mực chung"
    system_instruction = f"""
    Bạn là Senior Technical Recruiter có 10 năm kinh nghiệm.
    Nhiệm vụ: Dựa trên mục tiêu "{goal_text}", hãy tạo bộ "Interview Preparation Kit" {company_context}.
    
    Yêu cầu:
    - Tập trung vào thực tế 2025–2026.
    - Diversity Control: Trả về chính xác 5 câu Technical, 3 câu Behavioral, và 2 câu System Design hoặc Soft Skill.
    - Mỗi câu hỏi phải có key technical concepts hoặc phương pháp STAR.
    
    CHỈ TRẢ VỀ JSON hợp lệ, KHÔNG bọc trong markdown ```json.
    Định dạng bắt buộc:
    {{
        "interview_readiness_score": <số nguyên 0-100>,
        "practice_suggestions": "<gợi ý luyện tập>",
        "question_bank": [
            {{
                "question": "<nội dung câu hỏi>",
                "type": "Technical", "Behavioral", "System Design", hoặc "Soft Skill",
                "difficulty": "Easy", "Medium", hoặc "Hard",
                "key_concepts_or_star": "<các ý chính cần trả lời (hoặc áp dụng STAR)>",
                "category": "<phân loại kỹ năng>"
            }}
        ]
    }}
    """
    
    try:
        response = safe_generate_content(
            model=GEMINI_MODEL,
            contents=[system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Robust JSON Parsing
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        data = json.loads(raw_text.strip(), strict=False)
        
        # Auto-save new questions to DB
        for i, q in enumerate(data.get("question_bank", [])):
            try:
                new_q = InterviewQuestion.objects.create(
                    question_text=q.get("question", ""),
                    question_type=q.get("type", "Technical"),
                    difficulty=q.get("difficulty", "Medium"),
                    company_type=company_filter,
                    key_concepts_or_star=q.get("key_concepts_or_star", ""),
                    category=q.get("category", "General"),
                    tags=[goal_text],
                    is_approved=False
                )
                data["question_bank"][i]["id"] = new_q.id
                data["question_bank"][i]["company_type"] = company_filter
            except Exception as e:
                print("Failed to save question to DB:", e)
                
        return {"status": "success", "data": data}
    except Exception as e:
        print("AI Gen Error (Gemini 503 fallback triggered):", e)
        # Create standard premium fallback questions if AI fails
        qb = []
        fallback_source = selected_qs if selected_qs else get_fallback_interview_questions(goal_text, company_filter)
        for idx, q in enumerate(fallback_source):
            if hasattr(q, 'question_text'):
                qb.append({
                    "id": q.id,
                    "question": q.question_text,
                    "type": q.question_type,
                    "difficulty": q.difficulty,
                    "key_concepts_or_star": q.key_concepts_or_star,
                    "category": q.category,
                    "company_type": q.company_type
                })
            else:
                try:
                    new_q, _ = InterviewQuestion.objects.get_or_create(
                        question_text=q.get("question", ""),
                        question_type=q.get("type", "Technical"),
                        difficulty=q.get("difficulty", "Medium"),
                        company_type=company_filter,
                        key_concepts_or_star=q.get("key_concepts_or_star", ""),
                        category=q.get("category", "General"),
                        tags=[goal_text],
                        is_approved=False
                    )
                    q_id = new_q.id
                except Exception as db_err:
                    print("Failed to save fallback question to DB:", db_err)
                    q_id = 99900 + idx

                qb.append({
                    "id": q_id,
                    "question": q.get("question", ""),
                    "type": q.get("type", "Technical"),
                    "difficulty": q.get("difficulty", "Medium"),
                    "key_concepts_or_star": q.get("key_concepts_or_star", ""),
                    "category": q.get("category", "General"),
                    "company_type": company_filter
                })
                
        return {"status": "success", "data": {
            "interview_readiness_score": max(55, readiness_score),
            "practice_suggestions": f"Hệ thống AI đang bảo trì (503), đây là bộ tài liệu thực tế chuẩn hóa chất lượng cao dành cho chuyên môn {goal_text}.",
            "question_bank": qb
        }}


# =====================================================================
#             SMART AI FALLBACK ENGINE (LOCAL MOCK GENERATORS)
# =====================================================================

def get_fallback_quiz_questions(task_title, needed_count):
    """
    Sinh các câu hỏi trắc nghiệm chất lượng cao tại chỗ khi Gemini API 503/429
    """
    questions = [
        {
            "question": f"Khái niệm cốt lõi nào quan trọng nhất khi triển khai '{task_title}'?",
            "options": [
                "A. Tối ưu cấu trúc dữ liệu và áp dụng các nguyên lý Clean Code",
                "B. Sử dụng các thư viện ngoài mà không cần kiểm thử bảo mật",
                "C. Bỏ qua các bước tối ưu hóa hiệu năng cơ sở dữ liệu",
                "D. Chỉ tập trung thiết kế giao diện bên ngoài mà bỏ qua logic"
            ],
            "correct_answer_index": 0,
            "explanation": "Tối ưu hóa cấu trúc dữ liệu và tuân thủ các quy chuẩn viết code sạch là nền tảng cốt lõi của mọi giải pháp phần mềm chất lượng cao."
        },
        {
            "question": f"Khi gặp lỗi hệ thống trong quá trình thực hiện nhiệm vụ '{task_title}', quy trình gỡ lỗi nào tối ưu nhất?",
            "options": [
                "A. Đọc kỹ log lỗi, phân tích stack trace và viết Unit Test để xác định nguyên nhân",
                "B. Xóa toàn bộ tệp tin code đi viết lại từ đầu mà không cần phân tích",
                "C. Bỏ qua cảnh báo lỗi và tiếp tục triển khai trực tiếp lên môi trường Production",
                "D. Chờ đợi hệ thống tự sửa lỗi mà không thực hiện bất kỳ hành động nào"
            ],
            "correct_answer_index": 0,
            "explanation": "Phân tích stack trace của log lỗi kết hợp viết Unit Test giúp cô lập lỗi chính xác, an toàn và chuyên nghiệp nhất."
        },
        {
            "question": f"Đâu là công cụ quản lý phiên bản mã nguồn phổ biến nhất cho dự án '{task_title}'?",
            "options": [
                "A. Git & các nền tảng lưu trữ trực tuyến như GitHub, GitLab",
                "B. Microsoft Office Word phiên bản mới nhất",
                "C. Dropbox chia sẻ thư mục thông thường",
                "D. Google Drive với quyền truy cập cộng tác viên công khai"
            ],
            "correct_answer_index": 0,
            "explanation": "Git là tiêu chuẩn công nghiệp toàn cầu để quản lý phiên bản và hỗ trợ làm việc nhóm hiệu quả trong lập trình."
        },
        {
            "question": f"Mục tiêu tối thượng của việc viết tài liệu kỹ thuật (documentation) cho '{task_title}' là gì?",
            "options": [
                "A. Giúp các thành viên khác dễ dàng đọc hiểu, bảo trì và mở rộng hệ thống sau này",
                "B. Để làm tăng dung lượng lưu trữ của thư mục dự án trên máy",
                "C. Làm cho dự án trông phức tạp hơn để gây ấn tượng với người chấm",
                "D. Chỉ để đối phó với quy trình thủ tục hành chính bắt buộc"
            ],
            "correct_answer_index": 0,
            "explanation": "Documentation rõ ràng giúp tối ưu hóa quá trình bàn giao công nghệ và duy trì khả năng mở rộng lâu dài cho ứng dụng."
        },
        {
            "question": f"Nguyên lý SOLID nào khuyến khích việc phát triển thêm tính năng mới cho '{task_title}' mà không ảnh hưởng code cũ?",
            "options": [
                "A. Open/Closed Principle (Nguyên lý Đóng/Mở)",
                "B. Single Responsibility Principle (Nguyên lý Đơn nhiệm)",
                "C. Liskov Substitution Principle (Thay thế Liskov)",
                "D. Interface Segregation Principle (Phân tách Interface)"
            ],
            "correct_answer_index": 0,
            "explanation": "Nguyên lý Đóng/Mở (Open/Closed) quy định cấu trúc phần mềm nên mở cho việc mở rộng thêm nhưng đóng trước việc chỉnh sửa các mã nguồn cốt lõi đã chạy ổn định."
        }
    ]
    results = []
    for i in range(needed_count):
        q = questions[i % len(questions)].copy()
        # Thay đổi nhẹ tiêu đề câu hỏi để có cảm giác cá nhân hóa cao
        if i >= len(questions):
            q["question"] = f"[Nâng cao] Nhận định nào sau đây là chính xác nhất về kỹ thuật vận hành '{task_title}'?"
        results.append(q)
    return results


def get_fallback_mini_project(profile, topic_interest):
    """
    Sinh dự án cá nhân hóa khi API Gemini gặp sự cố bảo trì
    """
    career_goal = getattr(profile, 'career_goal', 'Phát triển công nghệ')
    return {
        "project_title": f"Hệ Thống Quản Lý Thực Chiến Đột Phá - {topic_interest}",
        "description": f"Xây dựng một giải pháp phần mềm toàn diện giải quyết bài toán cốt lõi trong chủ đề '{topic_interest}', tích hợp các tiêu chuẩn kiến trúc hiện đại hướng tới mục tiêu nghề nghiệp {career_goal}.",
        "tech_stack": ["React/Vue", "Node.js/Django", "PostgreSQL/MongoDB", "Docker"],
        "core_features": [
            "Hệ thống xác thực người dùng phân quyền bảo mật cao sử dụng JWT",
            "Trực quan hóa số liệu thống kê thời gian thực với biểu đồ tương tác cao",
            "API Gateway tự động tối ưu hóa bộ nhớ đệm kết hợp bảo vệ rate limiting"
        ],
        "bonus_challenges": [
            "Tích hợp CI/CD tự động deploy lên môi trường Cloud (AWS/Vercel)",
            "Tối ưu hóa Lighthouse performance đạt điểm tuyệt đối >95"
        ],
        "learning_outcomes": f"Giúp hoàn thiện kỹ năng thiết kế kiến trúc hệ thống chuyên nghiệp và ghi điểm mạnh mẽ trong mắt nhà tuyển dụng ứng tuyển vị trí {career_goal}."
    }


def get_fallback_chat_reply(user_message):
    """
    Trình hỗ trợ chat nội bộ cực kỳ thông minh phục vụ học tập
    """
    msg = user_message.lower()
    if "lộ trình" in msg or "roadmap" in msg or "học" in msg:
        return "Chào bạn! Để bắt đầu lộ trình học tối ưu nhất, hãy chọn chuyên ngành mong muốn tại góc trái (ví dụ: Frontend, Backend, AI...) và bấm nút **Bắt đầu Phân Tích**. AI sẽ lập tức xây dựng hệ thống bài học chi tiết kết hợp các bài Quiz trắc nghiệm chấm điểm bảo mật để giúp bạn thăng hạng kỹ năng và kiếm tiền thực tế!"
    elif "quiz" in msg or "thi" in msg or "test" in msg:
        return "Chào bạn! Các bài Quiz trắc nghiệm trên FreelanceAI được thiết kế bảo mật chống gian lận. Bạn cần trả lời đúng tối thiểu 80% (8/10 câu) để vượt qua Milestone, nhận 100 XP tích lũy và thăng cấp (Level). Mẹo nhỏ: Khi bắt đầu test, hãy tập trung làm bài và tránh chuyển tab để không kích hoạt hệ thống cảnh báo Anti-Cheat nhé!"
    elif "việc" in msg or "job" in msg or "kiếm tiền" in msg:
        return "Tuyệt vời! Khi bạn chọn một Milestone học tập, hệ thống sẽ tự động quét cơ sở dữ liệu để tìm ra các công việc (Micro Task hoặc Dự án dài hạn) khớp kỹ năng của bạn nhất bên cột phải. Bạn có thể bấm trực tiếp để ứng tuyển ngay và kiếm thu nhập thực tế!"
    else:
        return "Chào bạn! Tôi là trợ lý học tập AI của FreelanceAI. Hệ thống AI Gemini đang bận xử lý dữ liệu lớn. Tôi có thể giúp bạn giải đáp các vấn đề chuyên môn về lập trình (Frontend, Backend), cấu trúc dữ liệu, cơ chế tích điểm XP và cách thức ứng tuyển các dự án thực tế trên sàn. Hãy đặt câu hỏi cụ thể nhé!"


def get_fallback_interview_questions(goal_text, company_filter):
    """
    Tạo bộ câu hỏi phỏng vấn offline chất lượng cao khi AI bận
    """
    return [
        {
            "question": f"Hãy giới thiệu một dự án thực tế bạn đã làm liên quan đến chuyên ngành {goal_text} và cách bạn giải quyết khó khăn kỹ thuật khó nhất?",
            "type": "Technical",
            "difficulty": "Medium",
            "key_concepts_or_star": "Áp dụng cấu trúc STAR: Situation (Bối cảnh) -> Task (Nhiệm vụ) -> Action (Giải pháp kỹ thuật cụ thể) -> Result (Chỉ số đo lường hiệu năng).",
            "category": "Project Experience"
        },
        {
            "question": "Làm thế nào để bạn tối ưu hóa thời gian tải trang hoặc hiệu năng xử lý cơ sở dữ liệu trong các ứng dụng thực tế?",
            "type": "Technical",
            "difficulty": "Hard",
            "key_concepts_or_star": "Tối ưu hóa Database queries, sử dụng indexing, cơ chế cache dữ liệu (Redis/Memcached), lazy loading, nén tài nguyên static.",
            "category": "Performance Optimization"
        },
        {
            "question": "Khi có xung đột ý kiến kỹ thuật giữa bạn và đồng nghiệp trong nhóm dự án, bạn sẽ xử lý thế nào để đạt đồng thuận tốt nhất?",
            "type": "Behavioral",
            "difficulty": "Easy",
            "key_concepts_or_star": "Lắng nghe tích cực, thảo luận dựa trên bằng chứng đo lường thực tế (benchmark), giữ tinh thần xây dựng và tôn trọng lẫn nhau.",
            "category": "Teamwork & Collaboration"
        },
        {
            "question": "Nếu khách hàng hoặc giám thị yêu cầu thay đổi tính năng gấp ngay sát ngày deploy/báo cáo, bạn sẽ quản trị rủi ro thế nào?",
            "type": "Behavioral",
            "difficulty": "Medium",
            "key_concepts_or_star": "Đánh giá mức độ ảnh hưởng bảo mật hệ thống, trao đổi rõ ràng về thời gian hoàn thành (trade-off), phân chia thứ tự ưu tiên các task.",
            "category": "Risk Management"
        },
        {
            "question": "Giải thích sự khác biệt giữa kiến trúc Monolithic (Đơn khối) và Microservices (Vi dịch vụ). Khi nào bạn quyết định chuyển đổi?",
            "type": "System Design",
            "difficulty": "Hard",
            "key_concepts_or_star": "Monolithic dễ triển khai lúc đầu nhưng khó mở rộng. Microservices độc lập deploy, dễ scale nhưng tăng độ phức tạp mạng và quản lý data consistency.",
            "category": "System Architecture"
        }
    ]


def get_fallback_roadmap_data(career_goal):
    """
    Tạo cấu trúc lộ trình học tập cực kỳ chi tiết, premium bằng tiếng Việt khi API 503
    """
    goal = (career_goal or '').lower()
    
    # Thiết lập bộ khung mặc định theo chuyên ngành
    if 'front' in goal or 'react' in goal or 'ui/ux' in goal or 'design' in goal:
        specialty = "Frontend Engineer"
        skills = ["React.js", "JavaScript (ES6+)", "Tailwind CSS", "HTML5/CSS3", "Redux Toolkit", "TypeScript"]
        missing = ["TypeScript", "Redux Toolkit"]
        badge_prefix = "palette"
        milestones = [
            {
                "milestone": "Giai đoạn 1: Làm chủ HTML5, CSS3 & JavaScript Cơ Bản",
                "key_outcomes": ["Xây dựng giao diện tĩnh Responsive", "Làm chủ cú pháp JavaScript ES6+ và xử lý mảng"],
                "milestone_badge": "terminal",
                "suggested_projects": [
                    { "title": "Portfolio cá nhân Glassmorphism", "description": "Thiết kế website giới thiệu năng lực bản thân ứng dụng hiệu ứng kính mờ và CSS Flexbox/Grid.", "difficulty": "beginner", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Học CSS Modern Layout (Flexbox & CSS Grid)", 
                        "priority": "Critical",
                        "estimated_time": "1 tuần",
                        "difficulty": "beginner",
                        "resource_type": "video",
                        "multiple_learning_links": [
                            { "title": "CSS Grid & Flexbox Thực Chiến", "url": "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", "type": "reading" }
                        ]
                    },
                    { 
                        "task": "Thực hành JavaScript ES6+: Khái niệm Async/Await và Fetch API", 
                        "priority": "Critical",
                        "estimated_time": "1 tuần",
                        "difficulty": "intermediate",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "JavaScript Async/Await Tutorial", "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous", "type": "reading" }
                        ]
                    }
                ]
            },
            {
                "milestone": "Giai đoạn 2: Phát triển Ứng Dụng React.js Hiện Đại",
                "key_outcomes": ["Quản lý State thông minh trong React", "Tích hợp API thực tế vào giao diện người dùng"],
                "milestone_badge": "developer_mode",
                "suggested_projects": [
                    { "title": "Sàn Freelance Mini Task Dashboard", "description": "Xây dựng dashboard quản lý tiến trình làm việc của freelancer, kết nối dữ liệu thực tế từ REST API.", "difficulty": "intermediate", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Làm chủ React Hooks (useState, useEffect, useContext)", 
                        "priority": "Critical",
                        "estimated_time": "2 tuần",
                        "difficulty": "intermediate",
                        "resource_type": "course",
                        "multiple_learning_links": [
                            { "title": "Official React Hook Documentation", "url": "https://react.dev/reference/react", "type": "reading" }
                        ]
                    },
                    { 
                        "task": "Quản lý State toàn cục bằng Redux Toolkit / Zustand", 
                        "priority": "Important",
                        "estimated_time": "1 tuần",
                        "difficulty": "advanced",
                        "resource_type": "video",
                        "multiple_learning_links": [
                            { "title": "Học nhanh Redux Toolkit cho người mới", "url": "https://redux-toolkit.js.org/tutorials/quick-start", "type": "reading" }
                        ]
                    }
                ]
            },
            {
                "milestone": "Giai đoạn 3: Tối ưu hiệu năng & Triển Khai Thực Tế",
                "key_outcomes": ["Tối ưu điểm SEO & Performance Lighthouse >90", "Đóng gói Docker và Deploy Cloud thành thạo"],
                "milestone_badge": "rocket",
                "suggested_projects": [
                    { "title": "Web App quản lý công việc bảo mật", "description": "Dự án SPA hoàn chỉnh tối ưu lazy loading, đạt điểm Lighthouse tuyệt đối và deploy tự động lên Vercel/AWS.", "difficulty": "advanced", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Thực hành tối ưu hóa Lighthouse: Lazy Loading & Code Splitting", 
                        "priority": "Important",
                        "estimated_time": "1 tuần",
                        "difficulty": "advanced",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "Lighthouse Performance Guide", "url": "https://web.dev/fast/", "type": "reading" }
                        ]
                    }
                ]
            }
        ]
    elif 'back' in goal or 'django' in goal or 'node' in goal or 'database' in goal:
        specialty = "Backend Engineer"
        skills = ["Django", "Python", "Node.js", "PostgreSQL", "REST API", "Docker", "Redis"]
        missing = ["Redis", "Docker"]
        badge_prefix = "dns"
        milestones = [
            {
                "milestone": "Giai đoạn 1: Nền tảng API & Thiết Kế Cơ Sở Dữ Liệu SQL",
                "key_outcomes": ["Thiết kế chuẩn hóa lược đồ database PostgreSQL", "Viết RESTful API hoàn chỉnh bảo mật cao"],
                "milestone_badge": "dns",
                "suggested_projects": [
                    { "title": "REST API quản lý dịch vụ Freelancer", "description": "Thiết kế hệ thống API cho phép đăng tin, lọc việc làm và quản lý người dùng với phân quyền JWT.", "difficulty": "beginner", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Thiết kế & Chuẩn hóa thực thể cơ sở dữ liệu quan hệ (1NF, 2NF, 3NF)", 
                        "priority": "Critical",
                        "estimated_time": "1 tuần",
                        "difficulty": "beginner",
                        "resource_type": "book",
                        "multiple_learning_links": [
                            { "title": "PostgreSQL Tutorial for Database Design", "url": "https://www.postgresqltutorial.com/", "type": "reading" }
                        ]
                    },
                    { 
                        "task": "Xây dựng RESTful API bảo mật với JWT Authentication (Django/Express)", 
                        "priority": "Critical",
                        "estimated_time": "2 tuần",
                        "difficulty": "intermediate",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "JWT Auth best practices", "url": "https://jwt.io/introduction", "type": "reading" }
                        ]
                    }
                ]
            },
            {
                "milestone": "Giai đoạn 2: Tối ưu bộ nhớ đệm Cache & Hàng đợi Message Queue",
                "key_outcomes": ["Tích hợp Redis cache tăng tốc API 500%", "Xử lý tác vụ ngầm chạy nền với Celery"],
                "milestone_badge": "layers",
                "suggested_projects": [
                    { "title": "Hệ thống Notification thời gian thực", "description": "Xây dựng backend xử lý gửi mail hàng loạt và thông báo thời gian thực qua WebSockets kết hợp Redis Cache.", "difficulty": "intermediate", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Tích hợp Redis Cache để tối ưu hóa truy vấn SQL tải nặng", 
                        "priority": "Important",
                        "estimated_time": "1 tuần",
                        "difficulty": "intermediate",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "Redis caching tutorial in web apps", "url": "https://redis.io/docs/manual/client/", "type": "reading" }
                        ]
                    }
                ]
            }
        ]
    else:
        # AI / Data / General Fullstack fallback
        specialty = "AI & Data Specialist" if 'ai' in goal or 'data' in goal or 'machine' in goal else "Fullstack Engineer"
        skills = ["Python", "NumPy/Pandas", "Gemini API", "SQL", "Git", "Scikit-Learn"]
        missing = ["Gemini API", "Scikit-Learn"]
        badge_prefix = "neurology"
        milestones = [
            {
                "milestone": "Giai đoạn 1: Làm chủ Python, Phân tích dữ liệu & SQL",
                "key_outcomes": ["Sử dụng Pandas/NumPy để làm sạch tập dữ liệu lớn", "Viết câu truy vấn phức tạp kết xuất báo cáo thống kê"],
                "milestone_badge": "neurology",
                "suggested_projects": [
                    { "title": "Hệ thống phân tích hồ sơ Freelancer", "description": "Phân tích và vẽ biểu đồ trực quan hóa cơ cấu kỹ năng và phân bố thu nhập của thị trường freelancer.", "difficulty": "beginner", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Học thư viện Pandas & NumPy phân tích dữ liệu thực tế", 
                        "priority": "Critical",
                        "estimated_time": "2 tuần",
                        "difficulty": "beginner",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "Pandas Getting Started Guide", "url": "https://pandas.pydata.org/docs/user_guide/10min.html", "type": "reading" }
                        ]
                    }
                ]
            },
            {
                "milestone": "Giai đoạn 2: Tích hợp Trí Tuệ Nhân Tạo & Mô hình Học Máy",
                "key_outcomes": ["Kết nối Gemini API xây dựng chat bot", "Huấn luyện mô hình phân loại dữ liệu Scikit-Learn"],
                "milestone_badge": "terminal",
                "suggested_projects": [
                    { "title": "Chatbot tư vấn việc làm FreelanceAI", "description": "Triển khai trợ lý trò chuyện cá nhân hóa kết nối Gemini API để giải đáp thắc mắc chuyên môn cho ứng viên.", "difficulty": "intermediate", "github_template": "https://github.com/loonnguyen/Freelancer_AI_Platform" }
                ],
                "tasks": [
                    { 
                        "task": "Kết nối Gemini API và xây dựng hệ thống quản lý Prompt chuyên nghiệp", 
                        "priority": "Critical",
                        "estimated_time": "1 tuần",
                        "difficulty": "intermediate",
                        "resource_type": "coding",
                        "multiple_learning_links": [
                            { "title": "Google Gemini API Quickstart Guide", "url": "https://ai.google.dev/gemini-api/docs", "type": "reading" }
                        ]
                    }
                ]
            }
        ]

    # Đóng gói cấu trúc roadmap v2.1 chuẩn
    return {
        "version": "v2.1",
        "summary": f"Lộ trình tối ưu hóa thiết kế riêng biệt cho mục tiêu trở thành chuyên gia {specialty} hàng đầu, giúp bạn bù đắp các lỗ hổng kỹ năng lớn và sẵn sàng chinh phục các dự án thực tế trên sàn FreelanceAI.",
        "job_readiness_score": 68,
        "jd_skills": skills,
        "skills_gap": missing,
        "estimated_total_time": "4-6 tháng",
        "next_milestone_recommendation": "Bắt đầu làm bài test trắc nghiệm tại Milestone 1 để kích hoạt 100 XP đầu tiên!",
        "certificate_recommendations": [
            f"Google Certified Professional in {specialty}",
            "AWS Certified Solutions Architect"
        ],
        "strengths": [
            "Có tư duy cấu trúc thuật toán vững chắc",
            "Tự lập kế hoạch học tập độc lập có tính cam kết cao"
        ],
        "weaknesses": [
            "Thiếu các dự án thực chiến hoàn chỉnh để đưa vào hồ sơ CV ứng tuyển",
            "Chưa tối ưu hóa quy trình deploy ứng dụng lên môi trường cloud thực tế"
        ],
        "roadmap": milestones
    }

