export type Purpose = "wedding" | "moving" | "demolition" | "construction" | "enshrinement" | "business" | "general";

export type TimeBranch =
  | ""
  | "子"
  | "丑"
  | "寅"
  | "卯"
  | "辰"
  | "巳"
  | "午"
  | "未"
  | "申"
  | "酉"
  | "戌"
  | "亥";

export type MountainBranch =
  | ""
  | "壬"
  | "子"
  | "癸"
  | "丑"
  | "艮"
  | "寅"
  | "甲"
  | "卯"
  | "乙"
  | "辰"
  | "巽"
  | "巳"
  | "丙"
  | "午"
  | "丁"
  | "未"
  | "坤"
  | "申"
  | "庚"
  | "酉"
  | "辛"
  | "戌"
  | "乾"
  | "亥";

export type DateInput = {
  birthCalendar: "solar" | "lunar";
  birthDate: string;
  birthClockTime: string;
  birthPlace: string;
  birthLongitude: string;
  birthTimeBranch: TimeBranch;
  brideBirthCalendar: "solar" | "lunar";
  brideBirthDate: string;
  brideBirthClockTime: string;
  brideBirthPlace: string;
  brideBirthLongitude: string;
  brideBirthTimeBranch: TimeBranch;
  groomBirthCalendar: "solar" | "lunar";
  groomBirthDate: string;
  groomBirthClockTime: string;
  groomBirthPlace: string;
  groomBirthLongitude: string;
  groomBirthTimeBranch: TimeBranch;
  weddingConsiderChildren: boolean;
  familyMembers: FamilyMember[];
  mountainBranch: MountainBranch;
  purpose: Purpose;
  startDate: string;
  endDate: string;
};

export type FamilyMember = {
  relation: "配偶" | "子女" | "父母" | "其他";
  name: string;
  birthCalendar: "solar" | "lunar";
  birthDate: string;
};

export type AlmanacDay = {
  date: string;
  weekday: string;
  lunarText: string;
  lunarMonth: number;
  lunarDay: number;
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  dayGanZhi: string;
  monthGanZhi: string;
  yearGanZhi: string;
  xiu: string;
  xiuAnimal: string;
  xiuLuck: string;
  zhiXing: string;
  yearZodiac: string;
  dayChongZodiac: string;
  solarTerm: string;
  yi: string[];
  ji: string[];
  dayJiShen: string[];
  dayXiongSha: string[];
  dayTianShen: string;
  dayTianShenType: string;
  dayTianShenLuck: string;
};

export type ScoredDay = AlmanacDay & {
  score: number;
  reasons: string[];
  cautions: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  recommendedHours: RecommendedHour[];
  remedies: string[];
  eliminated: boolean;
};

export type RecommendedHour = {
  branch: string;
  timeRange: string;
  relation: "阳贵" | "阴贵" | "六合" | "三合" | "抉山" | "禄时" | "夫星" | "子嗣" | "夫星/子嗣";
  detail: string;
  segments?: HourSegment[];
};

export type HourSegment = {
  name: "上刻" | "中刻" | "下刻";
  timeRange: string;
  spirits: string[];
  rating: "good" | "bad" | "neutral";
  detail: string;
};

export type BirthProfileSummary = {
  solarDate: string;
  lunarText: string;
  baZiText: string;
  trueSolarTimeText: string;
  trueSolarTimeStatus: string;
};

export type ScoreBreakdownItem = {
  label: string;
  points: number;
  type: "base" | "bonus" | "penalty" | "eliminate" | "info";
  detail: string;
};

export type RecommendationResult = {
  inputZodiac: string;
  birthProfile: BirthProfileSummary;
  groomBirthProfile?: BirthProfileSummary;
  recommendations: ScoredDay[];
  allDays: ScoredDay[];
  nearMisses: ScoredDay[];
  consideredCount: number;
  eliminatedCount: number;
  shortageReason: string;
};
