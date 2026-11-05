import hmac
import hashlib
import json
import requests
import time
import uuid
from django.conf import settings

# Hàm thực hiện generate signature
def generate_signature(data, secret_key):
    raw_signature = "&".join([f"{k}={v}" for k, v in sorted(data.items())])
    h = hmac.new(secret_key.encode('utf-8'), raw_signature.encode('utf-8'), hashlib.sha256)
    return h.hexdigest()

# Hàm thực hiện create momo payment
def create_momo_payment(amount, order_id, order_info, return_url, notify_url):
    endpoint = getattr(settings, 'MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create')
    
    partner_code = getattr(settings, 'MOMO_PARTNER_CODE', 'MOMOBKUN20180529')
    access_key = getattr(settings, 'MOMO_ACCESS_KEY', 'klm05TvNBzhg7h7j')
    secret_key = getattr(settings, 'MOMO_SECRET_KEY', 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa')
    
    request_id = str(uuid.uuid4())
    order_type = "captureWallet"
    extra_data = ""

    payload = {
        "partnerCode": partner_code,
        "partnerName": "FreelanceAI",
        "storeId": "FreelanceAI_Store",
        "requestId": request_id,
        "amount": int(amount),
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": return_url,
        "ipnUrl": notify_url,
        "lang": "vi",
        "extraData": extra_data,
        "requestType": order_type,
    }

    # Chuỗi dữ liệu thô chuẩn theo tài liệu MoMo v2
    raw_signature = (
        f"accessKey={access_key}&amount={payload['amount']}&extraData={payload['extraData']}"
        f"&ipnUrl={payload['ipnUrl']}&orderId={payload['orderId']}&orderInfo={payload['orderInfo']}"
        f"&partnerCode={payload['partnerCode']}&redirectUrl={payload['redirectUrl']}"
        f"&requestId={payload['requestId']}&requestType={payload['requestType']}"
    )

    payload["signature"] = hmac.new(secret_key.encode('utf-8'), raw_signature.encode('utf-8'), hashlib.sha256).hexdigest()

    try:
        response = requests.post(endpoint, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
        return response.json()
    except Exception as e:
        return {"resultCode": -1, "message": str(e)}

# Hàm thực hiện kiểm tra trạng thái thanh toán từ MoMo API (Query Status)
def query_momo_payment(order_id, request_id=None):
    if not request_id:
        request_id = str(uuid.uuid4())
    endpoint = getattr(settings, 'MOMO_QUERY_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/query')
    partner_code = getattr(settings, 'MOMO_PARTNER_CODE', 'MOMOBKUN20180529')
    access_key = getattr(settings, 'MOMO_ACCESS_KEY', 'klm05TvNBzhg7h7j')
    secret_key = getattr(settings, 'MOMO_SECRET_KEY', 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa')

    raw_signature = f"accessKey={access_key}&orderId={order_id}&partnerCode={partner_code}&requestId={request_id}"
    signature = hmac.new(secret_key.encode('utf-8'), raw_signature.encode('utf-8'), hashlib.sha256).hexdigest()

    payload = {
        "partnerCode": partner_code,
        "requestId": request_id,
        "orderId": order_id,
        "signature": signature,
        "lang": "vi"
    }

    try:
        response = requests.post(endpoint, json=payload, headers={'Content-Type': 'application/json'}, timeout=10)
        return response.json()
    except Exception as e:
        return {"resultCode": -1, "message": str(e)}

# Hàm thực hiện verify momo signature
def verify_momo_signature(data, secret_key):
    received_signature = data.pop('signature', None)
    if not received_signature:
        return False
        
    raw_signature = (
        f"accessKey={data.get('accessKey', '')}&amount={data.get('amount', '')}"
        f"&extraData={data.get('extraData', '')}&message={data.get('message', '')}"
        f"&orderId={data.get('orderId', '')}&orderInfo={data.get('orderInfo', '')}"
        f"&orderType={data.get('orderType', '')}&partnerCode={data.get('partnerCode', '')}"
        f"&requestId={data.get('requestId', '')}&responseTime={data.get('responseTime', '')}"
        f"&resultCode={data.get('resultCode', '')}&transId={data.get('transId', '')}"
    )
    calculated_signature = hmac.new(secret_key.encode('utf-8'), raw_signature.encode('utf-8'), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calculated_signature, received_signature)
