from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        # Check if the error is a dict, if it is a list, convert to dict
        error_detail = response.data
        if isinstance(response.data, list):
            error_detail = {"detail": response.data}
        
        custom_response_data = {
            'success': False,
            'message': "An error occurred.",
            'data': None,
            'errors': error_detail
        }
        
        # Try to extract a specific error message if available
        if isinstance(error_detail, dict):
            if 'detail' in error_detail:
                custom_response_data['message'] = str(error_detail['detail'])
            elif 'non_field_errors' in error_detail:
                custom_response_data['message'] = str(error_detail['non_field_errors'][0])
            else:
                # If there are field specific errors, just say validation failed
                custom_response_data['message'] = "Validation failed."
                
        response.data = custom_response_data

    return response
