from app.main import app


def test_shadowing_processing_routes_document_cached_success_responses() -> None:
    paths = app.openapi()["paths"]

    assert "200" in paths["/api/v1/shadowing/attempts/{attempt_id}/ai-reviews"]["post"]["responses"]
    assert (
        "200"
        in paths["/api/v1/shadowing/attempts/{attempt_id}/transcriptions"]["post"]["responses"]
    )
