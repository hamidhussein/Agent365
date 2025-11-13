from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing_roundtrip():
    raw = "SuperSecret123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed)


def test_create_access_token():
    token = create_access_token({"sub": "123"})
    assert isinstance(token, str)
    assert token


def test_refresh_token_includes_token_type():
    token = create_refresh_token({"sub": "123"})
    payload = decode_token(token)
    assert payload["token_type"] == "refresh"
