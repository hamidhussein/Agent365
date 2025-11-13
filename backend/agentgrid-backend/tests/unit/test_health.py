import pytest
from httpx import AsyncClient
from httpx import ASGITransport
from fastapi import status

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}
