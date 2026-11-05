from django.contrib import admin
from .models import AIAnalysis, QuestionBank, InterviewQuestion

# Hiển thị lịch sử phân tích của AI
@admin.register(AIAnalysis)
# Class cấu hình giao diện Admin cho AIAnalysis
class AIAnalysisAdmin(admin.ModelAdmin):
    search_fields = ('freelancer__full_name',)

@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display = ('skill_topic', 'difficulty', 'question_text', 'created_at')
    search_fields = ('skill_topic', 'question_text')
    list_filter = ('difficulty', 'skill_topic')

@admin.register(InterviewQuestion)
class InterviewQuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'category', 'question_type', 'difficulty', 'is_approved', 'used_count')
    search_fields = ('question_text', 'category', 'tags')
    list_filter = ('is_approved', 'question_type', 'difficulty', 'category')
    readonly_fields = ('created_at', 'updated_at', 'used_count', 'success_rate')
