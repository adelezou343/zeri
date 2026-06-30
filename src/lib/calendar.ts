import { Lunar, Solar } from "lunar-javascript";
import type { AlmanacDay, DateInput, TimeBranch } from "./types";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const CHINA_STANDARD_MERIDIAN = 120;
const CITY_LONGITUDES: Record<string, number> = {
  北京: 116.4074,
  上海: 121.4737,
  天津: 117.2000,
  重庆: 106.5516,
  广州: 113.2644,
  深圳: 114.0579,
  成都: 104.0665,
  杭州: 120.1551,
  南京: 118.7969,
  武汉: 114.3055,
  西安: 108.9398,
  郑州: 113.6254,
  长沙: 112.9388,
  昆明: 102.8329,
  福州: 119.2965,
  厦门: 118.0894,
  南昌: 115.8582,
  合肥: 117.2272,
  济南: 117.1201,
  青岛: 120.3826,
  太原: 112.5489,
  石家庄: 114.5149,
  沈阳: 123.4315,
  大连: 121.6147,
  长春: 125.3235,
  哈尔滨: 126.5349,
  呼和浩特: 111.7492,
  银川: 106.2309,
  兰州: 103.8343,
  西宁: 101.7782,
  乌鲁木齐: 87.6168,
  拉萨: 91.1172,
  南宁: 108.3669,
  海口: 110.1983,
  贵阳: 106.6302,
  香港: 114.1694,
  澳门: 113.5439,
  台北: 121.5654,
};

type LunarLike = {
  getYearInGanZhi?: () => string;
  getMonthInGanZhi?: () => string;
  getDayInGanZhi?: () => string;
  getYearShengXiao?: () => string;
  getMonthInChinese?: () => string;
  getDayInChinese?: () => string;
  getMonth?: () => number;
  getDay?: () => number;
  getJieQi?: () => string;
  getDayYi?: () => string[];
  getDayJi?: () => string[];
  getDayJiShen?: () => string[];
  getDayXiongSha?: () => string[];
  getDayChongShengXiao?: () => string;
  getDayTianShen?: () => string;
  getDayTianShenLuck?: () => string;
  getDayTianShenType?: () => string;
  getSolar?: () => { toYmd?: () => string };
  getTimeInGanZhi?: () => string;
  getXiu?: () => string;
  getShou?: () => string;
  getXiuLuck?: () => string;
  getZhiXing?: () => string;
};

const BRANCH_HOURS: Record<Exclude<TimeBranch, "">, number> = {
  子: 0,
  丑: 2,
  寅: 4,
  卯: 6,
  辰: 8,
  巳: 10,
  午: 12,
  未: 14,
  申: 16,
  酉: 18,
  戌: 20,
  亥: 22,
};

export function getDateRange(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const dates: Date[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return dates;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getBirthSolarDate(input: Pick<DateInput, "birthCalendar" | "birthDate">) {
  if (input.birthCalendar === "solar") {
    return parseLocalDate(input.birthDate);
  }

  const [year, month, day] = input.birthDate.split("-").map(Number);
  const solarYmd = ((Lunar.fromYmd(year, month, day) as LunarLike).getSolar?.()?.toYmd?.() ?? "");
  return parseLocalDate(solarYmd);
}

export function getZodiacFromBirthInput(input: Pick<DateInput, "birthCalendar" | "birthDate">) {
  const date = getBirthSolarDate(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const lunar = Lunar.fromDate(date) as LunarLike;
  return lunar.getYearShengXiao?.() ?? ZODIACS[(date.getFullYear() - 4) % 12];
}

export function getBirthProfileSummary(input: DateInput) {
  const solarDate = getBirthSolarDate(input);
  const lunar = Lunar.fromDate(solarDate) as LunarLike;
  const trueSolarTime = getTrueSolarTimeSummary(input, solarDate);
  const birthHour = getBirthHourForBaZi(input, trueSolarTime.date);
  const rawTimeGanZhi = birthHour !== null
    ? ((Solar.fromYmdHms(
        trueSolarTime.date?.getFullYear() ?? solarDate.getFullYear(),
        (trueSolarTime.date?.getMonth() ?? solarDate.getMonth()) + 1,
        trueSolarTime.date?.getDate() ?? solarDate.getDate(),
        birthHour,
        0,
        0
      ).getLunar() as LunarLike).getTimeInGanZhi?.() ?? `${getBranchFromHour(birthHour)}时`)
    : "时柱未填";
  const timeGanZhi = rawTimeGanZhi === "时柱未填" || rawTimeGanZhi.endsWith("时") ? rawTimeGanZhi : `${rawTimeGanZhi}时`;

  return {
    solarDate: formatDate(solarDate),
    lunarText: `${lunar.getYearInGanZhi?.() ?? ""}年 农历${lunar.getMonthInChinese?.() ?? ""}月${lunar.getDayInChinese?.() ?? ""}`,
    baZiText: `${lunar.getYearInGanZhi?.() ?? ""}年 ${lunar.getMonthInGanZhi?.() ?? ""}月 ${lunar.getDayInGanZhi?.() ?? ""}日 ${timeGanZhi}`,
    trueSolarTimeText: trueSolarTime.text,
    trueSolarTimeStatus: trueSolarTime.status,
  };
}

function getBirthHourForBaZi(input: DateInput, trueSolarDate: Date | null) {
  if (trueSolarDate) {
    return trueSolarDate.getHours();
  }
  if (input.birthTimeBranch) {
    return BRANCH_HOURS[input.birthTimeBranch];
  }
  return null;
}

function getTrueSolarTimeSummary(input: DateInput, solarDate: Date) {
  if (!input.birthClockTime) {
    if (!input.birthPlace.trim() && !input.birthLongitude.trim()) {
      return {
        date: null,
        text: "未填写出生具体地点，已略过真太阳时",
        status: "如需真太阳时，请填写出生地或经度，并填写出生具体时间",
      };
    }
    return {
      date: null,
      text: "未填写出生具体时间，已略过真太阳时",
      status: "已填写出生地时，还需填写出生具体时间才能计算",
    };
  }

  const clockParts = input.birthClockTime.split(":").map(Number);
  if (clockParts.length < 2 || clockParts.some((part) => Number.isNaN(part))) {
    return {
      date: null,
      text: "出生时间格式有误，已略过真太阳时",
      status: "未计算",
    };
  }

  const longitude = resolveLongitude(input.birthPlace, input.birthLongitude);
  if (longitude === null) {
    const beijingDate = new Date(solarDate);
    beijingDate.setHours(clockParts[0], clockParts[1], 0, 0);
    return {
      date: beijingDate,
      text: `${formatDate(beijingDate)} ${formatClock(beijingDate)}（北京时间，未做经度校正）`,
      status: input.birthPlace.trim() || input.birthLongitude.trim()
        ? "出生地或经度未识别，已默认按北京时间取时柱"
        : "未填写出生地和经度，已默认按北京时间取时柱",
    };
  }

  const localMeanOffset = (longitude - CHINA_STANDARD_MERIDIAN) * 4;
  const equationOffset = getEquationOfTimeMinutes(solarDate);
  const totalOffset = localMeanOffset + equationOffset;
  const trueSolarDate = new Date(solarDate);
  trueSolarDate.setHours(clockParts[0], clockParts[1], 0, 0);
  trueSolarDate.setMinutes(trueSolarDate.getMinutes() + totalOffset);

  return {
    date: trueSolarDate,
    text: `${formatDate(trueSolarDate)} ${formatClock(trueSolarDate)}（经度${longitude.toFixed(4)}E，校正${formatSignedMinutes(totalOffset)}）`,
    status: `已按出生地${input.birthPlace || "手填经度"}计算`,
  };
}

function resolveLongitude(place: string, longitudeText: string) {
  const manualLongitude = Number(longitudeText);
  if (!Number.isNaN(manualLongitude) && manualLongitude >= 70 && manualLongitude <= 140) {
    return manualLongitude;
  }

  const normalizedPlace = place.trim();
  if (!normalizedPlace) {
    return null;
  }
  const numericInPlace = normalizedPlace.match(/(7\d|8\d|9\d|1[0-3]\d)(\.\d+)?/);
  if (numericInPlace) {
    return Number(numericInPlace[0]);
  }

  const city = Object.keys(CITY_LONGITUDES).find((name) => normalizedPlace.includes(name));
  return city ? CITY_LONGITUDES[city] : null;
}

function getEquationOfTimeMinutes(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const b = ((360 / 365) * (dayOfYear - 81) * Math.PI) / 180;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function formatClock(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSignedMinutes(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  return `${sign}${Math.abs(minutes).toFixed(1)}分钟`;
}

function getBranchFromHour(hour: number) {
  if (hour === 23 || hour === 0) {
    return "子";
  }
  const index = Math.floor((hour + 1) / 2) % 12;
  return BRANCHES[index];
}

export function getAlmanacDay(date: Date): AlmanacDay {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar() as LunarLike;
  const lunarMonth = lunar.getMonthInChinese?.() ?? "";
  const lunarDay = lunar.getDayInChinese?.() ?? "";
  const solarTerm = lunar.getJieQi?.() ?? "";
  const yearGanZhi = lunar.getYearInGanZhi?.() ?? "";
  const monthGanZhi = lunar.getMonthInGanZhi?.() ?? "";
  const dayGanZhi = lunar.getDayInGanZhi?.() ?? "";

  return {
    date: formatDate(date),
    weekday: WEEKDAYS[date.getDay()],
    lunarText: `${lunarMonth}月${lunarDay}`,
    lunarMonth: Math.abs(lunar.getMonth?.() ?? 0),
    lunarDay: lunar.getDay?.() ?? 0,
    yearGan: extractStem(yearGanZhi),
    yearZhi: extractBranch(yearGanZhi),
    monthGan: extractStem(monthGanZhi),
    monthZhi: extractBranch(monthGanZhi),
    dayGan: extractStem(dayGanZhi),
    dayZhi: extractBranch(dayGanZhi),
    dayGanZhi,
    monthGanZhi,
    yearGanZhi,
    xiu: lunar.getXiu?.() ?? "",
    xiuAnimal: lunar.getShou?.() ?? "",
    xiuLuck: lunar.getXiuLuck?.() ?? "",
    zhiXing: lunar.getZhiXing?.() ?? "",
    yearZodiac: lunar.getYearShengXiao?.() ?? "",
    dayChongZodiac: lunar.getDayChongShengXiao?.() ?? "",
    solarTerm,
    yi: lunar.getDayYi?.() ?? [],
    ji: lunar.getDayJi?.() ?? [],
    dayJiShen: lunar.getDayJiShen?.() ?? [],
    dayXiongSha: lunar.getDayXiongSha?.() ?? [],
    dayTianShen: lunar.getDayTianShen?.() ?? "",
    dayTianShenType: lunar.getDayTianShenType?.() ?? "",
    dayTianShenLuck: lunar.getDayTianShenLuck?.() ?? "",
  };
}

function extractStem(ganZhi: string) {
  return STEMS.find((stem) => ganZhi.includes(stem)) ?? "";
}

function extractBranch(ganZhi: string) {
  return BRANCHES.find((branch) => ganZhi.includes(branch)) ?? "";
}
