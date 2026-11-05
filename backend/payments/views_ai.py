from django.conf import settings
from django.db import transaction
from rest_framework import views, status, permissions
from rest_framework.response import Response
from .models import Wallet, AIServiceLog
from ai_engine.services import safe_generate_content, GEMINI_MODEL

# Class xử lý API (View) cho AICreditRequiredView
class AICreditRequiredView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    # Hàm thực hiện check credits
    def check_credits(self, user):
        wallet, _ = Wallet.objects.get_or_create(user=user)
        cost = settings.AI_SERVICE_COST
        if wallet.ai_credits < cost:
            return False, cost
        return True, cost

    # Hàm thực hiện deduct credits
    def deduct_credits(self, user, service_name):
        wallet = user.wallet
        cost = settings.AI_SERVICE_COST
        with transaction.atomic():
            wallet.ai_credits -= cost
            wallet.save()
            AIServiceLog.objects.create(
                user=user,
                service_name=service_name,
                credits_used=cost
            )

# Class xử lý API (View) cho SmartJobAnalyzerView
class SmartJobAnalyzerView(AICreditRequiredView):
    # Hàm thực hiện post
    def post(self, request):
        has_credits, cost = self.check_credits(request.user)
        if not has_credits:
            return Response({'error': f'Insufficient AI credits. Need {cost} credits.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

        job_data = request.data.get('job_data') # Should contain skills, budget, etc.
        
        # Call Gemini
        prompt = f"Analyze this job for a freelancer with skills: {request.user.freelancer_profile.skills}. Job: {job_data}"
        try:
            response = safe_generate_content(model=GEMINI_MODEL, contents=prompt)
            
            # Deduct credits only after success
            self.deduct_credits(request.user, "Smart Job Analyzer")
            
            return Response({'analysis': response.text})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Class xử lý API (View) cho TopCandidateRankerView
class TopCandidateRankerView(AICreditRequiredView):
    # Hàm thực hiện post
    def post(self, request):
        has_credits, cost = self.check_credits(request.user)
        if not has_credits:
            return Response({'error': f'Insufficient AI credits. Need {cost} credits.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

        candidates = request.data.get('candidates')
        job_requirements = request.data.get('job_requirements')

        prompt = f"Rank these candidates for the job: {job_requirements}. Candidates: {candidates}"
        try:
            response = safe_generate_content(model=GEMINI_MODEL, contents=prompt)
            
            self.deduct_credits(request.user, "Top Candidate Ranker")
            
            return Response({'ranking': response.text})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
