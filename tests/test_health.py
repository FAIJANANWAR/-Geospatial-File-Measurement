from fastapi import status


def test_health_check(client):
    """
    Tests GET /health endpoint returns 200 OK and status='ok'.
    """
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data == {"status": "ok"}
