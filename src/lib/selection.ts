import {
  PURPOSE_RULES,
  WEEKEND_BONUS,
  ZODIAC_CLASH_PENALTY,
} from "./rules";
import { getAlmanacDay, getBirthProfileSummary, getDateRange, getZodiacFromBirthInput } from "./calendar";
import { applyDemolitionHardAvoidance, applyUniversalDailyJudgments, applyUniversalHostTrinityControl, getGeneralRecommendedHours, scoreConstructionDay, scoreDemolitionDay, scoreEnshrinementDay, scoreMovingDay, scoreWeddingDay } from "./movingRules";
import type { AlmanacDay, DateInput, RecommendationResult, ScoreBreakdownItem, ScoredDay } from "./types";

const MAX_RESULTS = 6;
const MIN_RESULTS = 3;

export function selectAuspiciousDays(input: DateInput): RecommendationResult {
  const rule = PURPOSE_RULES[input.purpose];
  const inputZodiac = getZodiacFromBirthInput(input);
  const birthProfile = getBirthProfileSummary(input);
  const groomBirthProfile = input.purpose === "wedding"
    ? getBirthProfileSummary({
        ...input,
        birthCalendar: input.groomBirthCalendar,
        birthDate: input.groomBirthDate,
        birthClockTime: input.groomBirthClockTime,
        birthPlace: input.groomBirthPlace,
        birthLongitude: input.groomBirthLongitude,
        birthTimeBranch: input.groomBirthTimeBranch,
      })
    : undefined;
  const days = getDateRange(input.startDate, input.endDate);
  const scoredDays = days.map((date) => scoreCandidateDay(getAlmanacDay(date), input, inputZodiac));
  const eligible = scoredDays
    .filter((day) => !day.eliminated)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  const recommendations = eligible.slice(0, MAX_RESULTS);
  const nearMisses = scoredDays
    .filter((day) => day.eliminated)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 3);
  const shortageReason =
    recommendations.length < MIN_RESULTS
      ? `当前时间范围内选不出3个符合「${rule.label}」的候选日期。如需更多候选日期，可延长日期范围重新筛选；也可查看下方评分最高但不合适的日期，逐项核对不合适原因。`
      : "";

  return {
    inputZodiac,
    birthProfile,
    groomBirthProfile,
    recommendations,
    allDays: scoredDays.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)),
    nearMisses,
    consideredCount: days.length,
    eliminatedCount: scoredDays.filter((day) => day.eliminated).length,
    shortageReason,
  };
}

export function evaluateCandidateDay(input: DateInput, date: string): ScoredDay {
  return scoreCandidateDay(getAlmanacDay(new Date(`${date}T00:00:00`)), input, getZodiacFromBirthInput(input));
}

function scoreCandidateDay(almanacDay: AlmanacDay, input: DateInput, inputZodiac: string): ScoredDay {
  let scoredDay: ScoredDay;
  if (input.purpose === "wedding") {
    scoredDay = scoreWeddingDay(almanacDay, input);
  } else if (input.purpose === "moving") {
    scoredDay = scoreMovingDay(almanacDay, input);
  } else if (input.purpose === "demolition") {
    scoredDay = scoreDemolitionDay(almanacDay, input);
    const normalized = normalizeScoredDay(applyDemolitionHardAvoidance(scoredDay, input));
    return normalized.eliminated ? normalized : { ...normalized, score: Math.min(100, normalized.score) };
  } else if (input.purpose === "enshrinement") {
    scoredDay = scoreEnshrinementDay(almanacDay, input);
  } else if (input.purpose === "construction") {
    scoredDay = scoreConstructionDay(almanacDay, input);
    return normalizeScoredDay(localizeHouseholdWording(applyUniversalDailyJudgments(scoredDay, input), input.purpose));
  } else {
    scoredDay = scoreDay(almanacDay, inputZodiac, input.purpose, input);
  }

  const normalized = normalizeScoredDay(localizeHouseholdWording(
    applyUniversalDailyJudgments(applyUniversalHostTrinityControl(scoredDay, input), input, input.purpose !== "wedding"),
    input.purpose
  ));
  return normalized;
}

function localizeHouseholdWording(day: ScoredDay, purpose: DateInput["purpose"]): ScoredDay {
  if (purpose !== "moving" && purpose !== "construction") {
    return day;
  }

  const replacePrimaryLabel = (text: string) => text.replace(/客户/g, "家主");
  return {
    ...day,
    reasons: day.reasons.map(replacePrimaryLabel),
    cautions: day.cautions.map(replacePrimaryLabel),
    remedies: day.remedies.map(replacePrimaryLabel),
    scoreBreakdown: day.scoreBreakdown.map((item) => ({
      ...item,
      detail: replacePrimaryLabel(item.detail),
    })),
  };
}

function normalizeScoredDay(day: ScoredDay): ScoredDay {
  return {
    ...day,
    reasons: [...new Set(day.reasons)],
    cautions: [...new Set(day.cautions)],
    remedies: [...new Set(day.remedies)],
  };
}

function scoreDay(
  day: Omit<ScoredDay, "score" | "reasons" | "cautions" | "scoreBreakdown" | "recommendedHours" | "remedies" | "eliminated">,
  inputZodiac: string,
  purpose: DateInput["purpose"],
  input: DateInput
): ScoredDay {
  const rule = PURPOSE_RULES[purpose];
  let score = rule.baseScore;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      label: "基础分",
      points: rule.baseScore,
      type: "base",
      detail: `${rule.label}默认起评分`,
    },
  ];
  let eliminated = false;

  if (inputZodiac && day.dayChongZodiac === inputZodiac) {
    const points = -ZODIAC_CLASH_PENALTY;
    score += points;
    cautions.push(`本日冲${inputZodiac}，择日六冲规则将按强避处理`);
    scoreBreakdown.push({
      label: "生肖避冲",
      points,
      type: "penalty",
      detail: `本日冲${inputZodiac}；后续择日六冲规则会强避淘汰`,
    });
  } else {
    scoreBreakdown.push({
      label: "生肖避冲",
      points: 0,
      type: "info",
      detail: inputZodiac ? `本日冲${day.dayChongZodiac || "未知"}，未冲本人生肖${inputZodiac}` : "生日生肖未识别",
    });
  }

  if (day.weekday === "周六" || day.weekday === "周日") {
    score += WEEKEND_BONUS;
    reasons.push("周末便于安排，少量加分");
    scoreBreakdown.push({
      label: "周末便利",
      points: WEEKEND_BONUS,
      type: "bonus",
      detail: `${day.weekday}便于安排`,
    });
  }

  if (reasons.length === 0) {
    reasons.push("本日未见明显忌用项，可作为备选再复核");
  }

  return {
    ...day,
    score,
    reasons,
    cautions,
    scoreBreakdown,
    recommendedHours: getGeneralRecommendedHours(day, input),
    remedies: [],
    eliminated,
  };
}
