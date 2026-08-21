import type {
  TutorConversationDetailResponse,
  TutorConversationListResponse,
  TutorConversationListItem,
} from "@kaiwa-app/api-client";

export const MOCK_TRAVEL_CONVERSATION_ID = "mock-travel";
export const MOCK_OFFICE_CONVERSATION_ID = "mock-office";
export const MOCK_WEEKEND_CONVERSATION_ID = "mock-weekend";
export const MOCK_RESTAURANT_CONVERSATION_ID = "mock-restaurant";
export const MOCK_SHOPPING_CONVERSATION_ID = "mock-shopping";
export const MOCK_DAILY_ROUTINE_CONVERSATION_ID = "mock-daily-routine";
export const MOCK_WEATHER_CONVERSATION_ID = "mock-weather";
export const MOCK_HOBBY_CONVERSATION_ID = "mock-hobby";
export const MOCK_FAMILY_CONVERSATION_ID = "mock-family";
export const MOCK_APARTMENT_CONVERSATION_ID = "mock-apartment";
export const MOCK_DIRECTIONS_CONVERSATION_ID = "mock-directions";
export const MOCK_HEALTH_CONVERSATION_ID = "mock-health";
export const MOCK_STUDY_CONVERSATION_ID = "mock-study";
export const MOCK_AIRPORT_CONVERSATION_ID = "mock-airport";
export const MOCK_JOB_INTERVIEW_CONVERSATION_ID = "mock-job-interview";
export const MOCK_DOCTOR_CONVERSATION_ID = "mock-doctor";
export const MOCK_MUSEUM_CONVERSATION_ID = "mock-museum";
export const MOCK_HOLIDAY_CONVERSATION_ID = "mock-holiday";

export const MOCK_TUTOR_HISTORY_ITEMS = [
  {
    conversation_id: MOCK_TRAVEL_CONVERSATION_ID,
    topic: "Du lịch Nhật Bản",
    difficulty: "N3",
    scenario: "Hỏi một người bạn về kế hoạch đi Kyoto.",
    status: "active",
    last_message_text: "京都に行きたいです。",
    updated_at: "2026-08-20T09:30:00Z",
  },
  {
    conversation_id: MOCK_OFFICE_CONVERSATION_ID,
    topic: "Chào hỏi công sở",
    difficulty: "N5",
    scenario: null,
    status: "active",
    last_message_text: "おはようございます。",
    updated_at: "2026-08-19T08:15:00Z",
  },
  {
    conversation_id: MOCK_WEEKEND_CONVERSATION_ID,
    topic: "Kế hoạch cuối tuần",
    difficulty: "N4",
    scenario: "Nói về những việc muốn làm vào cuối tuần.",
    status: "active",
    last_message_text: "週末は映画を見たいです。",
    updated_at: "2026-08-18T12:00:00Z",
  },
  {
    conversation_id: MOCK_RESTAURANT_CONVERSATION_ID,
    topic: "Gọi món tại nhà hàng",
    difficulty: "N4",
    scenario: "Gọi món và hỏi về nguyên liệu.",
    status: "active",
    last_message_text: "おすすめは何ですか？",
    updated_at: "2026-08-17T10:45:00Z",
  },
  {
    conversation_id: MOCK_SHOPPING_CONVERSATION_ID,
    topic: "Mua sắm",
    difficulty: "N5",
    scenario: null,
    status: "active",
    last_message_text: "これを試着してもいいですか？",
    updated_at: "2026-08-16T06:20:00Z",
  },
  {
    conversation_id: MOCK_DAILY_ROUTINE_CONVERSATION_ID,
    topic: "Thói quen hằng ngày",
    difficulty: "N5",
    scenario: null,
    status: "active",
    last_message_text: "毎朝七時に起きます。",
    updated_at: "2026-08-15T07:10:00Z",
  },
  {
    conversation_id: MOCK_WEATHER_CONVERSATION_ID,
    topic: "Thời tiết hôm nay",
    difficulty: "N5",
    scenario: null,
    status: "active",
    last_message_text: "今日は暑いですね。",
    updated_at: "2026-08-14T04:30:00Z",
  },
  {
    conversation_id: MOCK_HOBBY_CONVERSATION_ID,
    topic: "Sở thích",
    difficulty: "N4",
    scenario: null,
    status: "active",
    last_message_text: "写真を撮ることが好きです。",
    updated_at: "2026-08-13T09:00:00Z",
  },
  {
    conversation_id: MOCK_FAMILY_CONVERSATION_ID,
    topic: "Gia đình",
    difficulty: "N4",
    scenario: null,
    status: "active",
    last_message_text: "家族は四人です。",
    updated_at: "2026-08-12T11:25:00Z",
  },
  {
    conversation_id: MOCK_APARTMENT_CONVERSATION_ID,
    topic: "Tìm căn hộ",
    difficulty: "N3",
    scenario: null,
    status: "active",
    last_message_text: "駅から近い部屋がいいです。",
    updated_at: "2026-08-11T05:40:00Z",
  },
  {
    conversation_id: MOCK_DIRECTIONS_CONVERSATION_ID,
    topic: "Hỏi đường",
    difficulty: "N4",
    scenario: null,
    status: "active",
    last_message_text: "駅までどう行けばいいですか？",
    updated_at: "2026-08-10T03:15:00Z",
  },
  {
    conversation_id: MOCK_HEALTH_CONVERSATION_ID,
    topic: "Sức khỏe",
    difficulty: "N3",
    scenario: null,
    status: "active",
    last_message_text: "少し頭が痛いです。",
    updated_at: "2026-08-09T13:50:00Z",
  },
  {
    conversation_id: MOCK_STUDY_CONVERSATION_ID,
    topic: "Phương pháp học tập",
    difficulty: "N2",
    scenario: null,
    status: "active",
    last_message_text: "毎日日本語を勉強しています。",
    updated_at: "2026-08-08T08:05:00Z",
  },
  {
    conversation_id: MOCK_AIRPORT_CONVERSATION_ID,
    topic: "Làm thủ tục sân bay",
    difficulty: "N3",
    scenario: null,
    status: "active",
    last_message_text: "チェックインをお願いします。",
    updated_at: "2026-08-07T02:35:00Z",
  },
  {
    conversation_id: MOCK_JOB_INTERVIEW_CONVERSATION_ID,
    topic: "Phỏng vấn xin việc",
    difficulty: "N2",
    scenario: null,
    status: "active",
    last_message_text: "自己紹介をお願いします。",
    updated_at: "2026-08-06T14:10:00Z",
  },
  {
    conversation_id: MOCK_DOCTOR_CONVERSATION_ID,
    topic: "Hẹn gặp bác sĩ",
    difficulty: "N3",
    scenario: null,
    status: "active",
    last_message_text: "予約を取りたいです。",
    updated_at: "2026-08-05T07:45:00Z",
  },
  {
    conversation_id: MOCK_MUSEUM_CONVERSATION_ID,
    topic: "Tham quan bảo tàng",
    difficulty: "N4",
    scenario: null,
    status: "active",
    last_message_text: "この展示はいつからですか？",
    updated_at: "2026-08-04T05:20:00Z",
  },
  {
    conversation_id: MOCK_HOLIDAY_CONVERSATION_ID,
    topic: "Kể về ngày nghỉ",
    difficulty: "N5",
    scenario: null,
    status: "active",
    last_message_text: "昨日は家でゆっくりしました。",
    updated_at: "2026-08-03T10:55:00Z",
  },
] satisfies TutorConversationListItem[];

export const MOCK_TUTOR_CONVERSATIONS = {
  items: MOCK_TUTOR_HISTORY_ITEMS.slice(0, 16),
  page: 1,
  page_size: 16,
  total_items: MOCK_TUTOR_HISTORY_ITEMS.length,
  total_pages: Math.ceil(MOCK_TUTOR_HISTORY_ITEMS.length / 16),
} satisfies TutorConversationListResponse;

export const MOCK_TUTOR_DETAILS: Record<string, TutorConversationDetailResponse> = {
  [MOCK_TRAVEL_CONVERSATION_ID]: {
    conversation_id: MOCK_TRAVEL_CONVERSATION_ID,
    topic: "Du lịch Nhật Bản",
    difficulty: "N3",
    scenario: "Hỏi một người bạn về kế hoạch đi Kyoto.",
    status: "active",
    started_at: "2026-08-20T09:20:00Z",
    ended_at: null,
    messages: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        sender: "ai",
        sequence_number: 1,
        text: "こんにちは！京都について話しましょう。どこに行きたいですか？",
        text_vi: "Xin chào! Hãy cùng nói về Kyoto nhé. Bạn muốn đi đâu?",
        client_message_id: null,
        created_at: "2026-08-20T09:20:01Z",
        feedback: {
          grammar_correction: null,
          natural_expression_tip: null,
          answer_hints: [
            {
              text: "京都に行きたいです。",
              meaning_vi: "Tôi muốn đi Kyoto.",
            },
          ],
        },
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        sender: "user",
        sequence_number: 2,
        text: "京都で清水寺を見たいです。",
        text_vi: "Tôi muốn tham quan chùa Kiyomizu-dera ở Kyoto.",
        client_message_id: "55555555-5555-4555-8555-555555555555",
        created_at: "2026-08-20T09:21:12Z",
        feedback: null,
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        sender: "ai",
        sequence_number: 3,
        text: "いいですね！清水寺はとても有名です。",
        text_vi: "Hay đấy! Chùa Kiyomizu-dera rất nổi tiếng.",
        client_message_id: null,
        created_at: "2026-08-20T09:21:14Z",
        feedback: {
          grammar_correction:
            "「京都で清水寺を見たいです」は自然な文です。「見たい」は muốn xem, còn khi nói về một địa điểm nên dùng 「行きたい」 để diễn đạt muốn đến đó tự nhiên hơn.",
          natural_expression_tip:
            "「清水寺に行ってみたいです」 sẽ tự nhiên hơn khi nói rằng bạn muốn thử đến chùa Kiyomizu-dera.",
          answer_hints: [],
        },
      },
      {
        id: "77777777-7777-4777-8777-777777777777",
        sender: "user",
        sequence_number: 4,
        text: "そして、抹茶を飲みたいです。",
        text_vi: "Và tôi muốn uống matcha.",
        client_message_id: "88888888-8888-4888-8888-888888888888",
        created_at: "2026-08-20T09:22:03Z",
        feedback: null,
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        sender: "ai",
        sequence_number: 5,
        text: "抹茶もいいですね。京都で何をしたいですか？",
        text_vi: "Matcha cũng rất tuyệt. Bạn còn muốn làm gì ở Kyoto nữa?",
        client_message_id: null,
        created_at: "2026-08-20T09:22:05Z",
        feedback: {
          grammar_correction: null,
          natural_expression_tip:
            "「抹茶を飲みたいです」 là cách nói tự nhiên. Bạn cũng có thể nói 「抹茶を味わいたいです」 nếu muốn nhấn mạnh trải nghiệm thưởng thức.",
          answer_hints: [
            {
              text: "神社を見学したいです。",
              meaning_vi: "Tôi muốn tham quan các đền thờ.",
            },
            {
              text: "京都の町を歩きたいです。",
              meaning_vi: "Tôi muốn đi bộ quanh phố Kyoto.",
            },
          ],
        },
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sender: "ai",
        sequence_number: 6,
        text: "ゆっくり話して大丈夫ですよ。",
        text_vi: "Bạn cứ nói từ từ cũng được nhé.",
        client_message_id: null,
        created_at: "2026-08-20T09:22:10Z",
        feedback: null,
      },
    ],
  },
  [MOCK_OFFICE_CONVERSATION_ID]: {
    conversation_id: MOCK_OFFICE_CONVERSATION_ID,
    topic: "Chào hỏi công sở",
    difficulty: "N5",
    scenario: null,
    status: "active",
    started_at: "2026-08-19T08:10:00Z",
    ended_at: null,
    messages: [],
  },
};
