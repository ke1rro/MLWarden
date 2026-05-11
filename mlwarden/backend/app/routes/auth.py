from fastapi import APIRouter, Depends

from ..core import ApiError, Principal, create_token, require_principal, verify_password
from ..models import LoginRequest, PrincipalResponse, TokenResponse

router = APIRouter()


@router.post("/api/auth/login", response_model=TokenResponse)
async def login(credentials: LoginRequest) -> TokenResponse:
    if not verify_password(credentials.username, credentials.password):
        raise ApiError(401, "invalid_credentials", "Invalid username or password")
    token, expires_at = create_token(credentials.username)
    return TokenResponse(access_token=token, expires_at=expires_at)


@router.get("/api/auth/me", response_model=PrincipalResponse)
async def me(principal: Principal = Depends(require_principal)) -> PrincipalResponse:
    return PrincipalResponse(
        username=principal.username,
        kind=principal.kind,
        admin=principal.is_admin,
    )
