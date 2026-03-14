# tests/test_heatmap_filters.py
import datetime
import pytest
from httpx import AsyncClient, ASGITransport
import mongomock

from src import incidents as incidents_module
from src.main import app


# ── Async MongoDB wrapper ──────────────────────────
class AsyncCursor:
    def __init__(self, sync_cursor):
        self._items = list(sync_cursor)
        self._i = 0

    def __aiter__(self):
        self._i = 0
        return self

    async def __anext__(self):
        if self._i >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._i]
        self._i += 1
        return item


class AsyncCollectionWrapper:
    def __init__(self, sync_coll):
        self._coll = sync_coll

    def find(self, query=None, projection=None):
        sync_cursor = self._coll.find(query or {}, projection)
        return AsyncCursor(sync_cursor)

    # ── Fix 1: count_documents was missing ────────
    async def count_documents(self, query=None):
        return self._coll.count_documents(query or {})

    async def insert_one(self, doc):
        return self._coll.insert_one(doc)


# ── Fixture ────────────────────────────────────────
@pytest.fixture(autouse=True)
def use_mongomock(monkeypatch):
    client = mongomock.MongoClient()
    db     = client["crimewatch_test"]
    coll   = db["incidents"]

    now  = datetime.datetime.utcnow()

    # ── Fix 2: severity now 1-5 scale (not 0-1) ───
    docs = [
        {
            "Latitude":      10.0,
            "Longitude":     10.0,
            "Severity":      2,           # medium
            "Clean Category": "Theft",
            "Reported At":   now - datetime.timedelta(days=1),
        },
        {
            "Latitude":      20.0,
            "Longitude":     20.0,
            "Severity":      5,           # high
            "Clean Category": "Assault",
            "Reported At":   now - datetime.timedelta(days=2),
        },
        {
            "Latitude":      30.0,
            "Longitude":     30.0,
            "Severity":      1,           # low
            "Clean Category": "Burglary",
            "Reported At":   now - datetime.timedelta(days=10),
        },
        {
            # missing coords — should be ignored
            "Latitude":      None,
            "Longitude":     None,
            "Severity":      5,
            "Clean Category": "Other",
            "Reported At":   now,
        },
    ]

    coll.insert_many(docs)
    wrapper = AsyncCollectionWrapper(coll)
    monkeypatch.setattr(incidents_module, "incidents_coll", wrapper)
    return wrapper


# ── Fix 3: anyio backend config ───────────────────
pytest_plugins = ('anyio',)


# ══════════════════════════════════════════════════
# TESTS
# ══════════════════════════════════════════════════

@pytest.mark.anyio
async def test_heatmap_no_filters():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap")

    assert r.status_code == 200
    data = r.json()
    assert "heatmap" in data
    # 3 docs with valid coords (4th has None coords)
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_types_filter():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"types": "Assault,Burglary"})

    assert r.status_code == 200
    data = r.json()
    assert len(data["heatmap"]) == 2


@pytest.mark.anyio
async def test_heatmap_time_range_filter():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"time_range": "7d"})

    assert r.status_code == 200
    data = r.json()
    # Only docs within last 7 days: Theft (1d ago) + Assault (2d ago)
    assert len(data["heatmap"]) == 2


@pytest.mark.anyio
async def test_heatmap_severity_min():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"severity_min": 4})

    assert r.status_code == 200
    data = r.json()
    # Only Assault has severity 5 (>= 4)
    assert len(data["heatmap"]) == 1
    # weight = 5/5 = 1.0
    assert data["heatmap"][0][2] == 1.0


@pytest.mark.anyio
async def test_heatmap_malformed_time_range_ignored():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"time_range": "not-a-range"})

    assert r.status_code == 200
    data = r.json()
    # Malformed time_range ignored → all 3 valid points returned
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_unknown_types_returns_empty():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"types": "Nonexistent"})

    assert r.status_code == 200
    data = r.json()
    assert len(data["heatmap"]) == 0


@pytest.mark.anyio
async def test_heatmap_empty_types_param_behaves_as_no_filter():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"types": ""})

    assert r.status_code == 200
    data = r.json()
    # Empty types = no filter → all 3 valid points
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_severity_non_numeric_ignored():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap", params={"severity_min": "abc"})

    assert r.status_code == 200
    data = r.json()
    # Malformed severity ignored → all 3 valid points
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_weight_normalization():
    """Severity 1-5 should normalize to 0.2-1.0 weight"""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap")

    assert r.status_code == 200
    points = r.json()["heatmap"]

    weights = [p[2] for p in points]
    # All weights should be between 0.1 and 1.0
    for w in weights:
        assert 0.1 <= w <= 1.0

    # Severity 5 → weight 1.0
    assault = next(p for p in points if p[3] == "Assault")
    assert assault[2] == 1.0

    # Severity 1 → weight 0.2
    burglary = next(p for p in points if p[3] == "Burglary")
    assert burglary[2] == 0.2


@pytest.mark.anyio
async def test_heatmap_point_has_category_and_date():
    """Each point should have [lat, lon, weight, category, date]"""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        r = await ac.get("/incidents/heatmap")

    assert r.status_code == 200
    points = r.json()["heatmap"]

    for p in points:
        assert len(p) == 5        # [lat, lon, weight, category, date]
        assert p[3] is not None   # category present