from sqlalchemy import func, select

from app.models.attempt import ExerciseAttempt
from app.models.content import LearningContent, ReflexExercise, TranslationExercise
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel, UserRole
from app.models.gamification import XpTransaction
from app.models.tutor import TutorScenario
from app.models.user import User
from scripts.seed_data import (
    REFLEX_LESSONS,
    TRANSLATION_LESSONS,
    TUTOR_SCENARIOS,
    seed_reflex_lessons,
    seed_translation_lessons,
    seed_tutor_scenarios,
    seed_xp_transactions,
)


async def test_seed_reflex_lessons_replaces_legacy_catalog_without_duplicates(db_session) -> None:
    for lesson in (REFLEX_LESSONS[0], REFLEX_LESSONS[2]):
        legacy_content = LearningContent(
            content_type=ContentType.REFLEX,
            status=ContentStatus.PUBLISHED,
            slug=lesson["slug"],
            title="Legacy Reflex lesson",
            difficulty=lesson["difficulty"],
            base_exp=70,
        )
        db_session.add(legacy_content)
        await db_session.flush()
        db_session.add(
            ReflexExercise(
                content_id=legacy_content.id,
                prompt_ja="Legacy prompt",
                scenario_ja="Legacy scenario",
                response_start_limit_seconds=3,
            )
        )
    await db_session.flush()

    seeded_contents, created_count = await seed_reflex_lessons(db_session)
    await db_session.flush()

    assert created_count == 3
    assert len(seeded_contents) == 5
    assert {content.difficulty for content in seeded_contents} == {
        lesson["difficulty"] for lesson in REFLEX_LESSONS
    }
    assert all(
        content.audio_url and content.audio_url.endswith(".mp3") for content in seeded_contents
    )
    assert all(
        content.audio_duration_ms and content.audio_duration_ms > 0 for content in seeded_contents
    )
    contents_by_slug = {content.slug: content for content in seeded_contents}
    exercises_by_content_id = {
        exercise.content_id: exercise
        for exercise in (await db_session.scalars(select(ReflexExercise))).all()
    }
    for lesson in REFLEX_LESSONS:
        content = contents_by_slug[lesson["slug"]]
        exercise = exercises_by_content_id[content.id]
        assert content.title == lesson["title"]
        assert content.audio_url == lesson["audio_url"]
        assert exercise.prompt_ja == lesson["prompt_ja"]
        assert exercise.scenario_ja == lesson["scenario_ja"]

    seeded_again, created_again = await seed_reflex_lessons(db_session)
    await db_session.flush()

    reflex_count = await db_session.scalar(
        select(func.count())
        .select_from(LearningContent)
        .where(LearningContent.content_type == "REFLEX")
    )
    exercise_count = await db_session.scalar(select(func.count()).select_from(ReflexExercise))

    assert created_again == 0
    assert len(seeded_again) == 5
    assert reflex_count == 5
    assert exercise_count == 5


async def test_seed_translation_lessons_replaces_legacy_catalog_without_duplicates(
    db_session,
) -> None:
    for lesson in (TRANSLATION_LESSONS[1], TRANSLATION_LESSONS[3]):
        legacy_content = LearningContent(
            content_type=ContentType.LISTENING_TRANSLATION,
            status=ContentStatus.PUBLISHED,
            slug=lesson["slug"],
            title="Legacy Translation lesson",
            difficulty=lesson["difficulty"],
            audio_url="https://example.com/legacy.mp3",
            base_exp=80,
        )
        db_session.add(legacy_content)
        await db_session.flush()
        db_session.add(
            TranslationExercise(
                content_id=legacy_content.id,
                reference_translation_vi="Bản dịch cũ",
            )
        )
    await db_session.flush()

    seeded_contents, created_count = await seed_translation_lessons(db_session)
    await db_session.flush()

    assert created_count == 3
    assert len(seeded_contents) == 5
    assert {content.difficulty for content in seeded_contents} == {
        lesson["difficulty"] for lesson in TRANSLATION_LESSONS
    }
    assert all(
        content.audio_url and content.audio_url.endswith(".mp3") for content in seeded_contents
    )
    assert all(
        content.audio_duration_ms and content.audio_duration_ms > 0 for content in seeded_contents
    )
    contents_by_slug = {content.slug: content for content in seeded_contents}
    exercises_by_content_id = {
        exercise.content_id: exercise
        for exercise in (await db_session.scalars(select(TranslationExercise))).all()
    }
    for lesson in TRANSLATION_LESSONS:
        content = contents_by_slug[lesson["slug"]]
        exercise = exercises_by_content_id[content.id]
        assert content.title == lesson["title"]
        assert content.audio_url == lesson["audio_url"]
        assert content.transcript_ja == lesson["transcript_ja"]
        assert exercise.reference_translation_vi == lesson["reference_translation_vi"]

    seeded_again, created_again = await seed_translation_lessons(db_session)
    await db_session.flush()

    translation_count = await db_session.scalar(
        select(func.count())
        .select_from(LearningContent)
        .where(LearningContent.content_type == ContentType.LISTENING_TRANSLATION)
    )
    exercise_count = await db_session.scalar(select(func.count()).select_from(TranslationExercise))

    assert created_again == 0
    assert len(seeded_again) == 5
    assert translation_count == 5
    assert exercise_count == 5


async def test_seed_tutor_scenarios_replaces_legacy_catalog_without_duplicates(
    db_session,
) -> None:
    for scenario_seed in (TUTOR_SCENARIOS[0], TUTOR_SCENARIOS[5]):
        db_session.add(
            TutorScenario(
                slug=scenario_seed["slug"],
                topic="Chủ đề cũ",
                title="Scenario cũ",
                scenario="Bối cảnh cũ",
                is_active=False,
                display_order=999,
            )
        )
    await db_session.flush()

    seeded_scenarios, created_count = await seed_tutor_scenarios(db_session)
    await db_session.flush()

    assert created_count == 8
    assert len(seeded_scenarios) == 10
    scenarios_by_slug = {scenario.slug: scenario for scenario in seeded_scenarios}
    for scenario_seed in TUTOR_SCENARIOS:
        scenario = scenarios_by_slug[scenario_seed["slug"]]
        assert scenario.topic == scenario_seed["topic"]
        assert scenario.title == scenario_seed["title"]
        assert scenario.scenario == scenario_seed["scenario"]
        assert scenario.is_active
        assert scenario.display_order == scenario_seed["display_order"]

    seeded_again, created_again = await seed_tutor_scenarios(db_session)
    await db_session.flush()
    scenario_count = await db_session.scalar(select(func.count()).select_from(TutorScenario))

    assert created_again == 0
    assert len(seeded_again) == 10
    assert scenario_count == 10


async def test_seed_xp_transactions_is_idempotent(db_session) -> None:
    user = User(
        email="seed-xp@example.com",
        password_hash="seed-password",
        display_name="Seed XP User",
        role=UserRole.USER,
        is_active=True,
    )
    content = LearningContent(
        content_type=ContentType.REFLEX,
        status=ContentStatus.PUBLISHED,
        slug="seed-xp-reflex",
        title="Seed XP Reflex",
        difficulty=JlptLevel.N5,
        base_exp=70,
    )
    db_session.add_all([user, content])
    await db_session.flush()

    attempt = ExerciseAttempt(
        user_id=user.id,
        content_id=content.id,
        attempt_number=1,
        status=AttemptStatus.COMPLETED,
        score=100,
        correct_count=1,
        total_count=1,
    )
    db_session.add(attempt)
    await db_session.flush()

    first_created = await seed_xp_transactions(db_session, [user], attempt)
    second_created = await seed_xp_transactions(db_session, [user], attempt)
    transaction_count = await db_session.scalar(
        select(func.count()).select_from(XpTransaction).where(XpTransaction.user_id == user.id)
    )

    assert first_created == 10
    assert second_created == 0
    assert transaction_count == 10
