from rest_framework import permissions

# Class định nghĩa dữ liệu (Model/Entity) cho IsOwnerOrReadOnly
class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has a `user` attribute.
    """
    # Hàm kiểm tra quyền truy cập vào object cụ thể
    def has_object_permission(self, request, view, obj):
        # Quyền đọc (GET, HEAD, OPTIONS) luôn được cho phép
        if request.method in permissions.SAFE_METHODS:
            return True

        # Kiểm tra trường sở hữu tùy theo Model
        # 1. Trường 'user' (FreelancerProfile, CompanyProfile, Notification, AIChatHistory)
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # 2. Trường 'reviewer' (Review)
        if hasattr(obj, 'reviewer'):
            return obj.reviewer == request.user
            
        # 3. Trường 'freelancer' (Application, SavedJob)
        if hasattr(obj, 'freelancer'):
            return obj.freelancer.user == request.user
            
        return False

# Class định nghĩa dữ liệu (Model/Entity) cho IsFreelancerOwner
class IsFreelancerOwner(permissions.BasePermission):
    """
    Permission for Application and Profile where obj.freelancer.user or obj.user is the owner.
    """
    # Hàm kiểm tra quyền truy cập vào object cụ thể
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # If it's a FreelancerProfile
        if hasattr(obj, 'user'):
            return obj.user == request.user
            
        # If it's an Application
        if hasattr(obj, 'freelancer'):
            return obj.freelancer.user == request.user
            
        return False
