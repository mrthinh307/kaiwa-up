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
from app.models.attempt import ExerciseAttempt, ReviewSchedule
from app.models.content import (
    LearningContent,
    ReflexExercise,
    TranslationExercise,
)
from app.models.enums import AttemptStatus, ContentStatus, ContentType, UserRole
from app.models.gamification import (
    Achievement,
    LevelDefinition,
    WeeklyLeaderboardEntry,
    XpTransaction,
)
from app.models.user import User, UserProgress

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_data")


class UserSeed(TypedDict):
    email: str
    display_name: str
    role: UserRole
    exp: int
    level: int


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
        LevelDefinition,
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
        # 1. SEED LEVEL DEFINITIONS
        # ==========================================
        levels_data = [
            {"level": 1, "required_total_exp": 0, "title": "Tân thủ Kaiwa"},
            {"level": 2, "required_total_exp": 100, "title": "Người chăm chỉ"},
            {"level": 3, "required_total_exp": 300, "title": "Chiến thần Luyện nói"},
            {"level": 4, "required_total_exp": 600, "title": "Chuyên gia Phản xạ"},
            {"level": 5, "required_total_exp": 1000, "title": "Bậc thầy Kaiwa"},
        ]
        for l_data in levels_data:
            level_query = select(LevelDefinition).where(LevelDefinition.level == l_data["level"])
            res = await session.execute(level_query)
            if not res.scalar_one_or_none():
                session.add(LevelDefinition(**l_data))

        # ==========================================
        # 2. SEED USERS & USER_PROGRESS
        # ==========================================
        hashed_pwd = hash_password("12345678")
        users_payload: list[UserSeed] = [
            {
                "email": "admin@kaiwaup.com",
                "display_name": "Admin KaiwaUp",
                "role": UserRole.ADMIN,
                "exp": 1200,
                "level": 5,
            },
            {
                "email": "user1@kaiwaup.com",
                "display_name": "Nguyen Van A",
                "role": UserRole.USER,
                "exp": 450,
                "level": 3,
            },
            {
                "email": "user2@kaiwaup.com",
                "display_name": "Tran Thi B",
                "role": UserRole.USER,
                "exp": 200,
                "level": 2,
            },
            {
                "email": "user3@kaiwaup.com",
                "display_name": "Tanaka Taro",
                "role": UserRole.USER,
                "exp": 80,
                "level": 1,
            },
            {
                "email": "user4@kaiwaup.com",
                "display_name": "Yamada Hanako",
                "role": UserRole.USER,
                "exp": 0,
                "level": 1,
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
                    current_level=u_info["level"],
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
                "name": "Khởi đầu mới",
                "description": "Hoàn thành bài học đầu tiên",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/first.png",
                "criteria": {"type": "completed_count", "target": 1},
            },
            {
                "code": "shadow_master_1",
                "name": "Bậc Thầy Shadowing I",
                "description": "Hoàn thành 5 bài tập Shadowing",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/shadow1.png",
                "criteria": {"type": "shadowing_count", "target": 5},
            },
            {
                "code": "dictation_pro",
                "name": "Thánh Nghe Chép",
                "description": "Đạt điểm tuyệt đối trong 1 bài Dictation",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/dictation.png",
                "criteria": {"type": "dictation_score", "target": 100},
            },
            {
                "code": "reflex_king",
                "name": "Phản Xạ Thần Tốc",
                "description": "Trả lời Reflex dưới 2 giây",
                "icon_url": "https://res.cloudinary.com/kaiwaup/image/upload/v1/badges/reflex.png",
                "criteria": {"type": "reflex_speed", "max_seconds": 2},
            },
        ]

        for ach in achievements_data:
            achievement_query = select(Achievement).where(Achievement.code == ach["code"])
            if not (await session.execute(achievement_query)).scalar_one_or_none():
                session.add(Achievement(**ach))
                stats["achievements"] += 1

        # ==========================================
        # 4. SEED LEARNING CONTENTS & EXERCISES
        # ==========================================
        # 4.1 Shared Shadowing and Dictation content
        listening_lessons = [
            {
                "slug": "listening-n5-jidoshoukai",
                "title": "N5: Tự giới thiệu bản thân (自己紹介)",
                "difficulty": 1,  # N5
                "audio_url": "https://res.cloudinary.com/kaiwaup/video/upload/v1/audio/shadowing_n5.mp3",
                "audio_duration_ms": 15000,
                "transcript_ja": [
                    {
                        "start_time_ms": 0,
                        "end_time_ms": 7000,
                        "script": "はじめまして、田中です。",
                    },
                    {
                        "start_time_ms": 7000,
                        "end_time_ms": 15000,
                        "script": "よろしくお願いします。",
                    },
                ],
            },
            {
                "slug": "listening-n3-office",
                "title": "N3: Trao đổi công việc văn phòng",
                "difficulty": 3,  # N3
                "audio_url": "https://res.cloudinary.com/kaiwaup/video/upload/v1/audio/shadowing_n3.mp3",
                "audio_duration_ms": 25000,
                "transcript_ja": [
                    {
                        "start_time_ms": 0,
                        "end_time_ms": 12000,
                        "script": "明日の会議の資料ですが、",
                    },
                    {
                        "start_time_ms": 12000,
                        "end_time_ms": 25000,
                        "script": "今日の夕方までに準備しておきます。",
                    },
                ],
            },
            {
                "slug": "listening-n1-news",
                "title": "N1: Tin tức kinh tế nhật bản",
                "difficulty": 5,  # N1
                "audio_url": "https://res.cloudinary.com/kaiwaup/video/upload/v1/audio/shadowing_n1.mp3",
                "audio_duration_ms": 40000,
                "transcript_ja": [
                    {
                        "start_time_ms": 0,
                        "end_time_ms": 19000,
                        "script": "世界経済の変動に伴い、",
                    },
                    {
                        "start_time_ms": 19000,
                        "end_time_ms": 40000,
                        "script": "国内の物価上昇傾向が続いております。",
                    },
                ],
            },
        ]

        seeded_contents: list[LearningContent] = []
        for s in listening_lessons:
            content_query = select(LearningContent).where(LearningContent.slug == s["slug"])
            content = (await session.execute(content_query)).scalar_one_or_none()
            if not content:
                content = LearningContent(
                    content_type=ContentType.SHADOWING_DICTATION,
                    status=ContentStatus.PUBLISHED,
                    slug=s["slug"],
                    title=s["title"],
                    short_description="Luyện Shadowing hoặc Dictation theo từng đoạn audio",
                    difficulty=s["difficulty"],
                    audio_url=s["audio_url"],
                    audio_duration_ms=s["audio_duration_ms"],
                    transcript_ja=s["transcript_ja"],
                    base_exp=50,
                    published_at=datetime.now(UTC),
                )
                session.add(content)
                await session.flush()

                stats["shadowing_dictation_lessons"] += 1
            seeded_contents.append(content)

        # 4.3 Reflex (2 lessons: N5, N3)
        reflex_lessons = [
            {
                "slug": "reflex-n5-greeting",
                "title": "N5: Đáp lại lời chào hỏi",
                "difficulty": 1,
                "prompt_ja": "おはようございます！",
                "scenario": "Gặp đồng nghiệp vào buổi sáng tại công ty",
            },
            {
                "slug": "reflex-n3-invitation",
                "title": "N3: Từ chối lời mời lịch sự",
                "difficulty": 3,
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
            seeded_contents.append(content)

        # 4.4 Listening & Translation (2 lessons)
        translation_lessons = [
            {
                "slug": "translation-n4-restaurant",
                "title": "N4: Gọi món tại nhà hàng",
                "difficulty": 2,
                "audio_url": "https://res.cloudinary.com/kaiwaup/video/upload/v1/audio/trans_n4.mp3",
                "ref_vi": "Xin lỗi, cho tôi xem thực đơn.",
            },
            {
                "slug": "translation-n2-business",
                "title": "N2: Đàm phán hợp đồng",
                "difficulty": 4,
                "audio_url": "https://res.cloudinary.com/kaiwaup/video/upload/v1/audio/trans_n2.mp3",
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
    args = parser.parse_args()

    stats = asyncio.run(seed_data(clean=args.clean))
    print("\n--- SEED EXECUTION SUMMARY ---")
    for entity, count in stats.items():
        print(f"{entity}: {count}")


if __name__ == "__main__":
    main()
