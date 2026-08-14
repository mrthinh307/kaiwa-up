import "server-only";

import { getLearningContent, getLearningContentIds } from "@/lib/practice-catalog-mock";

import type {
  DictationAnswerInput,
  DictationAttemptResult,
  DictationExerciseType,
  DictationPracticeLesson,
} from "../_types/dictation-practice";

type DictationAnswerKey = {
  acceptedAnswers?: string[];
  correctAnswer: string;
};

type DictationPracticeScript = {
  answers: DictationAnswerKey[];
  exerciseType: DictationExerciseType;
  instruction: string;
  template: string;
  translation: string;
};

const DICTATION_PRACTICE_SCRIPTS: Record<string, DictationPracticeScript> = {
  "770e8400-e29b-41d4-a716-446655440111": {
    answers: [
      {
        acceptedAnswers: ["いいてんき"],
        correctAnswer: "いい天気",
      },
      {
        acceptedAnswers: ["あめがふる"],
        correctAnswer: "雨が降る",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Listen to the short exchange and complete the two missing phrases.",
    template: "店員：今日は{{1}}ですね。\n客：そうですね。午後から{{2}}そうですよ。",
    translation:
      "Clerk: Nice weather today, isn't it? Customer: It is. I heard it will rain this afternoon.",
  },
  "770e8400-e29b-41d4-a716-446655440112": {
    answers: [
      {
        correctAnswer: "マリア",
      },
      {
        correctAnswer: "スペイン",
      },
      {
        acceptedAnswers: ["にほんご"],
        correctAnswer: "日本語",
      },
    ],
    exerciseType: "one_word",
    instruction: "Catch the three key nouns in this classroom introduction.",
    template: "はじめまして。私は{{1}}です。{{2}}から来ました。今、{{3}}を勉強しています。",
    translation: "Nice to meet you. I am Maria. I came from Spain. I am studying Japanese now.",
  },
  "770e8400-e29b-41d4-a716-446655440113": {
    answers: [
      {
        acceptedAnswers: ["ひがわりらんちをひとつ"],
        correctAnswer: "日替わりランチを一つ",
      },
      {
        correctAnswer: "アイスコーヒー",
      },
      {
        acceptedAnswers: ["おねがいします"],
        correctAnswer: "お願いします",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Complete the customer's order with the phrases you hear.",
    template: "客：{{1}}。それから、{{2}}も{{3}}。",
    translation: "Customer: One daily lunch special. And an iced coffee too, please.",
  },
  "770e8400-e29b-41d4-a716-446655440114": {
    answers: [
      {
        acceptedAnswers: ["きょうとゆきのでんしゃはさんばんほーむからでます"],
        correctAnswer: "京都行きの電車は三番ホームから出ます",
      },
    ],
    exerciseType: "full_sentence",
    instruction: "Write the station attendant's complete sentence.",
    template: "旅行者：京都行きはどこですか。\n駅員：{{1}}。",
    translation:
      "Traveler: Where is the train for Kyoto? Station attendant: The Kyoto-bound train departs from platform three.",
  },
  "770e8400-e29b-41d4-a716-446655440115": {
    answers: [
      {
        acceptedAnswers: ["こんどのどようび"],
        correctAnswer: "今度の土曜日",
      },
      {
        acceptedAnswers: ["えいがをみにいきませんか"],
        correctAnswer: "映画を見に行きませんか",
      },
      {
        acceptedAnswers: ["ごごなら"],
        correctAnswer: "午後なら",
      },
      {
        acceptedAnswers: ["だいじょうぶです"],
        correctAnswer: "大丈夫です",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Listen for the proposed plan and the response to it.",
    template: "A：{{1}}、{{2}}。\nB：いいですね。{{3}}、{{4}}。",
    translation:
      "A: Would you like to go see a movie this Saturday? B: Sounds good. The afternoon works for me.",
  },
  "770e8400-e29b-41d4-a716-446655440116": {
    answers: [
      {
        acceptedAnswers: ["みぎ"],
        correctAnswer: "右",
      },
      {
        acceptedAnswers: ["しんごう"],
        correctAnswer: "信号",
      },
      {
        acceptedAnswers: ["ひだり"],
        correctAnswer: "左",
      },
      {
        acceptedAnswers: ["ぎんこう"],
        correctAnswer: "銀行",
      },
    ],
    exerciseType: "one_word",
    instruction: "Fill in the direction words and landmarks.",
    template:
      "この道を{{1}}に曲がって、二つ目の{{2}}まで進んでください。そこで{{3}}に曲がると、{{4}}の隣です。",
    translation:
      "Turn right on this road and continue to the second traffic light. Turn left there; it is next to the bank.",
  },
  "770e8400-e29b-41d4-a716-446655440117": {
    answers: [
      {
        acceptedAnswers: ["さーばーのちょうしがわるくて"],
        correctAnswer: "サーバーの調子が悪くて",
      },
      {
        acceptedAnswers: ["でーたをひらくことができません"],
        correctAnswer: "データを開くことができません",
      },
      {
        acceptedAnswers: ["さいきどうしてみましたが"],
        correctAnswer: "再起動してみましたが",
      },
      {
        acceptedAnswers: ["まだなおっていません"],
        correctAnswer: "まだ直っていません",
      },
      {
        acceptedAnswers: ["かくにんしていただけますか"],
        correctAnswer: "確認していただけますか",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Complete the workplace report with the problem, attempted fix, and request.",
    template: "{{1}}、{{2}}。{{3}}、{{4}}。お手数ですが、{{5}}。",
    translation:
      "The server is not working properly, so I cannot open the data. I tried restarting it, but it is still not fixed. Could you please check it?",
  },
  "770e8400-e29b-41d4-a716-446655440118": {
    answers: [
      {
        acceptedAnswers: ["せんしゅうまつにともだちとかなざわへいってきました"],
        correctAnswer: "先週末に友達と金沢へ行ってきました",
      },
      {
        acceptedAnswers: ["あめはふりましたがまちのふんいきがとてもすてきでした"],
        correctAnswer: "雨は降りましたが、町の雰囲気がとても素敵でした",
      },
    ],
    exerciseType: "full_sentence",
    instruction: "Write the two complete sentences from the travel story.",
    template: "{{1}}。\n{{2}}。",
    translation:
      "I went to Kanazawa with a friend last weekend. It rained, but the atmosphere of the town was wonderful.",
  },
  "770e8400-e29b-41d4-a716-446655440119": {
    answers: [
      {
        acceptedAnswers: ["しずか"],
        correctAnswer: "静か",
      },
      {
        acceptedAnswers: ["こうえん"],
        correctAnswer: "公園",
      },
      {
        acceptedAnswers: ["べんり"],
        correctAnswer: "便利",
      },
      {
        acceptedAnswers: ["えき"],
        correctAnswer: "駅",
      },
      {
        acceptedAnswers: ["やちん"],
        correctAnswer: "家賃",
      },
      {
        acceptedAnswers: ["たかい"],
        correctAnswer: "高い",
      },
    ],
    exerciseType: "one_word",
    instruction: "Catch the six key words used to compare the neighborhoods.",
    template:
      "こちらは{{1}}で、近くに大きな{{2}}があります。あちらはもっと{{3}}で、{{4}}にも近いですが、{{5}}が少し{{6}}です。",
    translation:
      "This area is quiet and has a large park nearby. The other area is more convenient and closer to the station, but the rent is a little higher.",
  },
  "770e8400-e29b-41d4-a716-446655440120": {
    answers: [
      {
        acceptedAnswers: ["ごふべんをおかけし"],
        correctAnswer: "ご不便をおかけし",
      },
      {
        acceptedAnswers: ["まことにもうしわけございません"],
        correctAnswer: "誠に申し訳ございません",
      },
      {
        acceptedAnswers: ["じょうきょうをかくにんしたうえで"],
        correctAnswer: "状況を確認した上で",
      },
      {
        acceptedAnswers: ["あらためてごれんらくいたします"],
        correctAnswer: "改めてご連絡いたします",
      },
      {
        acceptedAnswers: ["しょうしょうおまちいただけますでしょうか"],
        correctAnswer: "少々お待ちいただけますでしょうか",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Complete the formal response to a customer complaint.",
    template: "{{1}}、{{2}}。{{3}}、{{4}}ので、{{5}}。",
    translation:
      "We sincerely apologize for the inconvenience. We will confirm the situation and contact you again, so could you please wait a moment?",
  },
  "770e8400-e29b-41d4-a716-446655440121": {
    answers: [
      {
        acceptedAnswers: [
          "こんかいのかいぎではしんしょうひんのはつばいじきについていけんをこうかんしました",
        ],
        correctAnswer: "今回の会議では、新商品の発売時期について意見を交換しました",
      },
      {
        acceptedAnswers: ["けつろんとしてじゅんびきかんをいっかげつのばすことになりました"],
        correctAnswer: "結論として、準備期間を一か月延ばすことになりました",
      },
    ],
    exerciseType: "full_sentence",
    instruction: "Write the meeting summary as two complete sentences.",
    template: "{{1}}。\n{{2}}。",
    translation:
      "At this meeting, we exchanged opinions about the launch timing of the new product. We concluded that the preparation period would be extended by one month.",
  },
  "770e8400-e29b-41d4-a716-446655440122": {
    answers: [
      {
        acceptedAnswers: ["ごぜん"],
        correctAnswer: "午前",
      },
      {
        acceptedAnswers: ["じゅうじ"],
        correctAnswer: "十時",
      },
      {
        acceptedAnswers: ["てんけん"],
        correctAnswer: "点検",
      },
      {
        acceptedAnswers: ["えれべーたー"],
        correctAnswer: "エレベーター",
      },
      {
        acceptedAnswers: ["さんじゅっぷん"],
        correctAnswer: "三十分",
      },
      {
        acceptedAnswers: ["かいだん"],
        correctAnswer: "階段",
      },
      {
        acceptedAnswers: ["ごりよう"],
        correctAnswer: "ご利用",
      },
    ],
    exerciseType: "one_word",
    instruction: "Fill in the key details from the public service announcement.",
    template:
      "本日{{1}}{{2}}より、設備{{3}}のため{{4}}を約{{5}}停止します。{{6}}の{{7}}をお願いいたします。",
    translation:
      "Today from 10 a.m., the elevator will stop for about 30 minutes for equipment inspection. Please use the stairs.",
  },
  "770e8400-e29b-41d4-a716-446655440123": {
    answers: [
      {
        acceptedAnswers: [
          "ざいたくきんむはつうきんじかんをへらしせいさんせいをたかめるかのうせいがあります",
        ],
        correctAnswer: "在宅勤務は通勤時間を減らし、生産性を高める可能性があります",
      },
      {
        acceptedAnswers: [
          "いっぽうでじょうほうきょうゆうやちーむないのしんらいこうちくがむずかしくなるというしてきもあります",
        ],
        correctAnswer: "一方で、情報共有やチーム内の信頼構築が難しくなるという指摘もあります",
      },
      {
        acceptedAnswers: [
          "じゅうようなのはぎょうむのせいしつにおうじてはたらきかたをせんたくすることです",
        ],
        correctAnswer: "重要なのは、業務の性質に応じて働き方を選択することです",
      },
    ],
    exerciseType: "full_sentence",
    instruction: "Reconstruct the three sentences presenting both views and the conclusion.",
    template: "{{1}}。\n{{2}}。\n{{3}}。",
    translation:
      "Remote work may reduce commuting time and improve productivity. On the other hand, some point out that sharing information and building trust within teams becomes harder. What matters is choosing a work style according to the nature of the work.",
  },
  "770e8400-e29b-41d4-a716-446655440124": {
    answers: [
      {
        acceptedAnswers: ["せいふがはっぴょうした"],
        correctAnswer: "政府が発表した",
      },
      {
        acceptedAnswers: ["あらたなけいざいたいさく"],
        correctAnswer: "新たな経済対策",
      },
      {
        acceptedAnswers: ["ちゅうしょうきぎょうへのしえん"],
        correctAnswer: "中小企業への支援",
      },
      {
        acceptedAnswers: ["ぶっかじょうしょうへのたいおう"],
        correctAnswer: "物価上昇への対応",
      },
      {
        acceptedAnswers: ["じっこうせいをうたがうこえ"],
        correctAnswer: "実効性を疑う声",
      },
      {
        acceptedAnswers: ["ざいげんのかくほ"],
        correctAnswer: "財源の確保",
      },
      {
        acceptedAnswers: ["ちょうきてきなせいちょうせんりゃく"],
        correctAnswer: "長期的な成長戦略",
      },
      {
        acceptedAnswers: ["ぐたいてきなせつめい"],
        correctAnswer: "具体的な説明",
      },
    ],
    exerciseType: "multiple_words",
    instruction: "Complete the key phrases in this detailed news commentary.",
    template:
      "{{1}}{{2}}は、{{3}}と{{4}}を柱としています。一方、{{5}}もあり、{{6}}や{{7}}について、より{{8}}が求められています。",
    translation:
      "The new economic measures announced by the government center on support for small and medium-sized businesses and responses to rising prices. Meanwhile, some question their effectiveness, and more concrete explanations are being requested about funding and a long-term growth strategy.",
  },
  "770e8400-e29b-41d4-a716-446655440125": {
    answers: [
      {
        acceptedAnswers: [
          "ひっしゃはぎじゅつかくしんがしゃかいにもたらすえいきょうをたんじゅんなりべんせいのこうじょうとしてとらえるべきではないとろんじています",
        ],
        correctAnswer:
          "筆者は、技術革新が社会にもたらす影響を、単純な利便性の向上として捉えるべきではないと論じています",
      },
      {
        acceptedAnswers: [
          "むしろせいどやかちかんとのそうごさようをちょうきてきなしてんからけんとうするひつようがあります",
        ],
        correctAnswer: "むしろ、制度や価値観との相互作用を長期的な視点から検討する必要があります",
      },
      {
        acceptedAnswers: ["このかんてんをかくとぎろんはひょうめんてきなものにとどまるでしょう"],
        correctAnswer: "この観点を欠くと、議論は表面的なものにとどまるでしょう",
      },
    ],
    exerciseType: "full_sentence",
    instruction: "Reconstruct the argument's claim, supporting perspective, and conclusion.",
    template: "{{1}}。\n{{2}}。\n{{3}}。",
    translation:
      "The author argues that the impact of technological innovation on society should not be understood merely as improved convenience. Instead, its interaction with institutions and values must be examined from a long-term perspective. Without this perspective, the discussion will remain superficial.",
  },
};

function normalizeDictationAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ja")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[。、，,.！？!?]/g, "");
}

export function getDictationPracticeLesson(lessonId: string): DictationPracticeLesson | undefined {
  const content = getLearningContent(lessonId);
  const script = DICTATION_PRACTICE_SCRIPTS[lessonId];

  if (!content || !script) {
    return undefined;
  }

  const lessonIds = getLearningContentIds().filter((contentId) =>
    Object.hasOwn(DICTATION_PRACTICE_SCRIPTS, contentId),
  );
  const lessonIndex = lessonIds.indexOf(lessonId);
  const nextLessonId = lessonIndex >= 0 ? lessonIds.at(lessonIndex + 1) : undefined;

  return {
    audioDurationSeconds: content.audioDurationMs / 1000,
    blanks: script.answers.map((_, index) => ({
      blankIndex: index + 1,
    })),
    difficulty: content.difficulty,
    exerciseType: script.exerciseType,
    id: content.id,
    instruction: script.instruction,
    nextLessonId,
    promptParts: script.template.split(/\{\{\d+\}\}/g),
    title: content.title,
    topic: content.topic,
    youtubeVideoId: content.youtubeVideoId,
  };
}

export function gradeDictationAttempt(
  lessonId: string,
  answers: DictationAnswerInput[],
): DictationAttemptResult | undefined {
  const script = DICTATION_PRACTICE_SCRIPTS[lessonId];

  if (!script) {
    return undefined;
  }

  const answersByIndex = new Map(
    answers.map((answer) => [answer.blankIndex, answer.userAnswer] as const),
  );
  const results = script.answers.map((answer, index) => {
    const blankIndex = index + 1;
    const userAnswer = answersByIndex.get(blankIndex) ?? "";
    const acceptedAnswers = [answer.correctAnswer, ...(answer.acceptedAnswers ?? [])];
    const normalizedUserAnswer = normalizeDictationAnswer(userAnswer);

    return {
      blankIndex,
      correctAnswer: answer.correctAnswer,
      isCorrect: acceptedAnswers.some(
        (acceptedAnswer) => normalizeDictationAnswer(acceptedAnswer) === normalizedUserAnswer,
      ),
      userAnswer,
    };
  });
  const correctCount = results.filter((result) => result.isCorrect).length;
  const scorePercentage = Math.round((correctCount / results.length) * 100);
  const isPassed = scorePercentage >= 70;

  return {
    attemptId: crypto.randomUUID(),
    correctCount,
    expEarned: isPassed ? 10 : 0,
    isPassed,
    lessonId,
    results,
    scorePercentage,
    totalQuestions: results.length,
    translation: script.translation,
  };
}
