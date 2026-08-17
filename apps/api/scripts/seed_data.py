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
from app.models.tutor import TutorScenario
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


class ReflexLessonSeed(TypedDict):
    slug: str
    title: str
    short_description: str
    topic: str
    difficulty: JlptLevel
    audio_url: str
    audio_duration_ms: int
    prompt_ja: str
    scenario_ja: str


class TranslationLessonSeed(TypedDict):
    slug: str
    title: str
    short_description: str
    topic: str
    difficulty: JlptLevel
    audio_url: str
    audio_duration_ms: int
    transcript_ja: list[dict[str, object]]
    reference_translation_vi: str


class TutorScenarioSeed(TypedDict):
    slug: str
    topic: str
    title: str
    scenario: str
    display_order: int


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


REFLEX_LESSONS: tuple[ReflexLessonSeed, ...] = (
    {
        "slug": "reflex-n5-greeting",
        "title": "Chào hỏi buổi sáng",
        "short_description": "Gặp đồng nghiệp và chào hỏi vào buổi sáng.",
        "topic": "Giao tiếp hàng ngày",
        "difficulty": JlptLevel.N5,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786964054/reflex/n5/greeting.mp3",
        "audio_duration_ms": 4702,
        "prompt_ja": "おはようございます。今日はいい天気ですね。",
        "scenario_ja": "会社で同僚に朝のあいさつをする場面",
    },
    {
        "slug": "reflex-n4-shopping",
        "title": "Hỏi mua quần áo",
        "short_description": "Trao đổi với nhân viên khi tìm quần áo trong cửa hàng.",
        "topic": "Mua sắm",
        "difficulty": JlptLevel.N4,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786964120/reflex/n4/shopping.mp3",
        "audio_duration_ms": 4780,
        "prompt_ja": "いらっしゃいませ。今日は何をお探しですか。",
        "scenario_ja": "店員がお客さんに声をかける場面",
    },
    {
        "slug": "reflex-n3-invitation",
        "title": "Từ chối lời mời lịch sự",
        "short_description": "Phản hồi lời mời đi uống vào buổi tối một cách lịch sự.",
        "topic": "Lời mời",
        "difficulty": JlptLevel.N3,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786964137/reflex/n3/invitation.mp3",
        "audio_duration_ms": 3396,
        "prompt_ja": "今晩、一緒に飲みに行きませんか。",
        "scenario_ja": "友人から飲みに誘われた場面",
    },
    {
        "slug": "reflex-n2-workplace-request",
        "title": "Nhờ xác nhận tài liệu",
        "short_description": "Nhờ đồng nghiệp kiểm tra tài liệu trước cuộc họp ngày mai.",
        "topic": "Công việc",
        "difficulty": JlptLevel.N2,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786964160/reflex/n2/workplace-request.mp3",
        "audio_duration_ms": 5251,
        "prompt_ja": "この資料について、明日の会議までに確認していただけますか。",
        "scenario_ja": "会議前に資料の確認を依頼する場面",
    },
    {
        "slug": "reflex-n1-workstyle-opinion",
        "title": "Quan điểm về cách làm việc",
        "short_description": "Nêu ý kiến về sự đa dạng trong cách làm việc hiện nay.",
        "topic": "Xã hội",
        "difficulty": JlptLevel.N1,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786964183/reflex/n1/workstyle-opinion.mp3",
        "audio_duration_ms": 5669,
        "prompt_ja": "最近、働き方の多様化について、どのようにお考えですか。",
        "scenario_ja": "働き方の多様化について意見を述べる場面",
    },
)


TRANSLATION_LESSONS: tuple[TranslationLessonSeed, ...] = (
    {
        "slug": "translation-n5-restaurant",
        "title": "Đặt bàn tại nhà hàng",
        "short_description": "Nghe hội thoại ngắn khi đặt chỗ tại nhà hàng.",
        "topic": "Nhà hàng",
        "difficulty": JlptLevel.N5,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786965089/translation/n5/restaurant.mp3",
        "audio_duration_ms": 11807,
        "transcript_ja": [
            {
                "start_time_ms": 0,
                "end_time_ms": 11807,
                "script": (
                    "いらっしゃいませ。何名様ですか。"
                    "二人です。窓の近くの席はありますか。"
                    "はい、こちらへどうぞ。"
                ),
            }
        ],
        "reference_translation_vi": (
            "Xin chào quý khách. Quý khách đi mấy người ạ? Hai người. "
            "Có chỗ nào gần cửa sổ không? Vâng, mời quý khách qua đây."
        ),
    },
    {
        "slug": "translation-n4-shopping",
        "title": "Mua sắm quần áo",
        "short_description": "Nghe hội thoại khi hỏi size và thử quần áo trong cửa hàng.",
        "topic": "Mua sắm",
        "difficulty": JlptLevel.N4,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786965128/translation/n4/shopping.mp3",
        "audio_duration_ms": 12330,
        "transcript_ja": [
            {
                "start_time_ms": 0,
                "end_time_ms": 12330,
                "script": (
                    "すみません。このシャツの大きいサイズはありますか。"
                    "はい、ございます。試着してもいいですか。"
                    "もちろんです。"
                ),
            }
        ],
        "reference_translation_vi": (
            "Xin lỗi, chiếc áo này có size lớn hơn không? Có ạ. "
            "Tôi thử đồ được không? Tất nhiên rồi."
        ),
    },
    {
        "slug": "translation-n3-travel",
        "title": "Hỏi đường đến ga Tokyo",
        "short_description": "Nghe hội thoại hỏi tuyến tàu để đi đến ga Tokyo.",
        "topic": "Du lịch",
        "difficulty": JlptLevel.N3,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786965164/translation/n3/travel.mp3",
        "audio_duration_ms": 10240,
        "transcript_ja": [
            {
                "start_time_ms": 0,
                "end_time_ms": 10240,
                "script": (
                    "東京駅まで行きたいのですが、どの電車に乗ればいいですか。"
                    "三番線の電車に乗ってください。ありがとうございます。"
                ),
            }
        ],
        "reference_translation_vi": (
            "Tôi muốn đến ga Tokyo, tôi nên đi tàu nào? Hãy đi tàu ở sân ga số 3. Cảm ơn bạn."
        ),
    },
    {
        "slug": "translation-n2-business",
        "title": "Điều chỉnh điều khoản thanh toán",
        "short_description": "Nghe cuộc trao đổi công việc về thời hạn thanh toán trong hợp đồng.",
        "topic": "Công việc",
        "difficulty": JlptLevel.N2,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786965209/translation/n2/business.mp3",
        "audio_duration_ms": 13531,
        "transcript_ja": [
            {
                "start_time_ms": 0,
                "end_time_ms": 13531,
                "script": (
                    "契約書の支払い条件について、一つご相談があります。"
                    "支払い期限を三十日から六十日に変更していただくことは可能でしょうか。"
                    "社内で確認してみます。"
                ),
            }
        ],
        "reference_translation_vi": (
            "Về điều khoản thanh toán trong hợp đồng, tôi có một vấn đề muốn trao đổi. "
            "Có thể thay đổi thời hạn thanh toán từ 30 ngày thành 60 ngày không? "
            "Tôi sẽ xác nhận trong nội bộ công ty."
        ),
    },
    {
        "slug": "translation-n1-workstyle",
        "title": "Đa dạng hóa cách làm việc",
        "short_description": "Nghe cuộc trao đổi về việc cân bằng hiệu quả và sức khỏe nhân viên.",
        "topic": "Xã hội",
        "difficulty": JlptLevel.N1,
        "audio_url": "https://res.cloudinary.com/pje4ce0j/video/upload/v1786965259/translation/n1/workstyle.mp3",
        "audio_duration_ms": 15595,
        "transcript_ja": [
            {
                "start_time_ms": 0,
                "end_time_ms": 15595,
                "script": (
                    "最近、働き方の多様化が進んでいますが、効率と社員の健康を両立させるには、"
                    "どのような制度が必要だとお考えですか。"
                    "在宅勤務と出社を柔軟に組み合わせることが重要だと思います。"
                ),
            }
        ],
        "reference_translation_vi": (
            "Gần đây, cách thức làm việc đang trở nên đa dạng. Theo bạn cần những chế độ nào "
            "để cân bằng hiệu quả và sức khỏe nhân viên? Tôi nghĩ việc kết hợp linh hoạt "
            "làm việc tại nhà và đến văn phòng là rất quan trọng."
        ),
    },
)


TUTOR_SCENARIOS: tuple[TutorScenarioSeed, ...] = (
    {
        "slug": "daily-new-classmate",
        "topic": "Giao tiếp hàng ngày",
        "title": "Tự giới thiệu với bạn học mới",
        "scenario": (
            "Bạn gặp một bạn học mới trong lớp tiếng Nhật. "
            "Hãy tự giới thiệu bản thân và hỏi tên của bạn ấy."
        ),
        "display_order": 10,
    },
    {
        "slug": "daily-weekend-plans",
        "topic": "Giao tiếp hàng ngày",
        "title": "Hỏi kế hoạch cuối tuần",
        "scenario": (
            "Bạn nói chuyện với một người bạn về kế hoạch cuối tuần "
            "và rủ bạn ấy cùng tham gia một hoạt động."
        ),
        "display_order": 20,
    },
    {
        "slug": "restaurant-order-meal",
        "topic": "Nhà hàng",
        "title": "Gọi món tại nhà hàng",
        "scenario": (
            "Bạn đang gọi món tại một nhà hàng Nhật. Hãy hỏi món được đề xuất và gọi món mình muốn."
        ),
        "display_order": 30,
    },
    {
        "slug": "restaurant-special-request",
        "topic": "Nhà hàng",
        "title": "Yêu cầu món ăn đặc biệt",
        "scenario": (
            "Bạn không ăn được một nguyên liệu trong món ăn. "
            "Hãy lịch sự hỏi nhân viên xem có thể thay đổi món hay không."
        ),
        "display_order": 40,
    },
    {
        "slug": "travel-train-directions",
        "topic": "Du lịch",
        "title": "Hỏi đường tại ga tàu",
        "scenario": "Bạn đang ở một ga tàu Nhật Bản và cần hỏi đường đến địa điểm tiếp theo.",
        "display_order": 50,
    },
    {
        "slug": "travel-hotel-check-in",
        "topic": "Du lịch",
        "title": "Nhận phòng khách sạn",
        "scenario": (
            "Bạn đến khách sạn ở Nhật để nhận phòng. "
            "Hãy trao đổi với nhân viên lễ tân về đặt phòng và thời gian lưu trú."
        ),
        "display_order": 60,
    },
    {
        "slug": "shopping-ask-size",
        "topic": "Mua sắm",
        "title": "Hỏi size quần áo",
        "scenario": (
            "Bạn muốn mua một chiếc áo nhưng cần hỏi nhân viên về size, màu sắc và việc thử đồ."
        ),
        "display_order": 70,
    },
    {
        "slug": "shopping-return-item",
        "topic": "Mua sắm",
        "title": "Đổi sản phẩm đã mua",
        "scenario": (
            "Bạn muốn đổi một sản phẩm đã mua vì không vừa. "
            "Hãy giải thích vấn đề và hỏi chính sách đổi hàng."
        ),
        "display_order": 80,
    },
    {
        "slug": "workplace-ask-help",
        "topic": "Công việc",
        "title": "Nhờ đồng nghiệp hỗ trợ",
        "scenario": (
            "Bạn gặp khó khăn trong một nhiệm vụ ở công ty và muốn nhờ đồng nghiệp hướng dẫn."
        ),
        "display_order": 90,
    },
    {
        "slug": "workplace-time-off",
        "topic": "Công việc",
        "title": "Xin nghỉ phép",
        "scenario": (
            "Bạn cần xin nghỉ phép với quản lý. Hãy trình bày lý do, "
            "thời gian nghỉ và kế hoạch bàn giao công việc."
        ),
        "display_order": 100,
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


async def seed_reflex_lessons(session: AsyncSession) -> tuple[list[LearningContent], int]:
    """Create or update the current N5-N1 Reflex seed catalog idempotently."""
    seeded_contents: list[LearningContent] = []
    created_count = 0

    for lesson in REFLEX_LESSONS:
        content_query = select(LearningContent).where(LearningContent.slug == lesson["slug"])
        content = (await session.execute(content_query)).scalar_one_or_none()
        if content is None:
            content = LearningContent(
                content_type=ContentType.REFLEX,
                status=ContentStatus.PUBLISHED,
                slug=lesson["slug"],
                title=lesson["title"],
                short_description=lesson["short_description"],
                topic=lesson["topic"],
                difficulty=lesson["difficulty"],
                audio_url=lesson["audio_url"],
                audio_duration_ms=lesson["audio_duration_ms"],
                base_exp=70,
                published_at=datetime.now(UTC),
            )
            session.add(content)
            await session.flush()
            created_count += 1

        if content.content_type != ContentType.REFLEX:
            raise RuntimeError(f"Seed slug is already used by non-Reflex content: {lesson['slug']}")

        content.status = ContentStatus.PUBLISHED
        content.title = lesson["title"]
        content.short_description = lesson["short_description"]
        content.topic = lesson["topic"]
        content.difficulty = lesson["difficulty"]
        content.audio_url = lesson["audio_url"]
        content.audio_duration_ms = lesson["audio_duration_ms"]
        content.base_exp = 70
        content.published_at = content.published_at or datetime.now(UTC)

        reflex_query = select(ReflexExercise).where(ReflexExercise.content_id == content.id)
        reflex_ex = (await session.execute(reflex_query)).scalar_one_or_none()
        if reflex_ex is None:
            reflex_ex = ReflexExercise(content_id=content.id)
            session.add(reflex_ex)

        reflex_ex.prompt_ja = lesson["prompt_ja"]
        reflex_ex.scenario_ja = lesson["scenario_ja"]
        reflex_ex.response_start_limit_seconds = 3
        await session.flush()
        seeded_contents.append(content)

    return seeded_contents, created_count


async def seed_reflex_data() -> dict[str, int]:
    """Seed only the current Reflex catalog."""
    async with AsyncSessionLocal() as session:
        seeded_contents, _ = await seed_reflex_lessons(session)
        await session.commit()
        return {"reflex_lessons": len(seeded_contents)}


async def seed_translation_lessons(
    session: AsyncSession,
) -> tuple[list[LearningContent], int]:
    """Create or update the current N5-N1 Translation seed catalog idempotently."""
    seeded_contents: list[LearningContent] = []
    created_count = 0

    for lesson in TRANSLATION_LESSONS:
        content_query = select(LearningContent).where(LearningContent.slug == lesson["slug"])
        content = (await session.execute(content_query)).scalar_one_or_none()
        if content is None:
            content = LearningContent(
                content_type=ContentType.LISTENING_TRANSLATION,
                status=ContentStatus.PUBLISHED,
                slug=lesson["slug"],
                title=lesson["title"],
                short_description=lesson["short_description"],
                topic=lesson["topic"],
                difficulty=lesson["difficulty"],
                audio_url=lesson["audio_url"],
                audio_duration_ms=lesson["audio_duration_ms"],
                transcript_ja=lesson["transcript_ja"],
                base_exp=80,
                published_at=datetime.now(UTC),
            )
            session.add(content)
            await session.flush()
            created_count += 1

        if content.content_type != ContentType.LISTENING_TRANSLATION:
            raise RuntimeError(
                f"Seed slug is already used by non-Translation content: {lesson['slug']}"
            )

        content.status = ContentStatus.PUBLISHED
        content.title = lesson["title"]
        content.short_description = lesson["short_description"]
        content.topic = lesson["topic"]
        content.difficulty = lesson["difficulty"]
        content.audio_url = lesson["audio_url"]
        content.audio_duration_ms = lesson["audio_duration_ms"]
        content.transcript_ja = lesson["transcript_ja"]
        content.base_exp = 80
        content.published_at = content.published_at or datetime.now(UTC)

        translation_query = select(TranslationExercise).where(
            TranslationExercise.content_id == content.id
        )
        translation_ex = (await session.execute(translation_query)).scalar_one_or_none()
        if translation_ex is None:
            translation_ex = TranslationExercise(content_id=content.id)
            session.add(translation_ex)

        translation_ex.reference_translation_vi = lesson["reference_translation_vi"]
        await session.flush()
        seeded_contents.append(content)

    return seeded_contents, created_count


async def seed_translation_data() -> dict[str, int]:
    """Seed only the current Translation catalog."""
    async with AsyncSessionLocal() as session:
        seeded_contents, _ = await seed_translation_lessons(session)
        await session.commit()
        return {"listening_translation_lessons": len(seeded_contents)}


async def seed_tutor_scenarios(
    session: AsyncSession,
) -> tuple[list[TutorScenario], int]:
    """Create or update the current Tutor scenario catalog idempotently."""
    seeded_scenarios: list[TutorScenario] = []
    created_count = 0

    for scenario_seed in TUTOR_SCENARIOS:
        scenario_query = select(TutorScenario).where(TutorScenario.slug == scenario_seed["slug"])
        scenario = (await session.execute(scenario_query)).scalar_one_or_none()
        if scenario is None:
            scenario = TutorScenario(
                slug=scenario_seed["slug"],
                topic=scenario_seed["topic"],
                title=scenario_seed["title"],
                scenario=scenario_seed["scenario"],
                is_active=True,
                display_order=scenario_seed["display_order"],
            )
            session.add(scenario)
            await session.flush()
            created_count += 1

        scenario.topic = scenario_seed["topic"]
        scenario.title = scenario_seed["title"]
        scenario.scenario = scenario_seed["scenario"]
        scenario.is_active = True
        scenario.display_order = scenario_seed["display_order"]
        await session.flush()
        seeded_scenarios.append(scenario)

    return seeded_scenarios, created_count


async def seed_tutor_scenarios_data() -> dict[str, int]:
    """Seed only the current Tutor scenario catalog."""
    async with AsyncSessionLocal() as session:
        seeded_scenarios, _ = await seed_tutor_scenarios(session)
        await session.commit()
        return {"tutor_scenarios": len(seeded_scenarios)}


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
        TutorScenario,
        User,
    ]
    for table in tables_to_clean:
        await session.execute(delete(table))
    await session.commit()
    logger.info("Database cleaned successfully.")


async def seed_xp_transactions(
    session: AsyncSession,
    seeded_users: list[User],
    attempt: ExerciseAttempt,
) -> int:
    """Create the deterministic sample XP transactions once per seed identity."""
    created_count = 0

    for i in range(10):
        target_user = seeded_users[i % len(seeded_users)]
        reason = f"Completed daily exercise #{i + 1}"
        if i == 0:
            xp_query = select(XpTransaction).where(XpTransaction.attempt_id == attempt.id)
        else:
            xp_query = select(XpTransaction).where(
                XpTransaction.user_id == target_user.id,
                XpTransaction.attempt_id.is_(None),
                XpTransaction.amount == 50,
                XpTransaction.reason == reason,
            )

        existing_transaction = (await session.scalars(xp_query)).first()
        if existing_transaction is not None:
            continue

        session.add(
            XpTransaction(
                user_id=target_user.id,
                attempt_id=attempt.id if i == 0 else None,
                amount=50,
                reason=reason,
                created_at=datetime.now(UTC) - timedelta(hours=i * 2),
            )
        )
        created_count += 1

    await session.flush()
    return created_count


async def seed_data(clean: bool = False) -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        if clean:
            await clean_database(session)

        stats = {
            "users": 0,
            "shadowing_dictation_lessons": 0,
            "reflex_lessons": 0,
            "listening_translation_lessons": 0,
            "tutor_scenarios": 0,
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

        # 4.3 Reflex (one lesson for each JLPT level: N5-N1)
        reflex_contents, reflex_count = await seed_reflex_lessons(session)
        stats["reflex_lessons"] = reflex_count
        seeded_contents.extend(reflex_contents)

        # 4.4 Listening & Translation (one lesson for each JLPT level: N5-N1)
        translation_contents, translation_count = await seed_translation_lessons(session)
        stats["listening_translation_lessons"] = translation_count
        seeded_contents.extend(translation_contents)

        _, tutor_scenario_count = await seed_tutor_scenarios(session)
        stats["tutor_scenarios"] = tutor_scenario_count

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

        stats["exp_entries"] = await seed_xp_transactions(session, seeded_users, attempt)

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
    parser.add_argument(
        "--reflex-only",
        action="store_true",
        help="Seed only the current Reflex lessons",
    )
    parser.add_argument(
        "--translation-only",
        action="store_true",
        help="Seed only the current Listening & Translation lessons",
    )
    parser.add_argument(
        "--tutor-scenarios-only",
        action="store_true",
        help="Seed only the current Tutor scenario catalog",
    )
    args = parser.parse_args()

    selected_modes = sum(
        bool(mode)
        for mode in (
            args.youtube_only,
            args.reflex_only,
            args.translation_only,
            args.tutor_scenarios_only,
        )
    )
    if selected_modes > 1:
        parser.error("Seed-only options cannot be combined")
    if selected_modes and args.clean:
        parser.error("--clean cannot be combined with seed-only options")

    if args.reflex_only:
        stats = asyncio.run(seed_reflex_data())
    elif args.translation_only:
        stats = asyncio.run(seed_translation_data())
    elif args.tutor_scenarios_only:
        stats = asyncio.run(seed_tutor_scenarios_data())
    elif args.youtube_only:
        stats = asyncio.run(seed_youtube_data())
    else:
        stats = asyncio.run(seed_data(clean=args.clean))
    print("\n--- SEED EXECUTION SUMMARY ---")
    for entity, count in stats.items():
        print(f"{entity}: {count}")


if __name__ == "__main__":
    main()
