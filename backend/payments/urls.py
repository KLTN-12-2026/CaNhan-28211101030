from django.urls import path
from .views import (
    WalletDetailView, CreatePaymentIntentView, BuyAICreditsView, 
    EscrowActionView, DepositView, StripeWebhookView,
    MoMoCreatePaymentView, MoMoIPNView, MoMoCheckStatusView, MockPaymentSuccessView,
    UpgradeProWithWalletView
)
from .views_ai import SmartJobAnalyzerView, TopCandidateRankerView

urlpatterns = [
    path('wallet/', WalletDetailView.as_view(), name='wallet-detail'),
    path('deposit/', DepositView.as_view(), name='deposit'),
    path('upgrade-pro-wallet/', UpgradeProWithWalletView.as_view(), name='upgrade-pro-wallet'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('create-payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('momo-create/', MoMoCreatePaymentView.as_view(), name='momo-create'),
    path('momo-ipn/', MoMoIPNView.as_view(), name='momo-ipn'),
    path('momo-check-status/', MoMoCheckStatusView.as_view(), name='momo-check-status'),
    path('mock-payment-success/', MockPaymentSuccessView.as_view(), name='mock-payment-success'),
    path('buy-credits/', BuyAICreditsView.as_view(), name='buy-credits'),
    path('escrow/<str:action>/', EscrowActionView.as_view(), name='escrow-action'),
    
    # AI Services
    path('ai/analyze-job/', SmartJobAnalyzerView.as_view(), name='ai-analyze-job'),
    path('ai/rank-candidates/', TopCandidateRankerView.as_view(), name='ai-rank-candidates'),
]
