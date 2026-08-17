import argparse
import asyncio
import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import TypedDict

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.integrations.youtube import YouTubeCaptionProvider
from app.models.attempt import ExerciseAttempt, ReviewSchedule
from app.models.content import LearningContent, ReflexExercise, TranslationExercise
from app.models.enums import AttemptStatus, ContentStatus, ContentType, JlptLevel, UserRole
from app.models.gamification import Achievement, WeeklyLeaderboardEntry, XpTransaction
from app.models.user import User, UserProgress
from app.repositories.learning_content import LearningContentRepository
from app.schemas.learning_content import LearningContentCreate
from app.services.learning_content import LearningContentService
from app.services.leveling import level_for_total_exp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_data")


class UserSeed(TypedDict):
    email: str
    display_name: str
    role: UserRole
    exp: int


class YouTubeLessonSeed(TypedDict):
    youtube_url: str
    title: str
    difficulty: JlptLevel


YOUTUBE_LESSONS: tuple[YouTubeLessonSeed, ...] = (
    {
        "youtube_url": "https://www.youtube.com/watch?v=GfkM7xF8orE",
        "title": "".join(
            [
                "痛みや苦しみがわかる人間になりたいよね｜",
                "日本語ポッドキャスト、N2～N1聴解【中級、上級】",
            ]
        ),
        "difficulty": JlptLevel.N2,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=EnXnpI-bCUk",
        "title": (
            "【日本語ポッドキャストリレー】コーヒーとお酒、どっちを選ぶ？"
            "世界の消費量も調べてみた！｜日本語ポッドキャスト、N3～N1聴解【中級、上級】"
        ),
        "difficulty": JlptLevel.N2,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=UXX2p47i5Jo",
        "title": "私が日本を出た理由 Japanese Listening Practice N3・N2レベル【中級】Ep.714",
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=wDlbYTLREVg",
        "title": "".join(
            [
                "[Japanese Podcast] Summer in Japan: What Do People Eat? 🇯🇵 | ",
                "Easy Japanese Podcast",
            ]
        ),
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=gcMUMqSacFs",
        "title": "".join(
            [
                "Relaxing Japanese Listening: A Peaceful Night | 安らぎの夜 | ",
                "Japanese Daily Podcast",
            ]
        ),
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=wZzjMc4BzE0",
        "title": "Shopping at a Huge Japanese Supermarket! Useful Japanese Phrases 🛒",
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=1kDRCAg7s1Q",
        "title": "日本の夏の過ごし方 Japanese Listening Practice N3・N2レベル【中級】Ep.704",
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=Tz6iAK_XRAA",
        "title": "A Day in My Hometown 🌇 | Easy Japanese Listening (N4, 20 min)",
        "difficulty": JlptLevel.N4,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=_9mTBpPyiL4",
        "title": "".join(
            [
                "祖父が亡くなって思ったこと Japanese Listening Practice ",
                "N3・N2レベル【中級】Ep.713",
            ]
        ),
        "difficulty": JlptLevel.N3,
    },
    {
        "youtube_url": "https://www.youtube.com/watch?v=yKINx0VaC-Y",
        "title": "【Japanese Podcast #39】How Japanese People REALLY Say No (Without Saying It)",
        "difficulty": JlptLevel.N2,
    },
)


async def seed_youtube_lessons(session: AsyncSession) -> list[LearningContent]:
    """Create and publish listening lessons from live Japanese YouTube captions."""
    repository = LearningContentRepository(session)
    service = LearningContentService(repository, YouTubeCaptionProvider())
    seeded_contents: list[LearningContent] = []

    for lesson in YOUTUBE_LESSONS:
        youtube_url = lesson["youtube_url"]
        video_id = YouTubeCaptionProvider.extract_video_id(youtube_url)
        slug = f"youtube-{video_id}"
        content = await repository.get_by_slug(slug)
        if content is None:
            created = await service.create_from_youtube(
                LearningContentCreate(
                    youtube_url=youtube_url,  # type: ignore
                    title=lesson["title"],
                    topic="Japanese listening",
                    difficulty=lesson["difficulty"],
                    base_exp=50,
                )
            )
            content = await repository.get_by_slug(created.slug)
            if content is None:
                raise RuntimeError(f"Created YouTube lesson was not found: {created.slug}")

        if content.title != lesson["title"] or content.difficulty != lesson["difficulty"]:
            content.title = lesson["title"]
            content.difficulty = lesson["difficulty"]
            await repository.update(content)
        if content.status != ContentStatus.PUBLISHED:
            await service.publish_content(content.id)
        seeded_contents.append(content)

    await session.commit()
    return seeded_contents


async def seed_youtube_data() -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        contents = await seed_youtube_lessons(session)
        stats = {"shadowing_dictation_lessons": len(contents)}
        stats.update(
            {
                f"{level.value}_lessons": sum(content.difficulty == level for content in contents)
                for level in JlptLevel
            }
        )
        return stats


# Setup database engine
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def clean_database(session: AsyncSession) -> None:
    """Xóa sạch dữ liệu trong database theo đúng thứ tự FK."""
    logger.info("Cleaning up existing database records...")
    tables_to_clean = [
        WeeklyLeaderboardEntry,
        XpTransaction,
        ReviewSchedule,
        ExerciseAttempt,
        ReflexExercise,
        TranslationExercise,
        LearningContent,
        Achievement,
        UserProgress,
        User,
    ]
    for table in tables_to_clean:
        await session.execute(delete(table))
    await session.commit()
    logger.info("Database cleaned successfully.")


async def seed_data(clean: bool = False) -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        if clean:
            await clean_database(session)

        stats = {
            "users": 0,
            "shadowing_dictation_lessons": 0,
            "reflex_lessons": 0,
            "listening_translation_lessons": 0,
            "achievements": 0,
            "exp_entries": 0,
        }

        # ==========================================
        # 1. SEED USERS & USER_PROGRESS
        # ==========================================
        hashed_pwd = hash_password("12345678")
        users_payload: list[UserSeed] = [
            {
                "email": "admin@kaiwaup.com",
                "display_name": "Admin KaiwaUp",
                "role": UserRole.ADMIN,
                "exp": 1200,
            },
            {
                "email": "user1@kaiwaup.com",
                "display_name": "Nguyen Van A",
                "role": UserRole.USER,
                "exp": 450,
            },
            {
                "email": "user2@kaiwaup.com",
                "display_name": "Tran Thi B",
                "role": UserRole.USER,
                "exp": 200,
            },
            {
                "email": "user3@kaiwaup.com",
                "display_name": "Tanaka Taro",
                "role": UserRole.USER,
                "exp": 80,
            },
            {
                "email": "user4@kaiwaup.com",
                "display_name": "Yamada Hanako",
                "role": UserRole.USER,
                "exp": 0,
            },
        ]

        seeded_users: list[User] = []
        for u_info in users_payload:
            user_query = select(User).where(User.email == u_info["email"])
            existing_user = (await session.execute(user_query)).scalar_one_or_none()

            if not existing_user:
                user = User(
                    email=u_info["email"],
                    password_hash=hashed_pwd,
                    display_name=u_info["display_name"],
                    role=u_info["role"],
                    is_active=True,
                )
                session.add(user)
                await session.flush()  # Sinh ID cho User

                progress = UserProgress(
                    user_id=user.id,
                    total_exp=u_info["exp"],
                    current_level=level_for_total_exp(u_info["exp"]),
                    completed_content_count=2 if u_info["exp"] > 0 else 0,
                )
                session.add(progress)
                seeded_users.append(user)
                stats["users"] += 1
            else:
                seeded_users.append(existing_user)

        # ==========================================
        # 3. SEED ACHIEVEMENTS
        # ==========================================
        achievements_data = [
            {
                "code": "first_lesson",
                "name": "A Fresh Start",
                "description": "Complete your first lesson",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/first.png",
                "criteria": {"type": "completed_count", "target": 1},
            },
            {
                "code": "shadow_master_1",
                "name": "Shadowing Master I",
                "description": "Complete 5 shadowing exercises",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/shadow1.png",
                "criteria": {"type": "shadowing_count", "target": 5},
            },
            {
                "code": "dictation_pro",
                "name": "Dictation Pro",
                "description": "Achieve a perfect score in one dictation exercise",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/dictation.png",
                "criteria": {"type": "dictation_score", "target": 100},
            },
            {
                "code": "reflex_king",
                "name": "Reflex King",
                "description": "Answer a reflex exercise in under 2 seconds",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/reflex.png",
                "criteria": {"type": "reflex_speed", "max_seconds": 2},
            },
        ]

        for ach in achievements_data:
            achievement_query = select(Achievement).where(Achievement.code == ach["code"])
            existing_achievement = (await session.execute(achievement_query)).scalar_one_or_none()
            if not existing_achievement:
                session.add(Achievement(**ach))
                stats["achievements"] += 1
            elif (
                existing_achievement.name != ach["name"]
                or existing_achievement.description != ach["description"]
            ):
                existing_achievement.name = ach["name"]
                existing_achievement.description = ach["description"]
                await session.flush()

        # ==========================================
        # 4. SEED LEARNING CONTENTS & EXERCISES
        # ==========================================
        # 4.1 Shared Shadowing and Dictation content
        seeded_contents = await seed_youtube_lessons(session)
        stats["shadowing_dictation_lessons"] = len(seeded_contents)

        # 4.3 Reflex (2 lessons: N5, N3)
        reflex_lessons = [
            {
                "slug": "reflex-n5-greeting",
                "title": "Đáp lại lời chào hỏi",
                "difficulty": JlptLevel.N5,
                "prompt_ja": "おはようございます！",
                "scenario": "Gặp đồng nghiệp vào buổi sáng tại công ty",
            },
            {
                "slug": "reflex-n3-invitation",
                "title": "Từ chối lời mời một cách lịch sự",
                "difficulty": JlptLevel.N3,
                "prompt_ja": "今晩、一緒に飲みに行きませんか。",
                "scenario": "Được sếp rủ đi uống rượu nhưng bạn có hẹn trước",
            },
        ]

        for r in reflex_lessons:
            content_query = select(LearningContent).where(LearningContent.slug == r["slug"])
            content = (await session.execute(content_query)).scalar_one_or_none()
            if not content:
                content = LearningContent(
                    content_type=ContentType.REFLEX,
                    status=ContentStatus.PUBLISHED,
                    slug=r["slug"],
                    title=r["title"],
                    difficulty=r["difficulty"],
                    base_exp=70,
                    published_at=datetime.now(UTC),
                )
                session.add(content)
                await session.flush()

                reflex_ex = ReflexExercise(
                    content_id=content.id,
                    prompt_ja=r["prompt_ja"],
                    scenario_ja=r["scenario"],
                    response_start_limit_seconds=3,
                )
                session.add(reflex_ex)
                stats["reflex_lessons"] += 1
            elif content.title != r["title"]:
                content.title = r["title"]
                await session.flush()
            seeded_contents.append(content)

        # 4.4 Listening & Translation (2 lessons)
        translation_lessons = [
            {
                "slug": "translation-n4-restaurant",
                "title": "Gọi món tại nhà hàng",
                "difficulty": JlptLevel.N4,
                "audio_url": "https://www.youtube.com/watch?v=KaiwaN4T001",
                "ref_vi": "Xin lỗi, cho tôi xem thực đơn.",
            },
            {
                "slug": "translation-n2-business",
                "title": "Đàm phán hợp đồng",
                "difficulty": JlptLevel.N2,
                "audio_url": "https://www.youtube.com/watch?v=KaiwaN2T001",
                "ref_vi": "Chúng tôi mong muốn điều chỉnh lại điều khoản thanh toán.",
            },
        ]

        for t in translation_lessons:
            content_query = select(LearningContent).where(LearningContent.slug == t["slug"])
            content = (await session.execute(content_query)).scalar_one_or_none()
            if not content:
                content = LearningContent(
                    content_type=ContentType.LISTENING_TRANSLATION,
                    status=ContentStatus.PUBLISHED,
                    slug=t["slug"],
                    title=t["title"],
                    difficulty=t["difficulty"],
                    audio_url=t["audio_url"],
                    base_exp=80,
                    published_at=datetime.now(UTC),
                )
                session.add(content)
                await session.flush()

                trans_ex = TranslationExercise(
                    content_id=content.id,
                    reference_translation_vi=t["ref_vi"],
                )
                session.add(trans_ex)
                stats["listening_translation_lessons"] += 1
            elif content.title != t["title"]:
                content.title = t["title"]
                await session.flush()
            seeded_contents.append(content)

        # ==========================================
        # 5. SEED ATTEMPTS, REVIEW SCHEDULES & XP ENTRIES
        # ==========================================
        test_user = seeded_users[1] if len(seeded_users) > 1 else seeded_users[0]
        test_content = seeded_contents[0]

        attempt_query = select(ExerciseAttempt).where(
            ExerciseAttempt.user_id == test_user.id,
            ExerciseAttempt.content_id == test_content.id,
            ExerciseAttempt.attempt_number == 1,
        )
        attempt = (await session.execute(attempt_query)).scalar_one_or_none()

        if not attempt:
            attempt = ExerciseAttempt(
                user_id=test_user.id,
                content_id=test_content.id,
                attempt_number=1,
                status=AttemptStatus.COMPLETED,
                started_at=datetime.now(UTC) - timedelta(minutes=5),
                completed_at=datetime.now(UTC),
                score=Decimal("95.00"),
                correct_count=1,
                total_count=1,
            )
            session.add(attempt)
            await session.flush()

            # Review Schedule (Spaced Repetition)
            review = ReviewSchedule(
                user_id=test_user.id,
                content_id=test_content.id,
                due_at=datetime.now(UTC) + timedelta(days=1),
                interval_days=1,
                ease_factor=Decimal("2.50"),
                repetitions=1,
                last_attempt_id=attempt.id,
            )
            session.add(review)

        # Seed XP Transactions (10 entries mẫu)
        for i in range(10):
            target_u = seeded_users[i % len(seeded_users)]
            xp_tx = XpTransaction(
                user_id=target_u.id,
                attempt_id=attempt.id if i == 0 else None,
                amount=50,
                reason=f"Completed daily exercise #{i + 1}",
                created_at=datetime.now(UTC) - timedelta(hours=i * 2),
            )
            session.add(xp_tx)
            stats["exp_entries"] += 1

        # ==========================================
        # 6. SEED WEEKLY LEADERBOARD
        # ==========================================
        today = date.today()
        monday = today - timedelta(days=today.weekday())

        for idx, u in enumerate(seeded_users):
            leaderboard_query = select(WeeklyLeaderboardEntry).where(
                WeeklyLeaderboardEntry.week_start == monday,
                WeeklyLeaderboardEntry.user_id == u.id,
            )
            if not (await session.execute(leaderboard_query)).scalar_one_or_none():
                leaderboard_entry = WeeklyLeaderboardEntry(
                    week_start=monday,
                    user_id=u.id,
                    weekly_exp=(len(seeded_users) - idx) * 100,
                    rank=idx + 1,
                )
                session.add(leaderboard_entry)

        await session.commit()
        logger.info("Data seeding completed successfully!")
        return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed database for KaiwaUp")
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean database before running seed script",
    )
    parser.add_argument(
        "--youtube-only",
        action="store_true",
        help="Seed only the configured YouTube listening lessons",
    )
    args = parser.parse_args()

    stats = asyncio.run(seed_youtube_data() if args.youtube_only else seed_data(clean=args.clean))
    print("\n--- SEED EXECUTION SUMMARY ---")
    for entity, count in stats.items():
        print(f"{entity}: {count}")


if __name__ == "__main__":
    main()
