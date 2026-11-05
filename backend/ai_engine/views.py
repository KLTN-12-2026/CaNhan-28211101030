from rest_framework import viewsets
from .models import AIAnalysis
from .serializers import AIAnalysisSerializer
from .services import get_ai_chat_response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from accounts.models import FreelancerProfile
from .models import AIAnalysis, InterviewQuestion, InterviewPracticeHistory

# Class xử lý API (View) cho AIAnalysisViewSet
class AIAnalysisViewSet(viewsets.ModelViewSet):
    queryset = AIAnalysis.objects.all()
    serializer_class = AIAnalysisSerializer
    
# Class xử lý API (View) cho ChatWithAIView
class ChatWithAIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        user_message = request.data.get('user_message')
        session_id = request.data.get('session_id')
        
        if not user_message:
            return Response({"error": "Tin nhắn không được để trống."}, status=status.HTTP_400_BAD_REQUEST)

        # Chống gửi trùng tin nhắn khi spam Enter hoặc double-click trong 1.5 giây
        from notifications.models import AIChatHistory
        from django.utils import timezone
        from datetime import timedelta
        recent_threshold = timezone.now() - timedelta(seconds=1.5)
        duplicate_history = AIChatHistory.objects.filter(
            user=request.user,
            session_id=session_id,
            user_message=user_message,
            timestamp__gte=recent_threshold
        ).order_by('-timestamp').first()
        if duplicate_history:
            return Response({"ai_response": duplicate_history.ai_response}, status=status.HTTP_200_OK)
            
        # Gọi hàm xử lý AI từ services.py
        result = get_ai_chat_response(request.user, user_message, session_id=session_id)
        
        if result["status"] == "success":
            return Response({"ai_response": result["ai_response"]}, status=status.HTTP_200_OK)
        else:
            return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Class xử lý API (View) cho AnalyzeCVView
class AnalyzeCVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện post
    def post(self, request):
        from accounts.models import FreelancerProfile
        import os
        from django.conf import settings
        from .services import analyze_cv_strengths_weaknesses

        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            if not profile.cv_url:
                return Response({"error": "Bạn chưa tải CV lên hồ sơ. Vui lòng cập nhật CV tại trang cá nhân để AI có thể phân tích."}, status=status.HTTP_400_BAD_REQUEST)
            
            cv_path = profile.cv_url.path
            career_goal = request.data.get('career_goal')
            
            if career_goal:
                profile.career_goal = career_goal
                profile.interview_prep_data = None # Clear stale interview data
                profile.save()

            if not os.path.exists(cv_path):
                return Response({"error": "Không tìm thấy file CV trên máy chủ."}, status=status.HTTP_404_NOT_FOUND)
            
            result = analyze_cv_strengths_weaknesses(profile.id, cv_path, career_goal=career_goal)
            
            if result["status"] == "success":
                # Save the roadmap to the profile
                if isinstance(result.get("analysis"), dict) and "roadmap" in result["analysis"]:
                    profile.learning_roadmap = result["analysis"]
                    profile.save()
                return Response({"analysis": result["analysis"]}, status=status.HTTP_200_OK)
            else:
                return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        task_title = request.data.get('task_title')
        career_goal = request.data.get('career_goal')
        task_key = request.data.get('task_key')

        if not task_title:
            return Response({"error": "Vui lòng cung cấp task_title."}, status=status.HTTP_400_BAD_REQUEST)
        if not task_key:
            return Response({"error": "Vui lòng cung cấp task_key."}, status=status.HTTP_400_BAD_REQUEST)

        from .services import generate_micro_quiz
        from django.core.cache import cache
        
        result = generate_micro_quiz(task_title, career_goal)

        if result["status"] == "success":
            quiz_data = result["quiz"]
            
            # Securely cache correct answers, explanations, question text, and options
            cache_key = f"quiz_{request.user.id}_{task_key}"
            cache.set(cache_key, quiz_data, 1200) # TTL of 20 minutes (1200s)
            
            # Strip correct_answer_index and explanation before sending to React Client
            clean_quiz = []
            for q in quiz_data:
                clean_quiz.append({
                    "question": q.get("question", ""),
                    "options": q.get("options", [])
                })
                
            return Response({"quiz": clean_quiz}, status=status.HTTP_200_OK)
        else:
            return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateMiniProjectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        topic_interest = request.data.get('topic_interest', 'Dự án thực tế')

        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            from .services import generate_mini_project
            result = generate_mini_project(profile, topic_interest)

            if result["status"] == "success":
                return Response({"project": result["project"]}, status=status.HTTP_200_OK)
            else:
                return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateInterviewPrepView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            career_goal = profile.career_goal
            
            force_ai = request.data.get('force_ai', False)
            company_type = request.data.get('company_type', 'All')
            
            # Simple Rate Limiting for force_ai
            if force_ai:
                from django.core.cache import cache
                cache_key = f"generate_interview_{request.user.id}"
                count = cache.get(cache_key, 0)
                if count >= 3:
                    return Response({"error": "Bạn đã vượt quá số lần tạo mới bằng AI (3 lần / 10 phút). Vui lòng thử lại sau."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
                cache.set(cache_key, count + 1, 600) # 10 phút
            
            from .services import generate_interview_prep
            result = generate_interview_prep(career_goal, user=request.user, force_ai=force_ai, company_type=company_type)

            if result["status"] == "success":
                # Save to profile
                profile.interview_prep_data = result["data"]
                profile.save()
                return Response(result["data"], status=status.HTTP_200_OK)
            else:
                return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SaveInterviewQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            question_id = request.data.get('question_id')
            
            if not question_id:
                return Response({"error": "Vui lòng cung cấp question_id"}, status=status.HTTP_400_BAD_REQUEST)
                
            from .models import InterviewQuestion, SavedInterviewQuestion
            question = InterviewQuestion.objects.get(id=question_id)
            
            saved, created = SavedInterviewQuestion.objects.get_or_create(freelancer=profile, question=question)
            if not created:
                saved.delete()
                return Response({"status": "unsaved"}, status=status.HTTP_200_OK)
                
            return Response({"status": "saved"}, status=status.HTTP_201_CREATED)
            
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except InterviewQuestion.DoesNotExist:
            return Response({"error": "Câu hỏi không tồn tại trong Global Question Bank."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReviewInterviewAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question_text = request.data.get('question_text')
        question_type = request.data.get('question_type', 'General')
        user_answer = request.data.get('user_answer')

        if not question_text or not user_answer:
            return Response({"error": "Vui lòng cung cấp đầy đủ câu hỏi và câu trả lời."}, status=status.HTTP_400_BAD_REQUEST)

        from .services import review_interview_answer_with_ai
        result = review_interview_answer_with_ai(question_text, question_type, user_answer)

        if result["status"] == "success":
            # Save to history
            try:
                profile = FreelancerProfile.objects.get(user=request.user)
                InterviewPracticeHistory.objects.create(
                    freelancer=profile,
                    question_text=question_text,
                    question_type=question_type,
                    user_answer=user_answer,
                    ai_feedback=result["review"],
                    career_goal=profile.career_goal,
                    score=result["review"].get("score", 0)
                )
            except Exception as e:
                print("Failed to save practice history:", e)
                
            return Response({"review": result["review"]}, status=status.HTTP_200_OK)
        else:
            return Response({"error": result["message"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PracticeHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            history = InterviewPracticeHistory.objects.filter(freelancer=profile).order_by('-created_at')[:20]
            
            data = []
            for item in history:
                data.append({
                    "id": item.id,
                    "question_text": item.question_text,
                    "question_type": item.question_type,
                    "user_answer": item.user_answer,
                    "ai_feedback": item.ai_feedback,
                    "score": item.score,
                    "created_at": item.created_at
                })
            return Response(data, status=status.HTTP_200_OK)
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SemanticMatchJobsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            from .services import find_matching_jobs, update_freelancer_embedding
            
            # Refresh embedding if requested
            if request.query_params.get('refresh') == 'true' or not profile.embedding:
                update_freelancer_embedding(profile)

            matching_jobs = find_matching_jobs(profile)
            
            results = []
            for job in matching_jobs:
                results.append({
                    "id": job.id,
                    "title": job.title,
                    "description": job.description[:200] + "...",
                    "budget": str(job.budget),
                    "distance": getattr(job, 'distance', 0) # lower is better
                })
                
            return Response({"matching_jobs": results}, status=status.HTTP_200_OK)
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyQuizSubmissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        task_key = request.data.get('task_key')
        selected_answers = request.data.get('selected_answers')

        if not task_key or selected_answers is None:
            return Response({"error": "Vui lòng cung cấp task_key và selected_answers."}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.cache import cache
        cache_key = f"quiz_{request.user.id}_{task_key}"
        cached_data = cache.get(cache_key)

        if not cached_data:
            return Response({"error": "Bài trắc nghiệm đã hết hạn (20 phút) hoặc không tồn tại. Vui lòng tạo lại quiz."}, status=status.HTTP_400_BAD_REQUEST)

        total_questions = len(cached_data)
        correct_count = 0
        details = []

        for idx, item in enumerate(cached_data):
            ans_key = str(idx)
            selected_idx = None
            if isinstance(selected_answers, dict):
                selected_idx = selected_answers.get(ans_key)
                if selected_idx is not None:
                    selected_idx = int(selected_idx)
            elif isinstance(selected_answers, list):
                if idx < len(selected_answers):
                    selected_idx = selected_answers[idx]
                    if selected_idx is not None:
                        selected_idx = int(selected_idx)

            correct_idx = int(item.get("correct_answer_index", 0))
            is_correct = (selected_idx == correct_idx)
            if is_correct:
                correct_count += 1

            details.append({
                "question": item.get("question", ""),
                "options": item.get("options", []),
                "selected_answer_index": selected_idx,
                "correct_answer_index": correct_idx,
                "explanation": item.get("explanation", ""),
                "is_correct": is_correct
            })

        passing_score = int(total_questions * 0.8) # 80% passing
        success = (correct_count >= passing_score)

        response_data = {
            "success": success,
            "score": correct_count,
            "total": total_questions,
            "details": details
        }

        if success:
            try:
                profile = FreelancerProfile.objects.get(user=request.user)
                completed_tasks = profile.completed_tasks or {}
                
                if task_key not in completed_tasks:
                    completed_tasks[task_key] = True
                    profile.completed_tasks = completed_tasks
                    
                    xp_gained = 100
                    profile.xp = (profile.xp or 0) + xp_gained
                    profile.level = int(profile.xp / 500) + 1
                    profile.save()
                    
                    response_data["xp_gained"] = xp_gained
                    response_data["new_xp"] = profile.xp
                    response_data["new_level"] = profile.level
                else:
                    response_data["xp_gained"] = 0
                    response_data["new_xp"] = profile.xp
                    response_data["new_level"] = profile.level
            except FreelancerProfile.DoesNotExist:
                return Response({"error": "Không tìm thấy hồ sơ Freelancer."}, status=status.HTTP_404_NOT_FOUND)

        return Response(response_data, status=status.HTTP_200_OK)

class RecommendedOpportunitiesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            skills = request.query_params.get('skills', '')
            goal_preference = request.query_params.get('goal_preference', 'both') # 'task', 'project', or 'both'
            
            from jobs.models import Job
            from accounts.models import FreelancerProfile
            from jobs.services import calculate_and_save_matching_score
            
            active_jobs = Job.objects.filter(is_active=True)
            
            try:
                profile = FreelancerProfile.objects.get(user=request.user)
            except FreelancerProfile.DoesNotExist:
                profile = None
                
            milestone_skills = [s.strip().lower() for s in skills.split(',') if s.strip()]
            
            results = []
            for job in active_jobs:
                # Classify based on specification:
                # Micro Tasks: project_type = 'task' + budget < 200 OR duration < 7 days
                # Long-term Projects: project_type = 'project' + budget >= 200
                is_task = False
                
                # Check project_type + budget
                if job.project_type == 'task' and job.budget < 200:
                    is_task = True
                
                # Check duration under 7 days
                duration_str = (job.duration or '').lower()
                if 'ngày' in duration_str or 'day' in duration_str:
                    try:
                        days = int(''.join(c for c in duration_str if c.isdigit()))
                        if days < 7:
                            is_task = True
                    except ValueError:
                        pass
                
                # If project_type is explicit, let it guide as a fallback
                if job.project_type == 'project' and job.budget >= 200 and not is_task:
                    is_task = False
                elif not is_task and job.budget < 200:
                    is_task = True
                
                if goal_preference == 'task' and not is_task:
                    continue
                if goal_preference == 'project' and is_task:
                    continue
                    
                # Compute skill overlap matching score for milestone relevance sorting
                job_skills = [s.name.lower() for s in job.required_skills.all()]
                overlap = set(milestone_skills).intersection(set(job_skills))
                
                if milestone_skills:
                    milestone_overlap_score = int((len(overlap) / len(milestone_skills)) * 100)
                else:
                    milestone_overlap_score = 50
                    
                # Title similarity boost
                title_lower = job.title.lower()
                for s in milestone_skills:
                    if s in title_lower:
                        milestone_overlap_score = min(100, milestone_overlap_score + 25)
                        
                if milestone_overlap_score == 0:
                    import random
                    milestone_overlap_score = random.randint(35, 60)
                
                # Calculate real profile-based match score to match JobDetail page 100%
                if profile:
                    real_match_score = calculate_and_save_matching_score(job, profile, save_application=False)
                else:
                    real_match_score = milestone_overlap_score
                    
                results.append({
                    "id": job.id,
                    "title": job.title,
                    "description": job.description[:150] + "...",
                    "budget": float(job.budget),
                    "project_type": "task" if is_task else "project",
                    "match_score": real_match_score,
                    "milestone_score": milestone_overlap_score,
                    "duration": job.duration or "7 ngày",
                    "deadline": job.deadline.strftime('%Y-%m-%d') if job.deadline else None,
                    "location": job.location or "Remote"
                })
                
            # Sort by milestone relevance descending
            results.sort(key=lambda x: x["milestone_score"], reverse=True)
            return Response({"opportunities": results[:6]}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegenerateRoadmapView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            profile = FreelancerProfile.objects.get(user=request.user)
            profile.learning_roadmap = None
            profile.completed_tasks = {}
            profile.save()
            return Response({"status": "success", "message": "Đã reset lộ trình học tập thành công."}, status=status.HTTP_200_OK)
        except FreelancerProfile.DoesNotExist:
            return Response({"error": "Hồ sơ Freelancer không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
