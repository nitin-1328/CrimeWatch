import datetime
import pytest
from httpx import AsyncClient
import mongomock

from src import incidents as incidents_module
from src.main import app


class AsyncCursor:
    def __init__(self, sync_cursor):
        # Make a snapshot list, mongomock cursor supports iteration
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
        # mongomock supports the same query operators used by the endpoint
        sync_cursor = self._coll.find(query or {}, projection)
        return AsyncCursor(sync_cursor)


@pytest.fixture(autouse=True)
def use_mongomock(monkeypatch):
    # create in-memory mongomock collection and insert documents
    client = mongomock.MongoClient()
    db = client["crimewatch_test"]
    coll = db["incidents"]

    now = datetime.datetime.utcnow()
    docs = [
        {
            "Latitude": 10.0,
            "Longitude": 10.0,
            "Severity": 0.5,
            "Clean Category": "Theft",
            "Reported At": now - datetime.timedelta(days=1),
        },
        {
            "Latitude": 20.0,
            "Longitude": 20.0,
            "Severity": 0.9,
            "Clean Category": "Assault",
            "Reported At": now - datetime.timedelta(days=2),
        },
        {
            "Latitude": 30.0,
            "Longitude": 30.0,
            "Severity": 0.2,
            "Clean Category": "Burglary",
            "Reported At": now - datetime.timedelta(days=10),
        },
        {
            # missing coords should be ignored by endpoint
            "Latitude": None,
            "Longitude": None,
            "Severity": 1.0,
            "Clean Category": "Other",
            "Reported At": now,
        },
    ]

    coll.insert_many(docs)

    wrapper = AsyncCollectionWrapper(coll)
    # patch the incidents_coll used by the endpoint
    monkeypatch.setattr(incidents_module, "incidents_coll", wrapper)
    return wrapper


@pytest.mark.anyio
async def test_heatmap_no_filters():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap")
    assert r.status_code == 200
    data = r.json()
    assert "heatmap" in data
    # should include the three docs with coords
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_types_filter():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"types": "Assault,Burglary"})
    assert r.status_code == 200
    data = r.json()
    # We expect two results (Assault, Burglary)
    assert len(data["heatmap"]) == 2


@pytest.mark.anyio
async def test_heatmap_time_range_filter():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"time_range": "7d"})
    assert r.status_code == 200
    data = r.json()
    # only docs within last 7 days: first two
    assert len(data["heatmap"]) == 2


@pytest.mark.anyio
async def test_heatmap_severity_min():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"severity_min": 0.8})
    assert r.status_code == 200
    data = r.json()
    # only second doc has severity >= 0.8
    assert len(data["heatmap"]) == 1
    assert data["heatmap"][0][2] >= 0.8


@pytest.mark.anyio
async def test_heatmap_malformed_time_range_ignored():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # malformed time_range should be ignored and return all points
        r = await ac.get("/incidents/heatmap", params={"time_range": "not-a-range"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_unknown_types_returns_empty():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"types": "Nonexistent"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["heatmap"]) == 0


@pytest.mark.anyio
async def test_heatmap_empty_types_param_behaves_as_no_filter():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"types": ""})
    assert r.status_code == 200
    data = r.json()
    # empty types should not filter; returns all points
    assert len(data["heatmap"]) == 3


@pytest.mark.anyio
async def test_heatmap_severity_non_numeric_ignored():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/incidents/heatmap", params={"severity_min": "abc"})
    assert r.status_code == 200
    data = r.json()
    # malformed severity filter should be ignored -> all points
    assert len(data["heatmap"]) == 3
