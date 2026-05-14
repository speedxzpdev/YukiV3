from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    resp = client.get("/")
    assert resp.status_code == 200

def test_missing_params():
    resp = client.get("/video/info")
    assert resp.status_code == 400

# Teste real â€“ requer conexÃ£o e pode ser comentado
#def test_real_video():
#    resp = client.get("/video/info", params={"url": "https://www.tiktok.com/@tiktok/video/7106593811577457962"})
#    assert resp.status_code == 200
#    assert resp.json()["id"]
