import { Solar } from "lunar-javascript";
import { addDays, getAlmanacDay, getBirthSolarDate, parseLocalDate } from "./calendar";
import type { AlmanacDay, DateInput, HourSegment, ScoreBreakdownItem, ScoredDay } from "./types";

const STEM_ELEMENTS: Record<string, string> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const BRANCH_ELEMENTS: Record<string, string> = {
  寅: "木",
  卯: "木",
  巳: "火",
  午: "火",
  申: "金",
  酉: "金",
  亥: "水",
  子: "水",
  辰: "土",
  戌: "土",
  丑: "土",
  未: "土",
};

const GENERATES: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const CONTROLS: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const SIX_CLASH: Record<string, string> = {
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
};

const SIX_HARMONY: Record<string, string> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  亥: "寅",
  卯: "戌",
  戌: "卯",
  辰: "酉",
  酉: "辰",
  巳: "申",
  申: "巳",
  午: "未",
  未: "午",
};

const HOUR_RANGES: Record<string, string> = {
  子: "23:00-01:00",
  丑: "01:00-03:00",
  寅: "03:00-05:00",
  卯: "05:00-07:00",
  辰: "07:00-09:00",
  巳: "09:00-11:00",
  午: "11:00-13:00",
  未: "13:00-15:00",
  申: "15:00-17:00",
  酉: "17:00-19:00",
  戌: "19:00-21:00",
  亥: "21:00-23:00",
};

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const CLEAR_DAYTIME_BRANCHES = new Set(["巳", "午", "未"]);
const CLEAR_NIGHTTIME_BRANCHES = new Set(["亥", "子", "丑"]);
const NOBLE_HOUR_TABLE: Record<string, Record<string, { yang: string; yin: string }>> = {
  雨水: {
    甲: { yang: "卯", yin: "酉" }, 乙: { yang: "寅", yin: "戌" }, 丙: { yang: "丑", yin: "亥" }, 丁: { yang: "亥", yin: "丑" }, 戊: { yang: "酉", yin: "卯" },
    己: { yang: "戌", yin: "寅" }, 庚: { yang: "酉", yin: "卯" }, 辛: { yang: "申", yin: "辰" }, 壬: { yang: "未", yin: "巳" }, 癸: { yang: "巳", yin: "未" },
  },
  春分: {
    甲: { yang: "寅", yin: "申" }, 乙: { yang: "丑", yin: "酉" }, 丙: { yang: "子", yin: "戌" }, 丁: { yang: "戌", yin: "子" }, 戊: { yang: "申", yin: "寅" },
    己: { yang: "酉", yin: "丑" }, 庚: { yang: "申", yin: "寅" }, 辛: { yang: "未", yin: "卯" }, 壬: { yang: "午", yin: "辰" }, 癸: { yang: "辰", yin: "午" },
  },
  谷雨: {
    甲: { yang: "丑", yin: "未" }, 乙: { yang: "子", yin: "申" }, 丙: { yang: "亥", yin: "酉" }, 丁: { yang: "酉", yin: "亥" }, 戊: { yang: "未", yin: "丑" },
    己: { yang: "申", yin: "子" }, 庚: { yang: "未", yin: "丑" }, 辛: { yang: "午", yin: "寅" }, 壬: { yang: "巳", yin: "卯" }, 癸: { yang: "卯", yin: "巳" },
  },
  小满: {
    甲: { yang: "子", yin: "午" }, 乙: { yang: "亥", yin: "未" }, 丙: { yang: "戌", yin: "申" }, 丁: { yang: "申", yin: "戌" }, 戊: { yang: "午", yin: "子" },
    己: { yang: "未", yin: "亥" }, 庚: { yang: "午", yin: "子" }, 辛: { yang: "巳", yin: "丑" }, 壬: { yang: "辰", yin: "寅" }, 癸: { yang: "寅", yin: "辰" },
  },
  夏至: {
    甲: { yang: "亥", yin: "巳" }, 乙: { yang: "戌", yin: "午" }, 丙: { yang: "酉", yin: "未" }, 丁: { yang: "未", yin: "酉" }, 戊: { yang: "巳", yin: "亥" },
    己: { yang: "午", yin: "戌" }, 庚: { yang: "巳", yin: "亥" }, 辛: { yang: "辰", yin: "子" }, 壬: { yang: "卯", yin: "丑" }, 癸: { yang: "丑", yin: "卯" },
  },
  大暑: {
    甲: { yang: "戌", yin: "辰" }, 乙: { yang: "酉", yin: "巳" }, 丙: { yang: "申", yin: "午" }, 丁: { yang: "午", yin: "申" }, 戊: { yang: "辰", yin: "戌" },
    己: { yang: "巳", yin: "酉" }, 庚: { yang: "辰", yin: "戌" }, 辛: { yang: "卯", yin: "亥" }, 壬: { yang: "寅", yin: "子" }, 癸: { yang: "子", yin: "寅" },
  },
  处暑: {
    甲: { yang: "酉", yin: "卯" }, 乙: { yang: "申", yin: "辰" }, 丙: { yang: "未", yin: "巳" }, 丁: { yang: "巳", yin: "未" }, 戊: { yang: "卯", yin: "酉" },
    己: { yang: "辰", yin: "申" }, 庚: { yang: "卯", yin: "酉" }, 辛: { yang: "寅", yin: "戌" }, 壬: { yang: "丑", yin: "亥" }, 癸: { yang: "亥", yin: "丑" },
  },
  秋分: {
    甲: { yang: "申", yin: "寅" }, 乙: { yang: "未", yin: "卯" }, 丙: { yang: "午", yin: "辰" }, 丁: { yang: "辰", yin: "午" }, 戊: { yang: "寅", yin: "申" },
    己: { yang: "卯", yin: "未" }, 庚: { yang: "寅", yin: "申" }, 辛: { yang: "丑", yin: "酉" }, 壬: { yang: "子", yin: "戌" }, 癸: { yang: "戌", yin: "子" },
  },
  霜降: {
    甲: { yang: "未", yin: "丑" }, 乙: { yang: "午", yin: "寅" }, 丙: { yang: "巳", yin: "卯" }, 丁: { yang: "卯", yin: "巳" }, 戊: { yang: "丑", yin: "未" },
    己: { yang: "寅", yin: "午" }, 庚: { yang: "丑", yin: "未" }, 辛: { yang: "子", yin: "申" }, 壬: { yang: "亥", yin: "酉" }, 癸: { yang: "酉", yin: "亥" },
  },
  小雪: {
    甲: { yang: "午", yin: "子" }, 乙: { yang: "巳", yin: "丑" }, 丙: { yang: "辰", yin: "寅" }, 丁: { yang: "寅", yin: "辰" }, 戊: { yang: "子", yin: "午" },
    己: { yang: "丑", yin: "巳" }, 庚: { yang: "子", yin: "午" }, 辛: { yang: "亥", yin: "未" }, 壬: { yang: "戌", yin: "申" }, 癸: { yang: "申", yin: "戌" },
  },
  冬至: {
    甲: { yang: "巳", yin: "亥" }, 乙: { yang: "辰", yin: "子" }, 丙: { yang: "卯", yin: "丑" }, 丁: { yang: "丑", yin: "卯" }, 戊: { yang: "亥", yin: "巳" },
    己: { yang: "子", yin: "辰" }, 庚: { yang: "亥", yin: "巳" }, 辛: { yang: "戌", yin: "午" }, 壬: { yang: "酉", yin: "未" }, 癸: { yang: "未", yin: "酉" },
  },
  大寒: {
    甲: { yang: "辰", yin: "戌" }, 乙: { yang: "卯", yin: "亥" }, 丙: { yang: "寅", yin: "子" }, 丁: { yang: "子", yin: "寅" }, 戊: { yang: "戌", yin: "辰" },
    己: { yang: "亥", yin: "卯" }, 庚: { yang: "戌", yin: "辰" }, 辛: { yang: "酉", yin: "巳" }, 壬: { yang: "申", yin: "午" }, 癸: { yang: "午", yin: "申" },
  },
};

const ENSHRINEMENT_SIT_TABLE: Record<number, string[]> = {
  1: ["睡", "吊", "坐", "睡", "坐", "睡", "坐", "睡", "坐", "睡"],
  2: ["吊", "睡", "睡", "坐", "睡", "睡", "坐", "睡", "坐", "睡"],
  3: ["睡", "坐", "睡", "坐", "吊", "睡", "吊", "睡", "吊", "坐"],
  4: ["睡", "坐", "睡", "坐", "睡", "坐", "睡", "坐", "吊", "睡"],
  5: ["睡", "坐", "睡", "坐", "睡", "睡", "坐", "睡", "睡", "吊"],
  6: ["坐", "吊", "睡", "吊", "睡", "吊", "坐", "睡", "坐", "睡"],
  7: ["睡", "吊", "坐", "睡", "坐", "睡", "坐", "睡", "坐", "睡"],
  8: ["睡", "坐", "睡", "坐", "睡", "睡", "坐", "睡", "睡", "吊"],
  9: ["坐", "吊", "睡", "吊", "睡", "吊", "坐", "睡", "坐", "睡"],
  10: ["睡", "吊", "坐", "睡", "坐", "睡", "坐", "睡", "坐", "睡"],
  11: ["吊", "睡", "睡", "坐", "睡", "睡", "坐", "睡", "坐", "睡"],
  12: ["睡", "坐", "睡", "坐", "吊", "睡", "吊", "睡", "吊", "坐"],
};

const BIG_LUNAR_MONTHS = new Set([1, 3, 5, 7, 8, 10, 12]);
const PROTECTIVE_SHA_CYCLE = ["村", "主", "师", "外"];

type TimeSegmentName = "上刻" | "中刻" | "下刻";
type TimeSegmentTableCell = [string, string];

function pushUnique(items: string[], item: string) {
  if (!items.includes(item)) {
    items.push(item);
  }
}

const TIME_SEGMENT_NAMES: TimeSegmentName[] = ["上刻", "中刻", "下刻"];
const TIME_SEGMENT_TABLE: Record<string, Record<string, TimeSegmentTableCell>> = {
  甲: {
    子: ["太金福", "进愿星"],
    丑: ["财天六", "帛乙合"],
    寅: ["天日明", "官禄堂"],
    卯: ["天少帝", "敕微旺"],
    辰: ["雷锁雾", "兵神宿"],
    巳: ["大黑天", "退道敕"],
    午: ["不司天", "遇命雷"],
    未: ["天司月", "乙命仙"],
    申: ["空青天", "亡龙贵"],
    酉: ["虚明空", "耗堂亡"],
    戌: ["享黑空", "遇道辰"],
    亥: ["朱长黑", "雀生道"],
  },
  乙: {
    子: ["地背福", "兵龙德"],
    丑: ["福玉月", "德堂仙"],
    寅: ["空月玉", "亡旺堂"],
    卯: ["日大天", "禄进贵"],
    辰: ["黑白地", "道虎兵"],
    巳: ["玉少吉", "堂微利"],
    午: ["钱天长", "财牢生"],
    未: ["空玄天", "亡武狱"],
    申: ["享大贵", "遇退人"],
    酉: ["勾黑地", "陈道狱"],
    戌: ["天青天", "兵龙乙"],
    亥: ["富天明", "贵敕堂"],
  },
  丙: {
    子: ["天贵吉", "兵利利"],
    丑: ["虚明明", "耗堂辅"],
    寅: ["天天孤", "兵刑辰"],
    卯: ["朱黑天", "雀道讼"],
    辰: ["禄福月", "元德仙"],
    巳: ["宝天月", "光德仙"],
    午: ["大白天", "进虎煞"],
    未: ["享少天", "通彭煞"],
    申: ["天黑时", "兵道害"],
    酉: ["黄黑天", "人道敕"],
    戌: ["青吉天", "龙利乙"],
    亥: ["大色贵", "退陈人"],
  },
  丁: {
    子: ["月凤地", "仰掌兵"],
    丑: ["大地孤", "进狱辰"],
    寅: ["空天贵", "亡乙人"],
    卯: ["虚时空", "耗堂亡"],
    辰: ["不天时", "遇刑害"],
    巳: ["破黑朱", "败道雀"],
    午: ["日福天", "祷德兵"],
    未: ["天天进", "德敕益"],
    申: ["雷黑天", "兵道煞"],
    酉: ["玄玉贵", "武堂人"],
    戌: ["地天五", "兵牢鬼"],
    亥: ["天黑贵", "讼道人"],
  },
  戊: {
    子: ["空大黑", "亡时道"],
    丑: ["天玄虚", "乙武耗"],
    寅: ["大司凤", "退命掌"],
    卯: ["色黑地", "陈道狱"],
    辰: ["天青天", "兵龙乙"],
    巳: ["日黑天", "禄道敕"],
    午: ["霸月帝", "兵仙旺"],
    未: ["六黄福", "合人德"],
    申: ["地金寡", "兵匮宿"],
    酉: ["破宝六", "害光合"],
    戌: ["白大空", "虎煞亡"],
    亥: ["进天空", "益德亡"],
  },
  己: {
    子: ["大金玉", "进匮堂"],
    丑: ["福金财", "德人帛"],
    寅: ["天月月", "兵尚仙"],
    卯: ["吉天天", "利狱狱"],
    辰: ["空青天", "亡龙乙"],
    巳: ["大黑地", "退玄兵"],
    午: ["地玉贪", "兵堂狼"],
    未: ["勾明福", "陈耗德"],
    申: ["黄虚天", "人贵刑"],
    酉: ["空天寡", "金德宿"],
    戌: ["亡光福", "通讼德"],
    亥: ["享天进", "宝企益"],
  },
  庚: {
    子: ["天金天", "兵匮乙"],
    丑: ["贵宝六", "人光合"],
    寅: ["雷白天", "兵虎煞"],
    卯: ["大玉少", "进堂微"],
    辰: ["地凤月", "兵掌仙"],
    巳: ["吉天长", "利乙生"],
    午: ["凤天吉", "掌官星"],
    未: ["贵明空", "人堂亡"],
    申: ["禄福月", "元德仙"],
    酉: ["享天寡", "通讼宿"],
    戌: ["玄月贵", "武仙人"],
    亥: ["富天三", "贵德合"],
  },
  辛: {
    子: ["雷凤月", "兵掌仙"],
    丑: ["虚勾地", "耗陈狱"],
    寅: ["福黄贵", "德道人"],
    卯: ["吉明明", "利堂辅"],
    辰: ["空天黑", "亡刑道"],
    巳: ["虚天朱", "耗讼雀"],
    午: ["大贵福", "进人德"],
    未: ["富天宝", "贵德光"],
    申: ["天贵紫", "兵人微"],
    酉: ["天玉禄", "敕堂元"],
    戌: ["吉月羊", "利仙刃"],
    亥: ["大黑玄", "退道武"],
  },
  壬: {
    子: ["地天玄", "兵牢武"],
    丑: ["大贵富", "退人贵"],
    寅: ["空司凤", "亡命掌"],
    卯: ["虚勾地", "耗节狱"],
    辰: ["福青天", "德龙乙"],
    巳: ["天黑贵", "煞道人"],
    午: ["天少天", "兵微道"],
    未: ["进天五", "益敕合"],
    申: ["雷金福", "兵匮德"],
    酉: ["大白锁", "进虎神"],
    戌: ["空天黑", "亡煞道"],
    亥: ["吉少禄", "利微元"],
  },
  癸: {
    子: ["空在日", "亡进禄"],
    丑: ["虚勾地", "耗陈狱"],
    寅: ["大玄黑", "退武道"],
    卯: ["贵明明", "人堂辅"],
    辰: ["六天月", "合兵仙"],
    巳: ["贵大朱", "人退雀"],
    午: ["进金月", "益匮仙"],
    未: ["孤叠月", "辰贵仙"],
    申: ["空白雷", "亡虎兵"],
    酉: ["破五锁", "败鬼神"],
    戌: ["享玉天", "通堂乙"],
    亥: ["进空天", "益亡道"],
  },
};

const TIME_SEGMENT_GOOD_MARKS = new Set(["天", "月", "德", "合", "贵", "乙", "玉", "明", "金", "福", "禄", "青", "六", "三", "宝", "司", "益", "进", "人", "堂", "光", "利", "吉", "富", "财", "长", "生", "仙", "旺", "帝", "黄"]);
const TIME_SEGMENT_BAD_MARKS = new Set(["刑", "白", "朱", "玄", "勾", "空", "牢", "狱", "退", "亡", "死", "耗", "破", "孤", "寡", "败", "煞", "黑", "道", "陈", "虎", "害", "鬼", "锁"]);

const TEN_BAD_DAYS = new Set(["甲辰", "乙巳", "丙申", "丁亥", "庚辰", "戊戌", "壬申", "癸亥", "辛巳", "己丑"]);
const WEDDING_EIGHT_SPECIAL_DAYS = new Set(["甲寅", "乙卯", "庚申", "辛酉", "戊戌", "丁未", "己未", "癸丑"]);
const WEDDING_ABSOLUTE_YIN_DAYS = new Set(["甲寅", "甲戌", "辛未", "己未", "丙申", "丁丑"]);
const WEDDING_LONELY_BIRD_DAYS = new Set(["甲寅", "辛亥", "戊申", "丁巳", "乙巳", "壬子"]);
const MAJOR_AUSPICIOUS_STARS = new Set(["天德", "月德", "天德合", "月德合"]);
const WEDDING_FORBIDDEN_DAY_XIONG_SHA = ["天罡", "河魁", "厌对", "招摇"];
const WEDDING_MONTHS_BY_FEMALE_ZODIAC: Record<string, { best: number[]; good: number[] }> = {
  鼠: { best: [6, 12], good: [1, 7] },
  马: { best: [6, 12], good: [1, 7] },
  牛: { best: [5, 11], good: [4, 10] },
  羊: { best: [5, 11], good: [4, 10] },
  虎: { best: [2, 8], good: [3, 9] },
  猴: { best: [2, 8], good: [3, 9] },
  兔: { best: [1, 7], good: [6, 12] },
  鸡: { best: [1, 7], good: [6, 12] },
  龙: { best: [4, 10], good: [5, 11] },
  狗: { best: [4, 10], good: [5, 11] },
  蛇: { best: [3, 9], good: [2, 8] },
  猪: { best: [3, 9], good: [2, 8] },
};
const WEDDING_FORBIDDEN_GROOM_ZODIAC_BY_YEAR_BRANCH: Record<string, string> = {
  子: "蛇",
  丑: "马",
  寅: "羊",
  卯: "猴",
  辰: "鸡",
  巳: "狗",
  午: "猪",
  未: "鼠",
  申: "牛",
  酉: "虎",
  戌: "兔",
  亥: "龙",
};
const WEDDING_STARS_BY_FEMALE_YEAR_STEM: Record<string, { husband: string[]; child: string[]; clashHusband: string[]; clashChild: string[] }> = {
  甲: { husband: ["庚", "辛"], child: ["丙", "丁"], clashHusband: ["丑", "丁"], clashChild: ["申", "壬"] },
  乙: { husband: ["庚", "辛"], child: ["丙", "丁"], clashHusband: ["戌", "丙"], clashChild: ["巳", "癸"] },
  丙: { husband: ["壬", "癸"], child: ["戊", "己"], clashHusband: ["亥", "己"], clashChild: ["辰", "甲"] },
  丁: { husband: ["壬", "癸"], child: ["戊", "己"], clashHusband: ["申", "戊"], clashChild: ["卯", "乙"] },
  戊: { husband: ["甲", "乙"], child: ["庚", "辛"], clashHusband: ["酉", "辛"], clashChild: ["寅", "丙"] },
  己: { husband: ["甲", "乙"], child: ["庚", "辛"], clashHusband: ["辰", "庚"], clashChild: ["丑", "丁"] },
  庚: { husband: ["丙", "丁"], child: ["壬", "癸"], clashHusband: ["巳", "癸"], clashChild: ["子", "戊"] },
  辛: { husband: ["丙", "丁"], child: ["壬", "癸"], clashHusband: ["寅", "壬"], clashChild: ["亥", "己"] },
  壬: { husband: ["戊", "己"], child: ["甲", "乙"], clashHusband: ["卯", "乙"], clashChild: ["戌", "庚"] },
  癸: { husband: ["戊", "己"], child: ["甲", "乙"], clashHusband: ["子", "甲"], clashChild: ["酉", "辛"] },
};
const WEDDING_BIG_MONTH_TOP = ["厨", "妇", "灶", "第", "翁", "堂", "姑", "夫"];
const WEDDING_BIG_MONTH_BOTTOM = ["厨", "路", "门", "睡", "死", "床", "堂", "灶"];
const WEDDING_SMALL_MONTH_TOP = ["厨", "夫", "姑", "堂", "翁", "第", "灶", "妇"];
const WEDDING_SMALL_MONTH_BOTTOM = ["灶", "堂", "床", "死", "睡", "门", "路", "厨"];
const WEDDING_BIG_MONTHS = new Set([1, 3, 5, 7, 8, 10, 12]);
const WEDDING_SMALL_MONTHS = new Set([2, 4, 6, 9, 11]);
const WEDDING_CHART_STRONG_AVOID = new Set(["夫", "姑", "翁", "妇"]);
const WEDDING_CHART_NOTES: Record<string, string> = {
  灶: "落灶，可能不利准时开餐",
  第: "落第，冲门第，主要指亲戚门第往来不顺",
  床: "落床，婚后易有小矛盾",
  死: "落死，冲到已过世亲人",
};
const GOLD_SPIRIT_BRANCHES_BY_YEAR_STEM: Record<string, string[]> = {
  甲: ["午", "未"],
  乙: ["辰", "巳"],
  丙: ["子", "丑", "寅", "卯"],
  丁: ["戌", "亥"],
  戊: ["申", "酉"],
  己: ["午", "未"],
  庚: ["辰", "巳"],
  辛: ["子", "卯", "寅"],
  壬: ["戌", "亥"],
  癸: ["申", "酉"],
};
const BA_ZI_GOLD_SPIRIT_DAYS = new Set(["乙丑", "己巳", "癸酉"]);
const LODGE_GOLD_SPIRIT_XIU = new Set(["亢", "牛", "娄", "鬼"]);
const BIG_REPAIR_DAYS = new Set(["壬子", "癸丑", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉"]);
const MINOR_REPAIR_TRAVEL_DAYS: Record<string, string> = {
  甲子: "东游",
  己巳: "还位",
  丙子: "南游",
  辛巳: "还位",
  戊子: "游中宫",
  癸巳: "还位",
  庚子: "西游",
  乙巳: "还位",
  壬子: "北游",
  丁巳: "还位",
};
const EARTH_SYMBOL_BRANCH_BY_LUNAR_MONTH: Record<number, string> = {
  1: "寅",
  2: "卯",
  3: "辰",
  4: "巳",
  5: "午",
  6: "未",
  7: "申",
  8: "酉",
  9: "戌",
  10: "亥",
  11: "子",
  12: "丑",
};
const EARTH_MANSION_BRANCH_BY_LUNAR_MONTH: Record<number, string> = {
  1: "丑",
  2: "巳",
  3: "酉",
  4: "寅",
  5: "午",
  6: "戌",
  7: "卯",
  8: "未",
  9: "亥",
  10: "辰",
  11: "申",
  12: "子",
};
const SEASON_BOUNDARY_TERMS = new Set(["立春", "立夏", "立秋", "立冬", "春分", "夏至", "秋分", "冬至"]);
const FOUR_JUE_TERMS = new Set(["立春", "立夏", "立秋", "立冬"]);
const FOUR_LI_TERMS = new Set(["春分", "夏至", "秋分", "冬至"]);
const THREE_FUNERAL_SHA_BY_SEASON = [
  { months: [1, 2, 3], branch: "辰", season: "春" },
  { months: [4, 5, 6], branch: "未", season: "夏" },
  { months: [7, 8, 9], branch: "戌", season: "秋" },
  { months: [10, 11, 12], branch: "丑", season: "冬" },
];
const REPEATED_DAY_STEM_BY_JIAN_MONTH: Record<number, string> = {
  1: "甲",
  2: "乙",
  3: "戊",
  4: "丙",
  5: "丁",
  6: "己",
  7: "庚",
  8: "辛",
  9: "戊",
  10: "壬",
  11: "癸",
  12: "己",
};
const JIAN_MONTH_BY_MONTH_BRANCH: Record<string, number> = {
  寅: 1,
  卯: 2,
  辰: 3,
  巳: 4,
  午: 5,
  未: 6,
  申: 7,
  酉: 8,
  戌: 9,
  亥: 10,
  子: 11,
  丑: 12,
};

const YEAR_BIG_DEFEAT_DAYS: Record<string, Array<{ month: number; dayGanZhi: string }>> = {
  甲: [
    { month: 3, dayGanZhi: "戊戌" },
    { month: 7, dayGanZhi: "癸亥" },
    { month: 10, dayGanZhi: "丙申" },
    { month: 11, dayGanZhi: "丁亥" },
  ],
  己: [
    { month: 3, dayGanZhi: "戊戌" },
    { month: 7, dayGanZhi: "癸亥" },
    { month: 10, dayGanZhi: "丙申" },
    { month: 11, dayGanZhi: "丁亥" },
  ],
  乙: [{ month: 4, dayGanZhi: "壬申" }, { month: 9, dayGanZhi: "乙巳" }],
  庚: [{ month: 4, dayGanZhi: "壬申" }, { month: 9, dayGanZhi: "乙巳" }],
  丙: [{ month: 3, dayGanZhi: "辛巳" }, { month: 9, dayGanZhi: "庚辰" }, { month: 10, dayGanZhi: "甲辰" }],
  辛: [{ month: 3, dayGanZhi: "辛巳" }, { month: 9, dayGanZhi: "庚辰" }, { month: 10, dayGanZhi: "甲辰" }],
  戊: [{ month: 6, dayGanZhi: "己丑" }],
  癸: [{ month: 6, dayGanZhi: "己丑" }],
};

const AUSPICIOUS_RESOLVER_TABLE: Record<string, Record<string, string>> = {
  寅: { 天德: "丁", 天德合: "壬", 月德: "丙", 月德合: "辛" },
  卯: { 天德: "申", 天德合: "己", 月德: "甲", 月德合: "己" },
  辰: { 天德: "壬", 天德合: "丁", 月德: "壬", 月德合: "丁" },
  巳: { 天德: "辛", 天德合: "丙", 月德: "庚", 月德合: "乙" },
  午: { 天德: "亥", 天德合: "寅", 月德: "丙", 月德合: "辛" },
  未: { 天德: "甲", 天德合: "己", 月德: "甲", 月德合: "己" },
  申: { 天德: "癸", 天德合: "戊", 月德: "壬", 月德合: "丁" },
  酉: { 天德: "寅", 天德合: "亥", 月德: "庚", 月德合: "乙" },
  戌: { 天德: "丙", 天德合: "辛", 月德: "丙", 月德合: "辛" },
  亥: { 天德: "乙", 天德合: "庚", 月德: "甲", 月德合: "己" },
  子: { 天德: "己", 天德合: "甲", 月德: "壬", 月德合: "丁" },
  丑: { 天德: "庚", 天德合: "乙", 月德: "庚", 月德合: "乙" },
};

const LU_BRANCH_BY_STEM: Record<string, string> = {
  甲: "寅",
  乙: "卯",
  丙: "巳",
  戊: "巳",
  丁: "午",
  己: "午",
  庚: "申",
  辛: "酉",
  壬: "亥",
  癸: "子",
};

const TRINITY_GROUPS = [
  { branches: ["寅", "午", "戌"], element: "火", label: "寅午戌合化火局" },
  { branches: ["巳", "酉", "丑"], element: "金", label: "巳酉丑合化金局" },
  { branches: ["申", "子", "辰"], element: "水", label: "申子辰合化水局" },
  { branches: ["亥", "卯", "未"], element: "木", label: "亥卯未合化木局" },
];

const THREE_AUSPICIOUS_SIX_BEAUTIES = new Set(["甲", "己", "庚", "辰", "丑", "亥", "酉", "丙", "丁"]);
const THREE_MISFORTUNES_SIX_HARMS = new Set(["寅", "卯", "乙", "未", "申", "辛", "戌", "壬", "癸"]);
const STEM_WEIGHT = 0.2;
const BRANCH_WEIGHT = 0.8;
const GOOD_TIER_ONE_POINTS = 32;
const GOOD_TIER_ONE_SECONDARY_POINTS = 28;
const GOOD_TIER_TWO_POINTS = 20;
const GOOD_TIER_THREE_POINTS = 12;
const GOOD_TIER_FOUR_POINTS = 6;
const DEMOLITION_BREAK_DAY_TARGET_SCORE = 90;

const MOUNTAIN_PALACE_BASE: Record<string, number> = {
  壬: 1,
  子: 1,
  癸: 1,
  丑: 8,
  艮: 8,
  寅: 8,
  甲: 3,
  卯: 3,
  乙: 3,
  辰: 4,
  巽: 4,
  巳: 4,
  丙: 9,
  午: 9,
  丁: 9,
  未: 2,
  坤: 2,
  申: 2,
  庚: 7,
  酉: 7,
  辛: 7,
  戌: 6,
  乾: 6,
  亥: 6,
};

const MOUNTAIN_OPPOSITE: Record<string, string> = {
  壬: "丙",
  子: "午",
  癸: "丁",
  丑: "未",
  艮: "坤",
  寅: "申",
  甲: "庚",
  卯: "酉",
  乙: "辛",
  辰: "戌",
  巽: "乾",
  巳: "亥",
  丙: "壬",
  午: "子",
  丁: "癸",
  未: "丑",
  坤: "艮",
  申: "寅",
  庚: "甲",
  酉: "卯",
  辛: "乙",
  戌: "辰",
  乾: "巽",
  亥: "巳",
};

const MOUNTAIN_ORIENTATION_GROUPS = [
  { mountains: ["壬", "子", "癸", "丙", "午", "丁"], label: "南北走向" },
  { mountains: ["甲", "卯", "乙", "庚", "酉", "辛"], label: "东西走向" },
  { mountains: ["丑", "艮", "寅", "未", "坤", "申"], label: "东北-西南走向" },
  { mountains: ["辰", "巽", "巳", "戌", "乾", "亥"], label: "东南-西北走向" },
];

const MOUNTAIN_GOOD_NUMBERS = new Set([1, 6, 8]);
const MOUNTAIN_SMALL_GOOD_NUMBERS = new Set([9, 4]);
const MOUNTAIN_BAD_NUMBERS = new Set([5, 7, 2, 3]);
const MOUNTAIN_AUSPICIOUS_COMBOS = ["14", "16", "13", "39", "86", "87", "89", "19", "27", "38", "49", "147", "258", "369"];
const MOUNTAIN_BAD_COMBOS = ["25", "37", "97", "23", "67"];
const MOUNTAIN_BAD_NUMBER_MEANING: Record<number, string> = {
  2: "主病",
  3: "主争执",
  5: "主灾病",
  7: "主口舌、盗贼、破耗",
};

const MOUNTAIN_MONTH_CENTER_BY_YEAR_BRANCH_GROUP = [
  { branches: ["子", "午", "卯", "酉"], centers: [8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7, 6] },
  { branches: ["寅", "申", "巳", "亥"], centers: [3, 2, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  { branches: ["辰", "戌", "丑", "未"], centers: [5, 4, 3, 2, 1, 9, 8, 7, 6, 5, 4, 3] },
];

const MOUNTAIN_DAY_CENTER_BY_PERIOD: Record<string, number[]> = {
  冬至: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  雨水: [7, 8, 9, 1, 2, 3, 4, 5, 6],
  谷雨: [4, 5, 6, 7, 8, 9, 1, 2, 3],
  夏至: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  处暑: [3, 2, 1, 9, 8, 7, 6, 5, 4],
  霜降: [6, 5, 4, 3, 2, 1, 9, 8, 7],
};

const MOUNTAIN_SOLAR_TERM_STARTS = new Set(Object.keys(MOUNTAIN_DAY_CENTER_BY_PERIOD));
const MOUNTAIN_MONTH_BY_SOLAR_TERM_PERIOD: Record<string, number> = {
  冬至: 12,
  雨水: 2,
  谷雨: 4,
  夏至: 6,
  处暑: 8,
  霜降: 10,
};

const MOUNTAIN_HOUR_CENTER = {
  winter: {
    子午卯酉: [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3],
    辰戌丑未: [4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6],
    寅申巳亥: [7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  summer: {
    子午卯酉: [9, 8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7],
    辰戌丑未: [6, 5, 4, 3, 2, 1, 9, 8, 7, 6, 5, 4],
    寅申巳亥: [3, 2, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  },
};

const WEALTH_BRANCHES_BY_ELEMENT: Record<string, string[]> = {
  火: ["寅", "午", "戌"],
  金: ["巳", "酉", "丑"],
  水: ["申", "子", "辰"],
  木: ["亥", "卯", "未"],
};

const SAN_SHA_RULES = [
  { source: ["寅", "午", "戌"], sha: ["亥", "子", "丑"], direction: "北方", label: "寅午戌煞在亥子丑" },
  { source: ["申", "子", "辰"], sha: ["巳", "午", "未"], direction: "南方", label: "申子辰煞在巳午未" },
  { source: ["亥", "卯", "未"], sha: ["申", "酉", "戌"], direction: "西方", label: "亥卯未煞在申酉戌" },
  { source: ["巳", "酉", "丑"], sha: ["寅", "卯", "辰"], direction: "东方", label: "巳酉丑煞在寅卯辰" },
];

const BIRTH_SAN_SHA_DAY_RULES = [
  { source: ["巳", "午", "未"], avoid: ["申", "子", "辰"], label: "巳午未出生避申子辰日时" },
  { source: ["申", "酉", "戌"], avoid: ["亥", "卯", "未"], label: "申酉戌出生避亥卯未日时" },
  { source: ["亥", "子", "丑"], avoid: ["寅", "午", "戌"], label: "亥子丑出生避寅午戌日时" },
  { source: ["寅", "卯", "辰"], avoid: ["巳", "酉", "丑"], label: "寅卯辰出生避巳酉丑日时" },
];

const YANG_GONG_AVOID_DAYS = new Set([
  "1-13",
  "2-11",
  "3-9",
  "4-7",
  "5-5",
  "6-3",
  "7-1",
  "7-29",
  "8-27",
  "9-25",
  "10-23",
  "11-21",
  "12-19",
]);

const RED_SAND_BRANCH_BY_LUNAR_MONTH: Record<number, string> = {
  1: "酉",
  4: "酉",
  7: "酉",
  10: "酉",
  2: "巳",
  5: "巳",
  8: "巳",
  11: "巳",
  3: "丑",
  6: "丑",
  9: "丑",
  12: "丑",
};

const FORTUNE_CHANGE_DAYS = new Set(["己巳", "己酉", "己丑"]);
const XIU_LUCK_EXPLANATIONS: Record<string, string> = {
  吉: "二十八星宿表判为吉，可办事参考",
  凶: "二十八星宿表判为凶，择日需慎重",
  平: "二十八星宿表判为平，作参考",
  半吉: "二十八星宿表判为半吉，需结合其它大忌",
  半凶: "二十八星宿表判为半凶，需结合其它大忌",
};
const NAYIN_TIME_LUCK_TABLE: Record<string, Record<string, string>> = {
  甲子: {
    甲子: "金砖吉",
    乙丑: "天德贵人吉",
    丙寅: "白虎凶",
    丁卯: "玉女天门吉神吉",
    戊辰: "天牢凶",
    己巳: "元武黑道凶",
    庚午: "司命金星吉",
    辛未: "勾绞凶",
    壬申: "青龙吉",
    癸酉: "明堂吉",
    甲戌: "天刑黑成凶",
    乙亥: "朱雀天讼凶",
  },
  甲寅: {
    甲子: "青龙吉",
    乙丑: "贵人明堂吉",
    丙寅: "天刑凶",
    丁卯: "元武凶",
    戊辰: "金砖吉",
    己巳: "天德吉",
    庚午: "白虎凶",
    辛未: "玉堂吉",
    壬申: "空亡凶",
    癸酉: "截路凶",
    甲戌: "司命贵人吉",
    乙亥: "勾绞凶",
  },
  甲辰: {
    甲子: "元武天牢凶",
    乙丑: "勾绞空亡凶",
    丙寅: "三合黄道吉",
    丁卯: "勾绞凶",
    戊辰: "青龙吉",
    己巳: "黄道明堂吉",
    庚午: "天刑五鬼凶",
    辛未: "朱雀凶",
    壬申: "金砖吉",
    癸酉: "天德贵吉",
    甲戌: "白虎凶",
    乙亥: "玉堂天门吉神吉",
  },
  甲午: {
    甲子: "金砖吉",
    乙丑: "天乙贵人吉",
    丙寅: "白虎凶",
    丁卯: "玉堂吉",
    戊辰: "天牢凶",
    己巳: "元武凶",
    庚午: "司命吉",
    辛未: "勾绞凶",
    壬申: "青龙吉",
    癸酉: "明堂吉",
    甲戌: "天刑凶",
    乙亥: "朱雀凶",
  },
  甲申: {
    甲子: "青龙吉",
    乙丑: "明堂吉",
    丙寅: "天牢凶",
    丁卯: "勾绞凶",
    戊辰: "金砖吉",
    己巳: "天德吉",
    庚午: "白虎凶",
    辛未: "玉堂吉",
    壬申: "截路凶",
    癸酉: "截路凶",
    甲戌: "司命吉",
    乙亥: "勾绞凶",
  },
  甲戌: {
    甲子: "元武天刑凶",
    乙丑: "截路空亡凶",
    丙寅: "三合黄道吉",
    丁卯: "勾绞凶",
    戊辰: "青龙吉",
    己巳: "黄道明堂吉",
    庚午: "天牢五鬼凶",
    辛未: "玉堂吉",
    壬申: "金砖吉",
    癸酉: "天德贵吉",
    甲戌: "白虎凶",
    乙亥: "天开玉堂吉",
  },
  乙丑: {
    丙子: "天刑凶",
    丁丑: "朱雀凶",
    戊寅: "金砖吉",
    己卯: "天德吉",
    庚辰: "白虎凶",
    辛巳: "玉堂吉",
    壬午: "天牢凶",
    癸未: "元武凶",
    甲申: "贵人司命吉",
    乙酉: "勾绞凶",
    丙戌: "青龙吉",
    丁亥: "明堂吉",
  },
};

const JIA_ZI = [
  "甲子",
  "乙丑",
  "丙寅",
  "丁卯",
  "戊辰",
  "己巳",
  "庚午",
  "辛未",
  "壬申",
  "癸酉",
  "甲戌",
  "乙亥",
  "丙子",
  "丁丑",
  "戊寅",
  "己卯",
  "庚辰",
  "辛巳",
  "壬午",
  "癸未",
  "甲申",
  "乙酉",
  "丙戌",
  "丁亥",
  "戊子",
  "己丑",
  "庚寅",
  "辛卯",
  "壬辰",
  "癸巳",
  "甲午",
  "乙未",
  "丙申",
  "丁酉",
  "戊戌",
  "己亥",
  "庚子",
  "辛丑",
  "壬寅",
  "癸卯",
  "甲辰",
  "乙巳",
  "丙午",
  "丁未",
  "戊申",
  "己酉",
  "庚戌",
  "辛亥",
  "壬子",
  "癸丑",
  "甲寅",
  "乙卯",
  "丙辰",
  "丁巳",
  "戊午",
  "己未",
  "庚申",
  "辛酉",
  "壬戌",
  "癸亥",
];

const GOLD_SYMBOL_STARS = ["妖星", "惑星", "禾刀", "煞贡", "直星", "卜木", "角己", "人专", "立早"];
const GOLD_SYMBOL_AUSPICIOUS = new Set(["煞贡", "直星", "人专"]);
const GOLD_SYMBOL_MAJOR_INAUSPICIOUS = new Set(["妖星", "惑星", "禾刀"]);
const GOLD_SYMBOL_START_INDEX_BY_MONTH: Record<number, number> = {
  1: 0,
  4: 0,
  7: 0,
  10: 0,
  2: 1,
  5: 1,
  8: 1,
  11: 1,
  3: 2,
  6: 2,
  9: 2,
  12: 2,
};

const GOLD_SYMBOL_STAR_DETAILS: Record<string, string> = {
  煞贡: "三大吉星之一，只能作辅助参考；大忌已避开时可锦上添花。",
  直星: "三大吉星之一，只能作辅助参考；大忌已避开时可锦上添花。",
  人专: "三大吉星之一，只能作辅助参考；大忌已避开时可锦上添花。",
  妖星: "六凶星之一，正式乔迁、开火、安床、入住过夜不建议选用。",
  惑星: "六凶星之一，正式乔迁、开火、安床、入住过夜不建议选用。",
  禾刀: "六凶星之一，正式乔迁、开火、安床、入住过夜不建议选用。",
  卜木: "六凶星之一，乔迁不优先，只作扣分参考。",
  角己: "六凶星之一，乔迁不优先，只作扣分参考。",
  立早: "六凶星之一，乔迁不优先，只作扣分参考。",
};

export type MovingBirthProfile = {
  yearGan: string;
  yearZhi: string;
  yearGanZhi: string;
  monthGan: string;
  monthZhi: string;
  monthGanZhi: string;
  dayZhi: string;
  dayGanZhi: string;
  hourZhi: string;
  fetalGanZhi: string;
  fetalGan: string;
  fetalZhi: string;
  wealthBaseGroupLabel: string;
  wealthBaseElement: string;
  wealthElement: string;
  luBranch: string;
  wealthBranches: string[];
};

export function getMovingBirthProfile(input: DateInput): MovingBirthProfile {
  const birthDay = getAlmanacDay(getBirthSolarDate(input));
  const wealthBaseGroup = getTrinityGroupByBranch(birthDay.dayZhi);
  const wealthElement = wealthBaseGroup ? CONTROLS[wealthBaseGroup.element] ?? "" : "";
  const fetalGanZhi = getFetalOrigin(birthDay.monthGan, birthDay.monthZhi);
  return {
    yearGan: birthDay.yearGan,
    yearZhi: birthDay.yearZhi,
    yearGanZhi: birthDay.yearGanZhi,
    monthGan: birthDay.monthGan,
    monthZhi: birthDay.monthZhi,
    monthGanZhi: birthDay.monthGanZhi,
    dayZhi: birthDay.dayZhi,
    dayGanZhi: birthDay.dayGanZhi,
    hourZhi: input.birthTimeBranch,
    fetalGanZhi,
    fetalGan: fetalGanZhi.slice(0, 1),
    fetalZhi: fetalGanZhi.slice(1, 2),
    wealthBaseGroupLabel: wealthBaseGroup?.label ?? "",
    wealthBaseElement: wealthBaseGroup?.element ?? "",
    wealthElement,
    luBranch: LU_BRANCH_BY_STEM[birthDay.yearGan] ?? "",
    wealthBranches: WEALTH_BRANCHES_BY_ELEMENT[wealthElement] ?? [],
  };
}

function getWeddingGroomProfile(input: DateInput) {
  return getMovingBirthProfile({
    ...input,
    birthCalendar: input.groomBirthCalendar,
    birthDate: input.groomBirthDate,
    birthClockTime: input.groomBirthClockTime,
    birthPlace: input.groomBirthPlace,
    birthLongitude: input.groomBirthLongitude,
    birthTimeBranch: input.groomBirthTimeBranch,
  });
}

export function scoreWeddingDay(day: AlmanacDay, input: DateInput): ScoredDay {
  const profile = getMovingBirthProfile(input);
  const groomProfile = getWeddingGroomProfile(input);
  const considerChildren = input.weddingConsiderChildren !== false;
  let score = 50;
  let eliminated = false;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      label: "基础分",
      points: 50,
      type: "base",
      detail: `结婚择日以女命为主、男命兼看：先看大利月/小利月，再看夫星${considerChildren ? "、子嗣、冲夫、冲子" : "、冲夫；本次不考虑子嗣"}、大月图/小月图、不将日、男女禄神与专用避忌`,
    },
  ];

  const femaleMonthRule = WEDDING_MONTHS_BY_FEMALE_ZODIAC[getZodiacByBranch(profile.yearZhi)];
  if (femaleMonthRule?.best.includes(day.lunarMonth)) {
    score += 30;
    reasons.push(`女命大利月：农历${day.lunarMonth}月`);
    scoreBreakdown.push({
      label: "女命利月",
      points: 30,
      type: "bonus",
      detail: `以女命生肖${getZodiacByBranch(profile.yearZhi)}查表，大利月为${femaleMonthRule.best.join("、")}月；本日农历${day.lunarMonth}月命中大利月`,
    });
  } else if (femaleMonthRule?.good.includes(day.lunarMonth)) {
    score += 16;
    reasons.push(`女命小利月：农历${day.lunarMonth}月`);
    scoreBreakdown.push({
      label: "女命利月",
      points: 16,
      type: "bonus",
      detail: `以女命生肖${getZodiacByBranch(profile.yearZhi)}查表，小利月为${femaleMonthRule.good.join("、")}月；本日农历${day.lunarMonth}月命中小利月`,
    });
  } else {
    score -= 12;
    cautions.push(`不在女命大利月/小利月：农历${day.lunarMonth}月`);
    scoreBreakdown.push({
      label: "女命利月",
      points: -12,
      type: "penalty",
      detail: femaleMonthRule
        ? `以女命生肖${getZodiacByBranch(profile.yearZhi)}查表，大利月${femaleMonthRule.best.join("、")}月，小利月${femaleMonthRule.good.join("、")}月；本月未命中，只降低优先级，不淘汰`
        : `未能识别女命生肖年支${profile.yearZhi}，暂无法查大利月/小利月`,
    });
  }

  const weddingStarRule = WEDDING_STARS_BY_FEMALE_YEAR_STEM[profile.yearGan];
  const dayCourseChars = getCourseChars(day);
  const groomZodiac = getZodiacByBranch(groomProfile.yearZhi);
  const forbiddenGroomZodiac = WEDDING_FORBIDDEN_GROOM_ZODIAC_BY_YEAR_BRANCH[day.yearZhi];
  if (groomZodiac && forbiddenGroomZodiac && groomZodiac === forbiddenGroomZodiac) {
    score -= 100;
    eliminated = true;
    cautions.push(`男方生肖禁年：${day.yearGanZhi}年不利男方属${groomZodiac}`);
    scoreBreakdown.push({
      label: "男方生肖禁年",
      points: -100,
      type: "eliminate",
      detail: `按利月表左侧：${day.yearZhi}年禁止男方属${forbiddenGroomZodiac}结婚；男方年支${groomProfile.yearZhi}属${groomZodiac}，强避淘汰`,
    });
  } else {
    scoreBreakdown.push({
      label: "男方生肖禁年",
      points: 0,
      type: "info",
      detail: forbiddenGroomZodiac
        ? `${day.yearGanZhi}年表中忌男方属${forbiddenGroomZodiac}；男方属${groomZodiac || "未识别"}，未命中`
        : `未能识别候选年支${day.yearZhi}的男方禁年规则`,
    });
  }

  if (weddingStarRule) {
    const husbandHits = dayCourseChars.filter((char) => weddingStarRule.husband.includes(char));
    const childHits = dayCourseChars.filter((char) => weddingStarRule.child.includes(char));
    const clashHusbandHits = dayCourseChars.filter((char) => weddingStarRule.clashHusband.includes(char));
    const clashChildHits = considerChildren ? dayCourseChars.filter((char) => weddingStarRule.clashChild.includes(char)) : [];

    if (clashHusbandHits.length > 0 || clashChildHits.length > 0) {
      score -= 100;
      eliminated = true;
      const details = [
        clashHusbandHits.length ? `冲夫命中${[...new Set(clashHusbandHits)].join("、")}` : "",
        clashChildHits.length ? `冲子命中${[...new Set(clashChildHits)].join("、")}` : "",
      ].filter(Boolean);
      cautions.push(`女命年干冲夫/冲子：${details.join("；")}`);
      scoreBreakdown.push({
        label: "夫星子嗣",
        points: -100,
        type: "eliminate",
        detail: `以女命年干${profile.yearGan}查表，冲夫为${weddingStarRule.clashHusband.join("、")}，冲子为${weddingStarRule.clashChild.join("、")}；年月日三柱${formatCoursePillars(day)}中${details.join("；")}，强避淘汰`,
      });
    } else if (husbandHits.length > 1) {
      score -= 100;
      eliminated = true;
      cautions.push(`夫星过多：${[...new Set(husbandHits)].join("、")}`);
      scoreBreakdown.push({
        label: "夫星子嗣",
        points: -100,
        type: "eliminate",
        detail: `以女命年干${profile.yearGan}查表，夫星为${weddingStarRule.husband.join("、")}；夫星只能一个，年月日三柱已出现${husbandHits.length}个，强避淘汰`,
      });
    } else if (husbandHits.length === 0 && considerChildren && childHits.length === 0) {
      score -= 100;
      eliminated = true;
      cautions.push(`夫星、子嗣均缺：单一时辰无法同时补足`);
      scoreBreakdown.push({
        label: "夫星子嗣",
        points: -100,
        type: "eliminate",
        detail: `以女命年干${profile.yearGan}查表，夫星${weddingStarRule.husband.join("、")}必须且只能一个，子嗣${weddingStarRule.child.join("、")}至少一个；年月日三柱${formatCoursePillars(day)}中夫星、子嗣均未见，一个时辰天干无法同时补足两项，强避淘汰`,
      });
    } else {
      const missingHusband = husbandHits.length === 0;
      const missingChild = considerChildren && childHits.length === 0;
      const fillHours = missingHusband || missingChild ? getWeddingRecommendedHours(day, input) : [];
      const canFillHusband = !missingHusband || fillHours.some((hour) => hour.relation === "夫星" || hour.relation === "夫星/子嗣");
      const canFillChild = !missingChild || fillHours.some((hour) => hour.relation === "子嗣" || hour.relation === "夫星/子嗣");

      if (!canFillHusband || !canFillChild) {
        score -= 100;
        eliminated = true;
        const missingDetails = [
          !canFillHusband ? `夫星需取${weddingStarRule.husband.join("、")}之一，但无可用时辰补足` : "",
          !canFillChild ? `子嗣需取${weddingStarRule.child.join("、")}之一，但无可用时辰补足` : "",
        ].filter(Boolean);
        cautions.push(`夫星/子嗣无法择时补足：${missingDetails.join("；")}`);
        scoreBreakdown.push({
          label: "夫星子嗣",
          points: -100,
          type: "eliminate",
          detail: `以女命年干${profile.yearGan}查表，夫星${weddingStarRule.husband.join("、")}必须且只能一个，子嗣${weddingStarRule.child.join("、")}至少一个；年月日三柱${formatCoursePillars(day)}中夫星${husbandHits.join("、") || "未见"}，子嗣${childHits.join("、") || "未见"}。${missingDetails.join("；")}，强避淘汰`,
        });
      } else {
        if (missingHusband) {
          cautions.push("夫星待择时补足：见下方择时推荐");
        } else {
          reasons.push(`夫星得一：${husbandHits[0]}`);
        }
        if (missingChild) {
          cautions.push("子嗣待择时补足：见下方择时推荐");
        } else if (considerChildren) {
          reasons.push(`子嗣已见：${[...new Set(childHits)].join("、")}`);
        } else {
          reasons.push("本次不考虑子嗣");
        }
        score += missingHusband || missingChild ? 8 : 28;
        scoreBreakdown.push({
          label: "夫星子嗣",
          points: missingHusband || missingChild ? 8 : 28,
          type: "bonus",
          detail: `以女命年干${profile.yearGan}查表，夫星${weddingStarRule.husband.join("、")}必须且只能一个${considerChildren ? `，子嗣${weddingStarRule.child.join("、")}至少一个` : "；本次不考虑子嗣"}；年月日三柱${formatCoursePillars(day)}中夫星${husbandHits.join("、") || "未见"}${considerChildren ? `，子嗣${childHits.join("、") || "未见"}` : ""}${missingHusband || missingChild ? "，缺项可由择时补足" : ""}`,
        });
      }
    }
  } else {
    scoreBreakdown.push({
      label: "夫星子嗣",
      points: 0,
      type: "info",
      detail: `未能识别女命年干${profile.yearGan || "空"}，暂无法查夫星、子嗣、冲夫、冲子`,
    });
  }

  const chart = getWeddingChartMark(day);
  if (chart.mark) {
    if (WEDDING_CHART_STRONG_AVOID.has(chart.mark)) {
      score -= 100;
      eliminated = true;
      cautions.push(`大月图/小月图落${chart.mark}：结婚不可用`);
      scoreBreakdown.push({
        label: "大月图/小月图",
        points: -100,
        type: "eliminate",
        detail: `${chart.detail}；落在夫、姑、翁、妇绝不可冲，强避淘汰`,
      });
    } else {
      const note = WEDDING_CHART_NOTES[chart.mark];
      const points = note ? -4 : 0;
      score += points;
      if (note) {
        cautions.push(`大月图/小月图落${chart.mark}：${note}`);
      }
      scoreBreakdown.push({
        label: "大月图/小月图",
        points,
        type: points < 0 ? "penalty" : "info",
        detail: `${chart.detail}；未落夫、姑、翁、妇${note ? `，但${note}` : "，只作落字判断"}；此项不等同万年历“不将日”`,
      });
    }
  } else {
    scoreBreakdown.push({
      label: "大月图/小月图",
      points: 0,
      type: "info",
      detail: chart.detail,
    });
  }

  const hasBuJiang = day.dayJiShen.some((star) => star.includes("不将"));
  if (hasBuJiang) {
    score += 18;
    reasons.push("不将日：万年历吉神宜趋见不将");
    scoreBreakdown.push({
      label: "不将日",
      points: 18,
      type: "bonus",
      detail: `本日吉神宜趋：${day.dayJiShen.join("、") || "未识别"}；命中“不将”，作为结婚吉神参考`,
    });
  } else {
    scoreBreakdown.push({
      label: "不将日",
      points: 0,
      type: "info",
      detail: `本日吉神宜趋：${day.dayJiShen.join("、") || "未识别"}；未见“不将”。大月图/小月图落字不等同不将日`,
    });
  }

  const femaleLuBranch = LU_BRANCH_BY_STEM[profile.yearGan] ?? "";
  if (femaleLuBranch) {
    const luHits = [day.yearZhi, day.monthZhi, day.dayZhi].filter((branch) => branch === femaleLuBranch);
    if (luHits.length > 0) {
      score += 24;
      reasons.push(`女命有禄：${profile.yearGan}禄在${femaleLuBranch}`);
      scoreBreakdown.push({
        label: "女命禄神",
        points: 24,
        type: "bonus",
        detail: `一禄可抵万财。女命年干${profile.yearGan}禄在${femaleLuBranch}，年月日三柱已见${femaleLuBranch}`,
      });
    } else {
      scoreBreakdown.push({
        label: "女命禄神",
        points: 0,
        type: "info",
        detail: `一禄可抵万财。女命年干${profile.yearGan}禄在${femaleLuBranch}；年月日未见，可择${femaleLuBranch}时补禄`,
      });
    }
  }

  const maleLuBranch = LU_BRANCH_BY_STEM[groomProfile.yearGan] ?? "";
  if (maleLuBranch) {
    const maleLuHits = [day.yearZhi, day.monthZhi, day.dayZhi].filter((branch) => branch === maleLuBranch);
    if (maleLuHits.length > 0) {
      score += 14;
      reasons.push(`男命有禄：${groomProfile.yearGan}禄在${maleLuBranch}`);
      scoreBreakdown.push({
        label: "男命禄神",
        points: 14,
        type: "bonus",
        detail: `结婚择日以女命为主，男命禄神兼看。男命年干${groomProfile.yearGan}禄在${maleLuBranch}，年月日三柱已见${maleLuBranch}`,
      });
    } else {
      scoreBreakdown.push({
        label: "男命禄神",
        points: 0,
        type: "info",
        detail: `结婚择日男命禄神兼看。男命年干${groomProfile.yearGan}禄在${maleLuBranch}；年月日未见，可择${maleLuBranch}时作辅助`,
      });
    }
  }

  const redSandBranch = RED_SAND_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (redSandBranch && day.dayZhi === redSandBranch) {
    score -= 100;
    eliminated = true;
    cautions.push(`结婚避红砂日：农历${day.lunarMonth}月遇${day.dayZhi}日`);
    scoreBreakdown.push({
      label: "结婚避红砂日",
      points: -100,
      type: "eliminate",
      detail: "1、4、7、10月遇酉日；2、5、8、11月遇巳日；3、6、9、12月遇丑日。命中即淘汰",
    });
  } else {
    scoreBreakdown.push({
      label: "结婚避红砂日",
      points: 0,
      type: "info",
      detail: redSandBranch ? `农历${day.lunarMonth}月红砂看${redSandBranch}日，本日${day.dayZhi}未命中` : "未识别红砂日月份规则",
    });
  }

  if (day.dayTianShenType === "黑道") {
    score -= 100;
    eliminated = true;
    cautions.push(`黑道日：${day.dayTianShen || "未识别天神"}为黑道`);
    scoreBreakdown.push({
      label: "黑道日",
      points: -100,
      type: "eliminate",
      detail: `结婚择日避开黑道日；本日天神${day.dayTianShen || "未识别"}，类型${day.dayTianShenType}`,
    });
  } else {
    scoreBreakdown.push({
      label: "黑道日",
      points: 0,
      type: "info",
      detail: `本日天神${day.dayTianShen || "未识别"}，类型${day.dayTianShenType || "未识别"}，未判为黑道`,
    });
  }

  const boundary = getSeasonBoundaryAvoidance(day.date);
  if (boundary) {
    score -= 100;
    eliminated = true;
    cautions.push(`结婚避${boundary}`);
    scoreBreakdown.push({ label: "四绝四离", points: -100, type: "eliminate", detail: `结婚择日避开四绝、四离；${boundary}` });
  } else {
    scoreBreakdown.push({ label: "四绝四离", points: 0, type: "info", detail: "本日不是立春、立夏、立秋、立冬或春分、夏至、秋分、冬至前一日" });
  }

  if (WEDDING_EIGHT_SPECIAL_DAYS.has(day.dayGanZhi)) {
    score -= 100;
    eliminated = true;
    cautions.push(`八专日：${day.dayGanZhi}`);
    scoreBreakdown.push({
      label: "八专日",
      points: -100,
      type: "eliminate",
      detail: "结婚择日避开八专日：甲寅、乙卯、庚申、辛酉、戊戌、丁未、己未、癸丑",
    });
  } else {
    scoreBreakdown.push({ label: "八专日", points: 0, type: "info", detail: `${day.dayGanZhi}未命中八专日` });
  }

  if (day.dayZhi === "亥") {
    score -= 100;
    eliminated = true;
    cautions.push("亥日：结婚择日避开亥日");
    scoreBreakdown.push({ label: "亥日", points: -100, type: "eliminate", detail: "结婚择日表要求避开亥日，命中即淘汰" });
  } else {
    scoreBreakdown.push({ label: "亥日", points: 0, type: "info", detail: `本日${day.dayZhi}日，不是亥日` });
  }

  if (WEDDING_ABSOLUTE_YIN_DAYS.has(day.dayGanZhi)) {
    score -= 100;
    eliminated = true;
    cautions.push(`绝阴日：${day.dayGanZhi}`);
    scoreBreakdown.push({
      label: "绝阴日",
      points: -100,
      type: "eliminate",
      detail: "结婚择日避开绝阴日：甲寅、甲戌、辛未、己未、丙申、丁丑",
    });
  } else {
    scoreBreakdown.push({ label: "绝阴日", points: 0, type: "info", detail: `${day.dayGanZhi}未命中绝阴日` });
  }

  if (WEDDING_LONELY_BIRD_DAYS.has(day.dayGanZhi)) {
    score -= 100;
    eliminated = true;
    cautions.push(`孤鸾日：${day.dayGanZhi}`);
    scoreBreakdown.push({
      label: "孤鸾日",
      points: -100,
      type: "eliminate",
      detail: "结婚择日避开孤鸾日：甲寅、辛亥、戊申、丁巳、乙巳、壬子",
    });
  } else {
    scoreBreakdown.push({ label: "孤鸾日", points: 0, type: "info", detail: `${day.dayGanZhi}未命中孤鸾日` });
  }

  if (profile.fetalZhi && SIX_CLASH[profile.fetalZhi] === day.dayZhi) {
    score -= 100;
    eliminated = true;
    cautions.push(`冲女命胎元：女命胎元${profile.fetalGanZhi}，本日${day.dayZhi}日相冲`);
    scoreBreakdown.push({
      label: "胎元避冲",
      points: -100,
      type: "eliminate",
      detail: `胎元算法：出生月干加一、月支加三。女命出生月柱${profile.monthGanZhi}，胎元为${profile.fetalGanZhi}；胎元地支${profile.fetalZhi}与本日${day.dayZhi}六冲，结婚择日强避`,
    });
  } else {
    scoreBreakdown.push({
      label: "胎元避冲",
      points: 0,
      type: "info",
      detail: profile.fetalGanZhi
        ? `女命出生月柱${profile.monthGanZhi}，胎元${profile.fetalGanZhi}；本日${day.dayZhi}日未冲胎元地支${profile.fetalZhi}`
        : `未能识别女命出生月柱，暂无法计算胎元`,
    });
  }

  if (groomProfile.fetalZhi && SIX_CLASH[groomProfile.fetalZhi] === day.dayZhi) {
    score -= 100;
    eliminated = true;
    cautions.push(`冲男方胎元：男方胎元${groomProfile.fetalGanZhi}，本日${day.dayZhi}日相冲`);
    scoreBreakdown.push({
      label: "男方胎元避冲",
      points: -100,
      type: "eliminate",
      detail: `胎元算法：出生月干加一、月支加三。男方出生月柱${groomProfile.monthGanZhi}，胎元为${groomProfile.fetalGanZhi}；胎元地支${groomProfile.fetalZhi}与本日${day.dayZhi}六冲，结婚择日强避`,
    });
  } else {
    scoreBreakdown.push({
      label: "男方胎元避冲",
      points: 0,
      type: "info",
      detail: groomProfile.fetalGanZhi
        ? `男方出生月柱${groomProfile.monthGanZhi}，胎元${groomProfile.fetalGanZhi}；本日${day.dayZhi}日未冲男方胎元地支${groomProfile.fetalZhi}`
        : `未能识别男方出生月柱，暂无法计算胎元`,
    });
  }

  const forbiddenXiongSha = WEDDING_FORBIDDEN_DAY_XIONG_SHA.filter((name) => day.dayXiongSha.some((star) => star.includes(name)));
  if (forbiddenXiongSha.length > 0) {
    score -= 100;
    eliminated = true;
    cautions.push(`结婚忌神：${forbiddenXiongSha.join("、")}`);
    scoreBreakdown.push({
      label: "天罡河魁等忌神",
      points: -100,
      type: "eliminate",
      detail: `结婚择日忌天罡、河魁、厌对、招摇；本日凶神宜忌命中${forbiddenXiongSha.join("、")}`,
    });
  } else {
    scoreBreakdown.push({
      label: "天罡河魁等忌神",
      points: 0,
      type: "info",
      detail: `本日凶神宜忌：${day.dayXiongSha.join("、") || "未识别"}；未命中天罡、河魁、厌对、招摇`,
    });
  }

  const majorStars = day.dayJiShen.filter((star) => MAJOR_AUSPICIOUS_STARS.has(star));
  if (majorStars.length > 0) {
    const points = majorStars.length * 10;
    score += points;
    reasons.push(`四大吉神：${majorStars.join("、")}`);
    scoreBreakdown.push({
      label: "四大吉神",
      points,
      type: "bonus",
      detail: `天德、月德、天德合、月德合为四大吉神；本日命中${majorStars.join("、")}`,
    });
  } else {
    scoreBreakdown.push({
      label: "四大吉神",
      points: 0,
      type: "info",
      detail: `本日吉神为${day.dayJiShen.join("、") || "未识别"}，未命中天德、月德、天德合、月德合`,
    });
  }

  if (reasons.length === 0) {
    reasons.push("未命中结婚专用加分项");
  }
  return {
    ...day,
    score: roundScore(score),
    reasons,
    cautions,
    scoreBreakdown,
    recommendedHours: getWeddingRecommendedHours(day, input),
    remedies: [],
    eliminated,
  };
}

export function scoreMovingDay(day: AlmanacDay, input: DateInput): ScoredDay {
  const profile = getMovingBirthProfile(input);
  let score = 60;
  let eliminated = false;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const remedies: string[] = [];
  const sanSha = getSanShaByBranch(day.yearZhi);
  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      label: "基础分",
      points: 60,
      type: "base",
      detail: "乔迁规则起评分；本规则不看黄历宜忌里的入宅、移徙、安床",
    },
  ];

  const yearMonth = relationText(day.yearZhi, day.monthZhi);
  addInfo(scoreBreakdown, "年-月五行", yearMonth);
  const monthDay = relationText(day.monthZhi, day.dayZhi);
  if (monthDay.type === "control") {
    score -= 12;
    cautions.push(`月日五行相克：${monthDay.text}`);
    scoreBreakdown.push({ label: "月日相邻", points: -12, type: "penalty", detail: `${monthDay.text}；相邻五行相克只作扣分提醒，不作强避淘汰` });
  } else if (monthDay.type === "generate") {
    score += 8;
    reasons.push(`月日五行相生：${monthDay.text}`);
    scoreBreakdown.push({ label: "月日相邻", points: 8, type: "bonus", detail: monthDay.text });
  } else {
    addInfo(scoreBreakdown, "月日相邻", monthDay);
  }

  if (SIX_CLASH[day.monthZhi] === day.dayZhi) {
    score -= 100;
    eliminated = true;
    cautions.push(`月破：月支${day.monthZhi}冲日支${day.dayZhi}`);
    scoreBreakdown.push({
      label: "月破",
      points: -100,
      type: "eliminate",
      detail: `候选日地支${day.dayZhi}冲当月月支${day.monthZhi}，按当前规则强避淘汰；金符九星不能覆盖月破`,
    });
  } else {
    scoreBreakdown.push({
      label: "月破",
      points: 0,
      type: "info",
      detail: `月支${day.monthZhi}与日支${day.dayZhi}未见六冲`,
    });
  }

  if (SIX_CLASH[day.yearZhi] === day.dayZhi) {
    score -= 35;
    eliminated = true;
    cautions.push(`年日地支六冲：${day.yearZhi}冲${day.dayZhi}`);
    scoreBreakdown.push({
      label: "不相邻六冲",
      points: -35,
      type: "eliminate",
      detail: `年支${day.yearZhi}与日支${day.dayZhi}六冲，按文档例子淘汰`,
    });
  } else {
    scoreBreakdown.push({
      label: "不相邻六冲",
      points: 0,
      type: "info",
      detail: `年支${day.yearZhi}与日支${day.dayZhi}未见六冲`,
    });
  }

  if (SIX_CLASH[profile.dayZhi] === day.dayZhi) {
    score -= 100;
    eliminated = true;
    cautions.push(`相主日柱六冲：命主日支${profile.dayZhi}冲本日${day.dayZhi}`);
    scoreBreakdown.push({
      label: "相主日柱",
      points: -100,
      type: "eliminate",
      detail: `以命主日柱为主，绝不可选六冲日；命主日支${profile.dayZhi}，本日${day.dayZhi}，${profile.dayZhi}冲${day.dayZhi}`,
    });
  } else {
    scoreBreakdown.push({
      label: "相主日柱",
      points: 0,
      type: "info",
      detail: `命主日支${profile.dayZhi}与本日${day.dayZhi}未见六冲`,
    });
  }

  if (SIX_CLASH[profile.yearZhi] === day.dayZhi) {
    score -= 8;
    cautions.push(`客户生肖六冲：命主年支${profile.yearZhi}冲本日${day.dayZhi}`);
    scoreBreakdown.push({
      label: "客户生肖六冲",
      points: -8,
      type: "penalty",
      detail: `客户生肖年支${profile.yearZhi}与本日${day.dayZhi}六冲；择日六冲规则会按强避淘汰`,
    });
  }

  const clientTrinityGroup = getTrinityGroupByBranch(profile.dayZhi);
  const sameClientTrinity = clientTrinityGroup?.branches.includes(day.dayZhi) && profile.dayZhi !== day.dayZhi;
  const sameClientTrinityForHarmful = Boolean(clientTrinityGroup?.branches.includes(day.dayZhi));
  const birthHarmfulHits = getBirthDayBranchHits(profile, THREE_MISFORTUNES_SIX_HARMS);
  const birthAuspiciousHits = getBirthStemBranchHits(profile, THREE_AUSPICIOUS_SIX_BEAUTIES);
  const drainGroup = clientTrinityGroup ? getTrinityGroupByElement(GENERATES[clientTrinityGroup.element]) : undefined;
  const consumeGroup = clientTrinityGroup ? getTrinityGroupByElement(CONTROLS[clientTrinityGroup.element]) : undefined;

  if (birthHarmfulHits.length > 0 && sameClientTrinityForHarmful) {
    score -= 100;
    eliminated = true;
    cautions.push(`三凶六害三合不取：客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，本日${day.dayZhi}与客户日支同局，需转看耗泄`);
    scoreBreakdown.push({
      label: "三凶六害取用",
      points: -100,
      type: "eliminate",
      detail: `三凶六害的三合不取，以客户日支为准。客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，属${clientTrinityGroup?.label}（${clientTrinityGroup?.element}局），本日${day.dayZhi}同局，包括同一个地支也不取三合；应转看泄局${drainGroup?.branches.join("、") || "未识别"}或耗局${consumeGroup?.branches.join("、") || "未识别"}`,
    });
  } else if (birthHarmfulHits.length > 0) {
    if (drainGroup?.branches.includes(day.dayZhi)) {
      reasons.push(`三凶六害取泄局：${clientTrinityGroup?.element}生${drainGroup.element}，取${day.dayZhi}日`);
      scoreBreakdown.push({
        label: "三凶六害取用",
        points: 0,
        type: "info",
        detail: `客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，不取同局三合，转看耗泄。客户日支属${clientTrinityGroup?.label}（${clientTrinityGroup?.element}局），${clientTrinityGroup?.element}生${drainGroup.element}为泄，本日${day.dayZhi}属${drainGroup.label}，可作泄局取用`,
      });
    } else if (consumeGroup?.branches.includes(day.dayZhi)) {
      reasons.push(`三凶六害取耗局：${clientTrinityGroup?.element}克${consumeGroup.element}，取${day.dayZhi}日`);
      scoreBreakdown.push({
        label: "三凶六害取用",
        points: 0,
        type: "info",
        detail: `客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，不取同局三合，转看耗泄。客户日支属${clientTrinityGroup?.label}（${clientTrinityGroup?.element}局），${clientTrinityGroup?.element}克${consumeGroup.element}为耗，本日${day.dayZhi}属${consumeGroup.label}，可作耗局取用`,
      });
    } else {
      scoreBreakdown.push({
        label: "三凶六害取用",
        points: 0,
        type: "info",
        detail: `客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，不取同局三合，宜转看泄局${drainGroup?.branches.join("、") || "未识别"}或耗局${consumeGroup?.branches.join("、") || "未识别"}；本日${day.dayZhi}未命中泄局或耗局`,
      });
    }
  } else if (clientTrinityGroup?.branches.includes(day.dayZhi) && profile.dayZhi !== day.dayZhi) {
    if (birthAuspiciousHits.length > 0) {
      reasons.push(`三合可用：生日日柱${profile.dayGanZhi}命中${birthAuspiciousHits.join("、")}，本日同属${clientTrinityGroup.label}`);
      scoreBreakdown.push({
        label: "三合取用",
        points: 0,
        type: "info",
        detail: `三吉六秀、三凶六害不单独加分减分，只用于判断三合、耗、泄、克是否可用。出生日柱${profile.dayGanZhi}命中${birthAuspiciousHits.join("、")}，生日日支${profile.dayZhi}与本日${day.dayZhi}同属${clientTrinityGroup.label}，可按三合取用`,
      });
    } else {
      scoreBreakdown.push({
        label: "三合取用",
        points: 0,
        type: "info",
        detail: `生日日支${profile.dayZhi}与本日${day.dayZhi}同属${clientTrinityGroup.label}，但出生日柱${profile.dayGanZhi}未命中三吉六秀；本项只作判断，不扣分`,
      });
    }
  }

  const auspiciousSix = getWeightedStemBranchMatches(day, THREE_AUSPICIOUS_SIX_BEAUTIES, 0);
  const harmfulSix = getWeightedStemBranchMatches(day, THREE_MISFORTUNES_SIX_HARMS, 0);
  if (auspiciousSix.matches.length > 0) {
    scoreBreakdown.push({
      label: "三吉六秀",
      points: 0,
      type: "info",
      detail: `三吉六秀取甲、己、庚、辰、丑、亥、酉、丙、丁；本日${day.dayGanZhi}命中${auspiciousSix.matches.join("、")}。本项只作判断，不加分也不减分`,
    });
  } else {
    scoreBreakdown.push({
      label: "三吉六秀",
      points: 0,
      type: "info",
      detail: `三吉六秀取甲、己、庚、辰、丑、亥、酉、丙、丁；本日${day.dayGanZhi}未命中`,
    });
  }

  if (harmfulSix.matches.length > 0) {
    scoreBreakdown.push({
      label: "三凶六害",
      points: 0,
      type: "info",
      detail: `三凶六害取寅、卯、乙、未、申、辛、戌、壬、癸；本日${day.dayGanZhi}命中${harmfulSix.matches.join("、")}。本项不单独加分或减分；三合是否可用以客户日支为准`,
    });
  } else {
    scoreBreakdown.push({
      label: "三凶六害",
      points: 0,
      type: "info",
      detail: `三凶六害取寅、卯、乙、未、申、辛、戌、壬、癸；本日${day.dayGanZhi}未命中。本项不单独加分或减分`,
    });
  }

  const birthSanSha = getBirthSanShaDay(day, profile);
  if (birthSanSha.points !== 0) {
    score += birthSanSha.points;
    if (birthSanSha.eliminate) {
      eliminated = true;
    }
    cautions.push(birthSanSha.detail);
    scoreBreakdown.push({
      label: "命主三煞日",
      points: birthSanSha.points,
      type: birthSanSha.eliminate ? "eliminate" : "penalty",
      detail: birthSanSha.detail,
    });
  } else {
    scoreBreakdown.push({
      label: "命主三煞日",
      points: 0,
      type: "info",
      detail: `按客户年支${profile.yearZhi}、日支${profile.dayZhi}取对岸三合局为命主三煞；日支、时支命中强避，年支、月支命中只作小幅扣分。本日${day.dayZhi}未命中命主三煞日`,
    });
  }

  scoreBreakdown.push({
    label: "流年三煞参考",
    points: 0,
    type: "info",
    detail: sanSha
      ? `${day.yearZhi}年${sanSha.label}，三煞方在${sanSha.direction}，仅作背景参考；正式三煞日以客户年支、日支另判`
      : "未识别流年三煞规则",
  });

  if (TEN_BAD_DAYS.has(day.dayGanZhi)) {
    eliminated = true;
    cautions.push(`十恶日：${day.dayGanZhi}`);
    scoreBreakdown.push({ label: "十恶日", points: -100, type: "eliminate", detail: `${day.dayGanZhi}在不可选用日列表中` });
  }

  if (YANG_GONG_AVOID_DAYS.has(`${day.lunarMonth}-${day.lunarDay}`)) {
    eliminated = true;
    cautions.push(`杨公忌日：农历${day.lunarText}`);
    scoreBreakdown.push({ label: "杨公忌日", points: -100, type: "eliminate", detail: `农历${day.lunarText}为杨公忌日，不可选` });
  }

  const redSandBranch = RED_SAND_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (redSandBranch && day.dayZhi === redSandBranch) {
    score -= 100;
    eliminated = true;
    cautions.push(`红砂日：农历${day.lunarMonth}月遇${day.dayZhi}日`);
    scoreBreakdown.push({
      label: "红砂日",
      points: -100,
      type: "eliminate",
      detail: `规则：1/4/7/10月酉日，2/5/8/11月巳日，3/6/9/12月丑日；本日农历${day.lunarMonth}月${day.dayZhi}日命中，按当前规则强避淘汰`,
    });
  }

  const funeralSha = getThreeFuneralSha(day);
  if (funeralSha) {
    score -= 35;
    cautions.push(`三丧煞：${funeralSha}`);
    scoreBreakdown.push({
      label: "三丧煞",
      points: -35,
      type: "penalty",
      detail: `${funeralSha}；按日课统计表，乔迁/入宅择日宜避`,
    });
  } else {
    scoreBreakdown.push({
      label: "三丧煞",
      points: 0,
      type: "info",
      detail: "未命中春辰、夏未、秋戌、冬丑三丧煞",
    });
  }

  const bigDefeat = getYearBigDefeat(day);
  if (bigDefeat) {
    score -= 100;
    eliminated = true;
    cautions.push(`年大败日：${bigDefeat}`);
    scoreBreakdown.push({
      label: "年大败日",
      points: -100,
      type: "eliminate",
      detail: `${bigDefeat}；表中说明年大败与十恶日同时出现绝对不可`,
    });
  }

  const buildStar = getBuildStarAssessment(day);
  score += buildStar.points;
  if (buildStar.points > 0) {
    reasons.push(`建除十二神：${day.zhiXing}${buildStar.name}`);
  } else if (buildStar.points < 0) {
    cautions.push(`建除十二神：${day.zhiXing}${buildStar.name}`);
  }
  scoreBreakdown.push({
    label: "建除十二神",
    points: buildStar.points,
    type: buildStar.points > 0 ? "bonus" : buildStar.points < 0 ? "penalty" : "info",
    detail: buildStar.detail,
  });

  if (BIG_REPAIR_DAYS.has(day.dayGanZhi)) {
    score += GOOD_TIER_TWO_POINTS;
    reasons.push(`大偷修日：${day.dayGanZhi}`);
    scoreBreakdown.push({
      label: "造修/入宅择日",
      points: GOOD_TIER_TWO_POINTS,
      type: "bonus",
      detail: `${day.dayGanZhi}为大偷修日，列入好日子第二梯队；乔迁若兼装修修造可参考，建房修造时权重更高`,
    });
  } else if (MINOR_REPAIR_TRAVEL_DAYS[day.dayGanZhi]) {
    score += GOOD_TIER_TWO_POINTS - 4;
    reasons.push(`小偷修日：${day.dayGanZhi}${MINOR_REPAIR_TRAVEL_DAYS[day.dayGanZhi]}`);
    scoreBreakdown.push({
      label: "造修/入宅择日",
      points: GOOD_TIER_TWO_POINTS - 4,
      type: "bonus",
      detail: `${day.dayGanZhi}为小偷修日，${MINOR_REPAIR_TRAVEL_DAYS[day.dayGanZhi]}；按最新权重列入第二梯队，建房修造时权重上升`,
    });
  } else {
    scoreBreakdown.push({
      label: "造修/入宅择日",
      points: 0,
      type: "info",
      detail: "未命中大偷修日或小偷修日",
    });
  }

  const boundary = getSeasonBoundaryAvoidance(day.date);
  if (boundary) {
    eliminated = true;
    cautions.push(boundary);
    scoreBreakdown.push({ label: "四绝四离", points: -100, type: "eliminate", detail: boundary });
  }

  const resolverStars = getAuspiciousResolverStars(day);
  if (resolverStars.length > 0) {
    const points = resolverStars.reduce((sum, star) => sum + getResolverStarPoints(star), 0);
    score += points;
    reasons.push(`化解神煞吉曜：${resolverStars.join("、")}`);
    scoreBreakdown.push({
      label: "天德/月德",
      points,
      type: "bonus",
      detail: `命中：${resolverStars.join("、")}；天德、月德列入第一梯队，天德合、月德合列入第二梯队`,
    });
  } else {
    scoreBreakdown.push({ label: "天德/月德", points: 0, type: "info", detail: `按${day.monthZhi}月表未命中天德、天德合、月德、月德合` });
  }

  const goldSymbolStar = getGoldSymbolStar(day);
  if (goldSymbolStar) {
    if (GOLD_SYMBOL_AUSPICIOUS.has(goldSymbolStar.star)) {
      const points = GOOD_TIER_FOUR_POINTS;
      score += points;
      reasons.push(`金符九星辅助吉星：${goldSymbolStar.star}`);
      scoreBreakdown.push({
        label: "金符九星",
        points,
        type: "bonus",
        detail: `${goldSymbolStar.detail}。${GOLD_SYMBOL_STAR_DETAILS[goldSymbolStar.star]}；金符九星吉星列入第四梯队，只在大忌已避开后锦上添花`,
      });
    } else {
      const points = GOLD_SYMBOL_MAJOR_INAUSPICIOUS.has(goldSymbolStar.star) ? -20 : -8;
      score += points;
      cautions.push(`金符九星值${goldSymbolStar.star}，正式乔迁慎用`);
      scoreBreakdown.push({
        label: "金符九星",
        points,
        type: "penalty",
        detail: `${goldSymbolStar.detail}。${GOLD_SYMBOL_STAR_DETAILS[goldSymbolStar.star]}`,
      });
    }
  } else {
    scoreBreakdown.push({
      label: "金符九星",
      points: 0,
      type: "info",
      detail: "未能识别日干支或农历月份，无法推算金符九星",
    });
  }

  const luClashesDayPillar = profile.luBranch ? SIX_CLASH[profile.dayZhi] === profile.luBranch : false;
  const luHits = getLuPillarHits(day, profile.luBranch);
  if (profile.luBranch && day.dayZhi === profile.luBranch && luClashesDayPillar) {
    score -= 60;
    eliminated = true;
    cautions.push(`禄神冲命主日柱：${profile.yearGan}禄在${profile.luBranch}，但命主日支${profile.dayZhi}冲${profile.luBranch}`);
    scoreBreakdown.push({
      label: "有禄",
      points: -60,
      type: "eliminate",
      detail: `一禄抵万财，但禄神与日柱相冲不可选禄日；可考虑${profile.luBranch}月或${profile.luBranch}时，不选${profile.luBranch}日`,
    });
  } else if (profile.luBranch && luHits.points > 0) {
    score += luHits.points;
    reasons.push(`有禄：${profile.yearGan}禄在${profile.luBranch}，${luHits.hits.join("、")}`);
    scoreBreakdown.push({
      label: "有禄",
      points: luHits.points,
      type: "bonus",
      detail: `相主规则：四柱八字有一个禄都说明有禄；生日年干${profile.yearGan}，禄在${profile.luBranch}，本课命中${luHits.hits.join("、")}`,
    });
  } else {
    scoreBreakdown.push({
      label: "有禄",
      points: 0,
      type: "info",
      detail: profile.luBranch
        ? `生日年干${profile.yearGan}禄在${profile.luBranch}；本课年${day.yearZhi}、月${day.monthZhi}、日${day.dayZhi}未见禄${luClashesDayPillar ? `；且禄支${profile.luBranch}冲命主日支${profile.dayZhi}，不宜取禄日，可取禄月/禄时` : ""}`
        : "未识别生日年干禄位",
    });
  }

  if (profile.wealthBranches.includes(day.dayZhi)) {
    score += GOOD_TIER_TWO_POINTS;
    reasons.push(`有财：${profile.wealthBaseGroupLabel}，${profile.wealthBaseElement}克${profile.wealthElement}为财，取${profile.wealthBranches.join("、")}日`);
    scoreBreakdown.push({
      label: "有财",
      points: GOOD_TIER_TWO_POINTS,
      type: "bonus",
      detail: `生日日支${profile.dayZhi}入${profile.wealthBaseGroupLabel}，${profile.wealthBaseElement}克${profile.wealthElement}为财；本日${day.dayZhi}入${profile.wealthBranches.join("、")}财局，列入第二梯队`,
    });
  } else {
    scoreBreakdown.push({
      label: "有财",
      points: 0,
      type: "info",
      detail: profile.wealthBranches.length
        ? `生日日支${profile.dayZhi}入${profile.wealthBaseGroupLabel}，${profile.wealthBaseElement}克${profile.wealthElement}为财，财支为${profile.wealthBranches.join("、")}；本日为${day.dayZhi}`
        : `当前规则未定义${profile.wealthElement || "空"}财取日；生日${profile.dayGanZhi || "空"}，日支${profile.dayZhi || "空"}，所属三合局为${profile.wealthBaseGroupLabel || "空"}`,
    });
  }

  const mountainAssessment = getMountainAssessment(day, input.mountainBranch);
  if (mountainAssessment.enabled) {
    score += mountainAssessment.points;
    if (mountainAssessment.points > 0) {
      reasons.push(`抉山坐山得数：${mountainAssessment.sequence}`);
    }
    if (mountainAssessment.cautions.length > 0) {
      cautions.push(...mountainAssessment.cautions);
    }
    if (mountainAssessment.eliminate) {
      eliminated = true;
    }
    scoreBreakdown.push({
      label: "抉山",
      points: mountainAssessment.points,
      type: mountainAssessment.eliminate ? "eliminate" : mountainAssessment.points >= 0 ? "bonus" : "penalty",
      detail: mountainAssessment.detail,
    });
  } else {
    scoreBreakdown.push({
      label: "抉山",
      points: 0,
      type: "info",
      detail: "未填写新宅坐山，本次不启用抉山规则",
    });
  }

  const formations = getFormationBonuses(day);
  if (formations.length > 0) {
    for (const formation of formations) {
      score += formation.points;
      reasons.push(`成格局优先：${formation.name}`);
      scoreBreakdown.push({
        label: "成格局优先",
        points: formation.points,
        type: "bonus",
        detail: formation.detail,
      });
    }
  } else {
    scoreBreakdown.push({
      label: "成格局优先",
      points: 0,
      type: "info",
      detail: `年柱${day.yearGanZhi}、月柱${day.monthGanZhi}、日柱${day.dayGanZhi}未形成可识别格局；坐山取用与择时补格待补充`,
    });
  }

  if (FORTUNE_CHANGE_DAYS.has(day.dayGanZhi)) {
    score += 8;
    reasons.push(`文档例示佳日：${day.dayGanZhi}`);
    scoreBreakdown.push({ label: "例示佳日", points: 8, type: "bonus", detail: "文档例子列出己巳、己酉、己丑为佳" });
  }

  if (reasons.length === 0) {
    reasons.push("本日没有特别突出的加分项，但也没有发现必须避开的重点问题");
  }

  return {
    ...day,
    score: roundScore(score),
    reasons,
    cautions,
    scoreBreakdown,
    recommendedHours: getRecommendedHours(day, [], input.mountainBranch, profile.luBranch, input),
    remedies: [...new Set(remedies)],
    eliminated,
  };
}

export function scoreDemolitionDay(day: AlmanacDay, input?: DateInput): ScoredDay {
  let score = 50;
  let eliminated = false;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    { label: "基础分", points: 50, type: "base", detail: "拆房规则起评分；按案例不套用乔迁入宅规则" },
  ];

  const zhiXing = day.zhiXing.replace("日", "");
  if (zhiXing === "破") {
    const breakDayPoints = Math.max(0, DEMOLITION_BREAK_DAY_TARGET_SCORE - score);
    score += breakDayPoints;
    reasons.push("拆房第一梯队：破日");
    scoreBreakdown.push({
      label: "拆房第一梯队",
      points: breakDayPoints,
      type: "bonus",
      detail: `拆房规则首选破日，列为强推；直接抬至${DEMOLITION_BREAK_DAY_TARGET_SCORE}分档`,
    });
  } else {
    scoreBreakdown.push({
      label: "拆房第一梯队",
      points: 0,
      type: "info",
      detail: `${zhiXing || "未识别"}日；拆房首选破日，本日不列入破日第一梯队`,
    });
  }

  const redSandBranch = RED_SAND_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (redSandBranch && day.dayZhi === redSandBranch) {
    score -= 100;
    eliminated = true;
    cautions.push(`红砂日：农历${day.lunarMonth}月遇${day.dayZhi}日`);
    scoreBreakdown.push({ label: "红砂日", points: -100, type: "eliminate", detail: "案例规则：拆房避开红砂日，命中即淘汰" });
  }

  const earthSymbolBranch = EARTH_SYMBOL_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (earthSymbolBranch && day.dayZhi === earthSymbolBranch) {
    score -= 100;
    eliminated = true;
    cautions.push(`土符日：农历${day.lunarMonth}月遇${day.dayZhi}日`);
    scoreBreakdown.push({ label: "土符日", points: -100, type: "eliminate", detail: "案例规则：拆房避开土符日，命中即淘汰" });
  }

  const earthMansionBranch = EARTH_MANSION_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (earthMansionBranch && day.dayZhi === earthMansionBranch) {
    score -= 100;
    eliminated = true;
    cautions.push(`土府日：农历${day.lunarMonth}月遇${day.dayZhi}日`);
    scoreBreakdown.push({ label: "土府日", points: -100, type: "eliminate", detail: "案例规则：拆房避开土府日，命中即淘汰" });
  }

  if (BIG_REPAIR_DAYS.has(day.dayGanZhi)) {
    score += 18;
    reasons.push(`次选大偷修日：${day.dayGanZhi}`);
    scoreBreakdown.push({ label: "大偷修日", points: 18, type: "bonus", detail: "案例规则：拆房次选大偷修日" });
  }

  if (reasons.length === 0) {
    reasons.push("未命中破日或大偷修日，本日未见明显忌用项，可作为备选再复核");
  }
  const finalScore = eliminated ? score : Math.min(100, score);
  return {
    ...day,
    score: roundScore(finalScore),
    reasons,
    cautions,
    scoreBreakdown,
    recommendedHours: getGeneralRecommendedHours(day, input),
    remedies: [],
    eliminated,
  };
}

export function applyDemolitionHardAvoidance(scored: ScoredDay, input?: DateInput) {
  applyHostSameDayPillar(scored, input);
  applySelectionSixClashes(scored, input);
  applyCourseBranchClashes(scored);
  applyRepeatedDayAvoidance(scored);

  if (input) {
    const profile = getMovingBirthProfile(input);
    const birthSanSha = getBirthSanShaDay(scored, profile);
    if (birthSanSha.points !== 0) {
      scored.score += birthSanSha.points;
      if (birthSanSha.eliminate) {
        scored.eliminated = true;
      }
      scored.cautions.push(birthSanSha.detail);
      scored.scoreBreakdown.push({
        label: "命主三煞日",
        points: birthSanSha.points,
        type: birthSanSha.eliminate ? "eliminate" : "penalty",
        detail: birthSanSha.eliminate
          ? `${birthSanSha.detail}；拆房破日也不可覆盖此项强避`
          : birthSanSha.detail,
      });
    }
  }

  const sanSha = getSanShaByBranch(scored.yearZhi);
  scored.scoreBreakdown.push({
    label: "流年三煞参考",
    points: 0,
    type: "info",
    detail: sanSha
      ? `${scored.yearZhi}年${sanSha.label}，三煞方在${sanSha.direction}，仅作背景参考；拆房命主三煞仍以客户年支、日支另判`
      : "未识别流年三煞规则",
  });

  if (TEN_BAD_DAYS.has(scored.dayGanZhi)) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`十恶日：${scored.dayGanZhi}`);
    scored.scoreBreakdown.push({
      label: "十恶日",
      points: -100,
      type: "eliminate",
      detail: `${scored.dayGanZhi}在不可选用日列表中；拆房破日也不可覆盖`,
    });
  }

  if (YANG_GONG_AVOID_DAYS.has(`${scored.lunarMonth}-${scored.lunarDay}`)) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`杨公忌日：农历${scored.lunarText}`);
    scored.scoreBreakdown.push({
      label: "杨公忌日",
      points: -100,
      type: "eliminate",
      detail: `农历${scored.lunarText}为杨公忌日；拆房破日也不可覆盖`,
    });
  }

  const bigDefeat = getYearBigDefeat(scored);
  if (bigDefeat) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`年大败日：${bigDefeat}`);
    scored.scoreBreakdown.push({
      label: "年大败日",
      points: -100,
      type: "eliminate",
      detail: `${bigDefeat}；拆房破日也不可覆盖`,
    });
  }

  const boundary = getSeasonBoundaryAvoidance(scored.date);
  if (boundary) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(boundary);
    scored.scoreBreakdown.push({
      label: "四绝四离",
      points: -100,
      type: "eliminate",
      detail: `${boundary}；拆房破日也不可覆盖`,
    });
  }

  const goldSpirit = getGoldSpiritFlags(scored);
  scored.scoreBreakdown.push({
    label: "金神日",
    points: 0,
    type: "info",
    detail: goldSpirit.length > 0
      ? `拆房规则：金神日不作为拆房强避。本日见${goldSpirit.join("；")}，仅作复核提示`
      : `日柱${scored.dayGanZhi}、年干${scored.yearGan}日支${scored.dayZhi}、二十八宿${scored.xiu}${scored.xiuAnimal}未见金神日`,
  });

  scored.score = roundScore(scored.score);
  return scored;
}

export function scoreEnshrinementDay(day: AlmanacDay, input?: DateInput): ScoredDay {
  let score = 50;
  let eliminated = false;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    { label: "基础分", points: 50, type: "base", detail: "请神、安神、进祠规则起评分；先看坐/睡/吊，再看安神杀煞" },
  ];

  const sitMark = getEnshrinementSitMark(day);
  if (sitMark.mark === "坐") {
    score += 40;
    reasons.push(`请神安神进祠日：农历${day.lunarMonth}月${day.lunarDay}日数到坐`);
    scoreBreakdown.push({
      label: "坐睡吊表",
      points: 40,
      type: "bonus",
      detail: `${sitMark.detail}；数到“坐”能用，列为优先`,
    });
  } else {
    score -= 100;
    eliminated = true;
    cautions.push(`请神安神进祠不可用：数到${sitMark.mark || "未识别"}`);
    scoreBreakdown.push({
      label: "坐睡吊表",
      points: -100,
      type: "eliminate",
      detail: `${sitMark.detail}；文档规则：数到“坐”能用，其它都不可，强避淘汰`,
    });
  }

  const protectiveSha = getProtectiveShaMark(day);
  if (protectiveSha.mark === "外") {
    score += 28;
    reasons.push("安神杀煞取外：最好");
    scoreBreakdown.push({
      label: "安神杀煞",
      points: 28,
      type: "bonus",
      detail: `${protectiveSha.detail}；选“外”最好`,
    });
  } else if (protectiveSha.mark === "村") {
    score += 12;
    reasons.push("安神杀煞取村：次选");
    scoreBreakdown.push({
      label: "安神杀煞",
      points: 12,
      type: "bonus",
      detail: `${protectiveSha.detail}；“村”代表小区或村里其他人，次选`,
    });
  } else {
    score -= 100;
    eliminated = true;
    cautions.push(`安神杀煞不可用：取${protectiveSha.mark || "未识别"}`);
    scoreBreakdown.push({
      label: "安神杀煞",
      points: -100,
      type: "eliminate",
      detail: `${protectiveSha.detail}；文档规则：绝不能选“主”和“师”，强避淘汰`,
    });
  }

  return {
    ...day,
    score: roundScore(score),
    reasons,
    cautions,
    scoreBreakdown,
    recommendedHours: getGeneralRecommendedHours(day, input),
    remedies: [],
    eliminated,
  };
}

export function applyUniversalHostTrinityControl(scored: ScoredDay, input: DateInput) {
  const profile = getMovingBirthProfile(input);
  const hostGroup = getTrinityGroupByBranch(profile.dayZhi);
  const dayGroup = getTrinityGroupByBranch(scored.dayZhi);
  if (!hostGroup || !dayGroup) {
    scored.scoreBreakdown.push({
      label: "三合局先筛",
      points: 0,
      type: "info",
      detail: `未能识别客户日支${profile.dayZhi || "空"}或本日${scored.dayZhi || "空"}所属三合局，无法做三合局生克筛选`,
    });
    return scored;
  }

  if (CONTROLS[dayGroup.element] === hostGroup.element) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`三合局不取：本日${scored.dayZhi}入${dayGroup.label}，${dayGroup.element}克客户${hostGroup.element}`);
    scored.scoreBreakdown.push({
      label: "三合局先筛",
      points: -100,
      type: "eliminate",
      detail: `适用于所有择日：先排除一定不能选的。客户日支${profile.dayZhi}属${hostGroup.label}（${hostGroup.element}局），本日${scored.dayZhi}属${dayGroup.label}（${dayGroup.element}局），${dayGroup.element}克${hostGroup.element}，不可选`,
    });
  } else {
    scored.scoreBreakdown.push({
      label: "三合局先筛",
      points: 0,
      type: "info",
      detail: `客户日支${profile.dayZhi}属${hostGroup.label}，本日${scored.dayZhi}属${dayGroup.label}，未形成候选日三合局克客户三合局`,
    });
  }

  applyUniversalHostPriority(scored, profile, hostGroup, dayGroup);

  scored.score = roundScore(scored.score);
  return scored;
}

export function applyUniversalDailyJudgments(scored: ScoredDay, input?: DateInput, includeXiu = true) {
  applyHostSameDayPillar(scored, input);
  applySelectionSixClashes(scored, input);
  applyCourseBranchClashes(scored);
  applyRepeatedDayAvoidance(scored);

  const goldSpirit = getGoldSpiritFlags(scored);
  if (goldSpirit.length > 0) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`金神日：${goldSpirit.join("；")}`);
    scored.scoreBreakdown.push({
      label: "金神日",
      points: -100,
      type: "eliminate",
      detail: `${goldSpirit.join("；")}。恢复金神日规则：正式大事不用金神日，命中强避淘汰`,
    });
  } else {
    scored.scoreBreakdown.push({
      label: "金神日",
      points: 0,
      type: "info",
      detail: `日柱${scored.dayGanZhi}未命中乙丑/己巳/癸酉；年干${scored.yearGan}、日支${scored.dayZhi}未命中年干金神表；二十八宿${scored.xiu}${scored.xiuAnimal}未命中亢金龙、牛金牛、娄金狗、鬼金羊`,
    });
  }

  if (includeXiu) {
    const xiuPoints = getXiuLuckPoints(scored.xiuLuck);
    scored.score += xiuPoints;
    if (xiuPoints > 0) {
      scored.reasons.push(`二十八星宿吉星：${scored.xiu}${scored.xiuAnimal}`);
    } else if (xiuPoints < 0) {
      scored.cautions.push(`二十八星宿凶星：${scored.xiu}${scored.xiuAnimal}`);
    }
    scored.scoreBreakdown.push({
      label: "二十八星宿",
      points: xiuPoints,
      type: xiuPoints > 0 ? "bonus" : xiuPoints < 0 ? "penalty" : "info",
      detail: `本日星宿：${scored.xiu || "未识别"}${scored.xiuAnimal || ""}，万年历判定：${scored.xiuLuck || "未识别"}。${XIU_LUCK_EXPLANATIONS[scored.xiuLuck] ?? "按二十八星宿吉凶表展示判断"}；吉星列入第四梯队，凶星作第四梯队辅助扣分`,
    });
  }

  const nayinDetails = getNayinTimeJudgments(scored);
  scored.scoreBreakdown.push({
    label: "六十甲子纳音吉凶表",
    points: 0,
    type: "info",
    detail: nayinDetails.length > 0
      ? nayinDetails.join("；")
      : `本日${scored.dayGanZhi}暂未录入图片可见行，或推荐时辰未匹配到表内时柱；此项只展示判断，不加减分`,
  });

  scored.score = roundScore(scored.score);
  return scored;
}

function applySelectionSixClashes(scored: ScoredDay, input?: DateInput) {
  if (!input) {
    return;
  }

  const profile = getMovingBirthProfile(input);
  const checks = [
    {
      name: "日支冲客户生肖",
      left: "客户生肖",
      branch: profile.yearZhi,
      hitDetail: `客户生肖年支${profile.yearZhi}，本日${scored.dayZhi}日，${profile.yearZhi}${scored.dayZhi}冲`,
      okDetail: `客户生肖年支${profile.yearZhi}与本日${scored.dayZhi}未见六冲`,
    },
    {
      name: "日支冲客户日支",
      left: "客户日支",
      branch: profile.dayZhi,
      hitDetail: `客户日支${profile.dayZhi}，本日${scored.dayZhi}日，${profile.dayZhi}${scored.dayZhi}冲`,
      okDetail: `客户日支${profile.dayZhi}与本日${scored.dayZhi}未见六冲`,
    },
  ];

  if ((input.purpose === "moving" || input.purpose === "construction") && input.mountainBranch) {
    if (isEarthlyBranch(input.mountainBranch)) {
      checks.push({
        name: "日支冲房屋坐山",
        left: "坐山",
        branch: input.mountainBranch,
        hitDetail: `房屋坐${input.mountainBranch}山，本日${scored.dayZhi}日，${input.mountainBranch}${scored.dayZhi}冲`,
        okDetail: `房屋坐${input.mountainBranch}山与本日${scored.dayZhi}未见六冲`,
      });
    } else {
      scored.scoreBreakdown.push({
        label: "择日六冲",
        points: 0,
        type: "info",
        detail: `房屋坐山为${input.mountainBranch}，不是十二地支山；本项暂不作坐山六冲判断`,
      });
    }
  }

  const hits = checks.filter((item) => item.branch && SIX_CLASH[item.branch] === scored.dayZhi);
  if (hits.length > 0) {
    scored.score -= 100;
    scored.eliminated = true;
    const hitText = hits.map((item) => `${item.name}：${item.hitDetail}`).join("；");
    scored.cautions.push(`择日六冲：${hitText}`);
    scored.scoreBreakdown.push({
      label: "择日六冲",
      points: -100,
      type: "eliminate",
      detail: `固定六冲为子午、丑未、寅申、卯酉、辰戌、巳亥。${hitText}`,
    });
    return;
  }

  const familyHits = getHouseholdFamilyClashes(scored, input);
  if (familyHits.length > 0) {
    const penalty = Math.min(60, familyHits.length * 18);
    scored.score -= penalty;
    const onsiteNotice = familyHits
      .flatMap((hit) => hit.notices)
      .join("、");
    const familyRulePrefix = input.purpose === "enshrinement"
      ? "请神安神进祠已兼顾家属生日"
      : input.purpose === "general"
        ? "通用择日已兼顾家属生日"
        : "乔迁、建房、动工以家主为核心，配偶、子女等家属为辅";
    scored.cautions.push(`家属避开现场：${onsiteNotice}之人请避开，当天不要在现场。`);
    scored.scoreBreakdown.push({
      label: "家属年柱日柱",
      points: -penalty,
      type: "penalty",
      detail: `${familyRulePrefix}；本日冲到${familyHits
        .map((hit) => hit.detail)
        .join("；")}。若家里人口较多无法完全避开，对应人员当天不要在现场`,
    });
  } else if (isHouseholdPurpose(input.purpose)) {
    const memberCount = getValidHouseholdFamilyProfiles(input).length;
    scored.scoreBreakdown.push({
      label: "家属年柱日柱",
      points: 0,
      type: "info",
      detail: memberCount > 0
        ? `已兼顾配偶、子女等家属${memberCount}人，本日未见家属年支或日支六冲`
        : "未填写配偶、子女等家属生日；本项暂不作家属避冲判断",
    });
  }

  scored.scoreBreakdown.push({
    label: "择日六冲",
    points: 0,
    type: "info",
    detail: checks.map((item) => item.okDetail).join("；"),
  });
}

function isHouseholdPurpose(purpose?: DateInput["purpose"]) {
  return purpose === "moving" || purpose === "construction" || purpose === "enshrinement" || purpose === "general";
}

function getValidHouseholdFamilyProfiles(input: DateInput) {
  if (!isHouseholdPurpose(input.purpose)) {
    return [];
  }

  return (input.familyMembers ?? []).flatMap((member, index) => {
    if (!member.birthDate) {
      return [];
    }
    const birthDate = getBirthSolarDate({
      birthCalendar: member.birthCalendar,
      birthDate: member.birthDate,
    });
    if (Number.isNaN(birthDate.getTime())) {
      return [];
    }
    const birthDay = getAlmanacDay(birthDate);
    return [{
      identity: member.name.trim() || member.relation || `家属${index + 1}`,
      relation: member.relation,
      yearZhi: birthDay.yearZhi,
      yearGanZhi: birthDay.yearGanZhi,
      dayZhi: birthDay.dayZhi,
      dayGanZhi: birthDay.dayGanZhi,
    }];
  });
}

function getHouseholdFamilyClashes(scored: ScoredDay, input: DateInput) {
  return getValidHouseholdFamilyProfiles(input).flatMap((member) => {
    const notices: string[] = [];
    const details: string[] = [];
    if (member.yearZhi && SIX_CLASH[member.yearZhi] === scored.dayZhi) {
      notices.push(`${member.identity}生肖${member.yearZhi}`);
      details.push(`${member.identity}年柱${member.yearGanZhi}，年支${member.yearZhi}与本日${scored.dayZhi}日相冲`);
    }
    if (member.dayZhi && SIX_CLASH[member.dayZhi] === scored.dayZhi) {
      notices.push(`${member.identity}日柱${member.dayGanZhi}`);
      details.push(`${member.identity}日柱${member.dayGanZhi}，日支${member.dayZhi}与本日${scored.dayZhi}日相冲`);
    }
    if (details.length === 0) {
      return [];
    }
    return [{
      notices,
      detail: details.join("；"),
    }];
  });
}

function applyRepeatedDayAvoidance(scored: ScoredDay) {
  const jianMonth = JIAN_MONTH_BY_MONTH_BRANCH[scored.monthZhi] ?? 0;
  const repeatedStem = REPEATED_DAY_STEM_BY_JIAN_MONTH[jianMonth] ?? "";
  if (!jianMonth || !repeatedStem) {
    scored.scoreBreakdown.push({
      label: "复日",
      points: 0,
      type: "info",
      detail: `未能以月柱${scored.monthGanZhi || "空"}识别建月，暂无法判断复日`,
    });
    return;
  }

  if (scored.dayGan === repeatedStem) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`复日：建${formatJianMonth(jianMonth)}月逢${repeatedStem}日`);
    scored.scoreBreakdown.push({
      label: "复日",
      points: -100,
      type: "eliminate",
      detail: `按复日表：正月甲、二月乙、三月戊、四月丙、五月丁、六月己、七月庚、八月辛、九月戊、十月壬、十一月癸、十二月己。当前月柱${scored.monthGanZhi}为建${formatJianMonth(jianMonth)}月，本日${scored.dayGanZhi}为${repeatedStem}日，正式乔迁、建房开工强避淘汰`,
    });
    return;
  }

  scored.scoreBreakdown.push({
    label: "复日",
    points: 0,
    type: "info",
    detail: `当前月柱${scored.monthGanZhi}为建${formatJianMonth(jianMonth)}月，复日取${repeatedStem}日；本日${scored.dayGanZhi}未命中`,
  });
}

function applyHostSameDayPillar(scored: ScoredDay, input?: DateInput) {
  if (!input) {
    return;
  }

  const profile = getMovingBirthProfile(input);
  if (!profile.dayGanZhi) {
    scored.scoreBreakdown.push({
      label: "日柱伏吟",
      points: 0,
      type: "info",
      detail: "未能识别客户日柱，无法判断是否日柱伏吟",
    });
    return;
  }

  if (profile.dayGanZhi === scored.dayGanZhi) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`日柱伏吟：客户为${profile.dayGanZhi}日柱，本日亦为${scored.dayGanZhi}日`);
    scored.scoreBreakdown.push({
      label: "日柱伏吟",
      points: -100,
      type: "eliminate",
      detail: `日柱伏吟列入第一梯队。自己的日柱与所择日柱相同即为日柱伏吟，主重复、停滞、反复、事情不爽快，按强避淘汰。客户日柱${profile.dayGanZhi}，本日${scored.dayGanZhi}日`,
    });
    return;
  }

  scored.scoreBreakdown.push({
    label: "日柱伏吟",
    points: 0,
    type: "info",
    detail: `客户日柱${profile.dayGanZhi}，本日${scored.dayGanZhi}日，未构成日柱伏吟`,
  });
}

function applyCourseBranchClashes(scored: ScoredDay) {
  const clashPairs = [
    { label: "年月相冲", leftName: "年支", left: scored.yearZhi, rightName: "月支", right: scored.monthZhi },
    { label: "年日相冲", leftName: "年支", left: scored.yearZhi, rightName: "日支", right: scored.dayZhi },
    { label: "月日相冲", leftName: "月支", left: scored.monthZhi, rightName: "日支", right: scored.dayZhi },
  ];
  const hits = clashPairs.filter((pair) => pair.left && pair.right && SIX_CLASH[pair.left] === pair.right);

  if (hits.length > 0) {
    scored.score -= 100;
    scored.eliminated = true;
    const hitText = hits.map((pair) => `${pair.label}：${pair.leftName}${pair.left}冲${pair.rightName}${pair.right}`).join("；");
    scored.cautions.push(`日课四柱六冲：${hitText}`);
    scored.scoreBreakdown.push({
      label: "日课四柱六冲",
      points: -100,
      type: "eliminate",
      detail: `年、月、日三柱内部出现六冲，按强避淘汰。${hitText}`,
    });
    return;
  }

  scored.scoreBreakdown.push({
    label: "日课四柱六冲",
    points: 0,
    type: "info",
    detail: `年支${scored.yearZhi}、月支${scored.monthZhi}、日支${scored.dayZhi}之间未见六冲`,
  });
}

function applyUniversalHostPriority(
  scored: ScoredDay,
  profile: MovingBirthProfile,
  hostGroup: NonNullable<ReturnType<typeof getTrinityGroupByBranch>>,
  dayGroup: NonNullable<ReturnType<typeof getTrinityGroupByBranch>>
) {
  if (scored.eliminated) {
    return;
  }
  const hostHarmonyBranch = SIX_HARMONY[profile.dayZhi];
  const birthHarmfulHits = getBirthDayBranchHits(profile, THREE_MISFORTUNES_SIX_HARMS);
  const drainGroup = getTrinityGroupByElement(GENERATES[hostGroup.element]);
  const consumeGroup = getTrinityGroupByElement(CONTROLS[hostGroup.element]);

  if (birthHarmfulHits.length > 0 && hostGroup.branches.includes(scored.dayZhi)) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`三凶六害三合不取：客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，本日${scored.dayZhi}与客户日支同局，需转看耗泄`);
    scored.scoreBreakdown.push({
      label: "三凶六害取用",
      points: -100,
      type: "eliminate",
      detail: `三凶六害的三合不取，以客户日支为准。客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，属${hostGroup.label}（${hostGroup.element}局），本日${scored.dayZhi}同局，包括同一个地支也不取三合；宜转看泄局${drainGroup?.branches.join("、") || "未识别"}或耗局${consumeGroup?.branches.join("、") || "未识别"}`,
    });
    return;
  }

  if (birthHarmfulHits.length > 0 && drainGroup?.branches.includes(scored.dayZhi)) {
    scored.score += 18;
    pushUnique(scored.reasons, `三凶六害取泄局：${hostGroup.element}生${drainGroup.element}，取${scored.dayZhi}日`);
    scored.scoreBreakdown.push({
      label: "三凶六害取用",
      points: 18,
      type: "bonus",
      detail: `客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，不取同局三合，转看耗泄。客户日支属${hostGroup.label}（${hostGroup.element}局），${hostGroup.element}生${drainGroup.element}为泄，本日${scored.dayZhi}属${drainGroup.label}，按泄局取用`,
    });
    return;
  }

  if (birthHarmfulHits.length > 0 && consumeGroup?.branches.includes(scored.dayZhi)) {
    scored.score += GOOD_TIER_TWO_POINTS;
    pushUnique(scored.reasons, `三凶六害取耗局：${hostGroup.element}克${consumeGroup.element}，取${scored.dayZhi}日`);
    scored.scoreBreakdown.push({
      label: "三凶六害取用",
      points: GOOD_TIER_TWO_POINTS,
      type: "bonus",
      detail: `客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，不取同局三合，转看耗泄。客户日支属${hostGroup.label}（${hostGroup.element}局），${hostGroup.element}克${consumeGroup.element}为耗，本日${scored.dayZhi}属${consumeGroup.label}，按耗局取用`,
    });
    return;
  }

  if (hostGroup.branches.includes(scored.dayZhi) && scored.dayZhi !== profile.dayZhi) {
    scored.score += GOOD_TIER_ONE_POINTS;
    scored.reasons.push(`此日与客户日支成三合：客户${profile.dayZhi}与本日${scored.dayZhi}同属${hostGroup.label}`);
    scored.scoreBreakdown.push({
      label: "三合取用",
      points: GOOD_TIER_ONE_POINTS,
      type: "bonus",
      detail: `此日与客户日支成三合。本日${scored.dayZhi}与客户日支${profile.dayZhi}同属${hostGroup.label}，列入第一梯队`,
    });
    return;
  }
  if (hostHarmonyBranch === scored.dayZhi) {
    scored.score += GOOD_TIER_ONE_SECONDARY_POINTS;
    scored.reasons.push(`此日与客户日支六合：${profile.dayZhi}合${scored.dayZhi}`);
    scored.scoreBreakdown.push({
      label: "六合取用",
      points: GOOD_TIER_ONE_SECONDARY_POINTS,
      type: "bonus",
      detail: `此日与客户日支六合。客户日支${profile.dayZhi}与本日${scored.dayZhi}六合，列入第一梯队`,
    });
    return;
  }
  if (GENERATES[dayGroup.element] === hostGroup.element) {
    scored.score += 18;
    scored.reasons.push(`此日生旺客户：${dayGroup.element}生${hostGroup.element}`);
    scored.scoreBreakdown.push({
      label: "生旺客户",
      points: 0,
      type: "info",
      detail: `此日生旺客户。本日${dayGroup.label}（${dayGroup.element}局）生客户${hostGroup.label}（${hostGroup.element}局）`,
    });
    return;
  }
  if (CONTROLS[hostGroup.element] === dayGroup.element) {
    scored.score += GOOD_TIER_TWO_POINTS;
    scored.reasons.push(`此日可作财局参考：${hostGroup.element}克${dayGroup.element}，克者为财`);
    scored.scoreBreakdown.push({
      label: "财局取用",
      points: GOOD_TIER_TWO_POINTS,
      type: "bonus",
      detail: `${hostGroup.element}克${dayGroup.element}，克者为财；列入第二梯队`,
    });
    return;
  }
  scored.scoreBreakdown.push({
    label: "三合六合生旺财局",
    points: 0,
    type: "info",
    detail: `本日未命中三合、六合、相生、财局；此项只展示判断`,
  });
}

export function scoreConstructionDay(day: AlmanacDay, input: DateInput): ScoredDay {
  const scored = scoreMovingDay(day, input);
  applyConstructionHostSelection(scored, day, input);
  scored.scoreBreakdown.unshift({
    label: "建房择日说明",
    points: 0,
    type: "info",
    detail: "建房择日先看年/月三煞坐山、太岁可坐不可向；再参考客户八字、相主、建除十二神、抉山和择时",
  });

  if (input.mountainBranch) {
    const yearMountainSha = getYearSanShaMountains(day.yearZhi);
    if (yearMountainSha.includes(input.mountainBranch)) {
      scored.score -= 100;
      scored.eliminated = true;
      scored.cautions.push(`坐山犯年三煞：${day.yearGanZhi}年${input.mountainBranch}山不可坐`);
      scored.scoreBreakdown.push({
        label: "年三煞坐山",
        points: -100,
        type: "eliminate",
        detail: `建房规则：三煞可向不可坐。${day.yearGanZhi}年三煞山为${yearMountainSha.join("、")}，本宅坐${input.mountainBranch}山，强避淘汰`,
      });
    } else {
      scored.scoreBreakdown.push({
        label: "年三煞坐山",
        points: 0,
        type: "info",
        detail: `${day.yearGanZhi}年三煞山为${yearMountainSha.join("、") || "未识别"}，本宅坐${input.mountainBranch}山未命中`,
      });
    }

    const monthMountainSha = getYearSanShaMountains(day.monthZhi);
    if (monthMountainSha.includes(input.mountainBranch)) {
      scored.score -= 100;
      scored.eliminated = true;
      scored.cautions.push(`坐山犯月三煞：${day.monthGanZhi}月${input.mountainBranch}山不可坐`);
      scored.scoreBreakdown.push({
        label: "月三煞坐山",
        points: -100,
        type: "eliminate",
        detail: `建房规则：月三煞同样看坐山。${day.monthGanZhi}月三煞山为${monthMountainSha.join("、")}，本宅坐${input.mountainBranch}山，强避淘汰`,
      });
    } else {
      scored.scoreBreakdown.push({
        label: "月三煞坐山",
        points: 0,
        type: "info",
        detail: `${day.monthGanZhi}月三煞山为${monthMountainSha.join("、") || "未识别"}，本宅坐${input.mountainBranch}山未命中`,
      });
    }

    const facing = MOUNTAIN_OPPOSITE[input.mountainBranch] ?? "";
    if (facing && isTaiSuiFacing(day.yearZhi, facing)) {
      scored.score -= 100;
      scored.eliminated = true;
      scored.cautions.push(`向太岁：${day.yearGanZhi}年太岁在${day.yearZhi}，不可向${facing}`);
      scored.scoreBreakdown.push({
        label: "太岁坐向",
        points: -100,
        type: "eliminate",
        detail: `案例规则：太岁可坐不可向。本宅坐${input.mountainBranch}山、向${facing}，${day.yearGanZhi}年太岁在${day.yearZhi}，强避淘汰`,
      });
    } else {
      scored.scoreBreakdown.push({
        label: "太岁坐向",
        points: 0,
        type: "info",
        detail: facing ? `本宅坐${input.mountainBranch}山、向${facing}，未见向太岁` : "未识别坐山对向",
      });
    }
  } else {
    scored.scoreBreakdown.push({
      label: "坐山三煞/太岁",
      points: 0,
      type: "info",
      detail: "未填写坐山，建房择日无法检查年/月三煞坐山和太岁坐向",
    });
  }

  const earthSymbolBranch = EARTH_SYMBOL_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (earthSymbolBranch && day.dayZhi === earthSymbolBranch) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`土符日：农历${day.lunarMonth}月遇${day.dayZhi}日，不可动土修造`);
    scored.scoreBreakdown.push({
      label: "土符日",
      points: -100,
      type: "eliminate",
      detail: "建房规则：土符不可动土，一切动土、修造、挖土、修路皆不可，命中即淘汰",
    });
  }

  const earthMansionBranch = EARTH_MANSION_BRANCH_BY_LUNAR_MONTH[day.lunarMonth];
  if (earthMansionBranch && day.dayZhi === earthMansionBranch) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`土府日：农历${day.lunarMonth}月遇${day.dayZhi}日，不可动土修造`);
    scored.scoreBreakdown.push({
      label: "土府日",
      points: -100,
      type: "eliminate",
      detail: "建房规则：土府不可动土，一切动土、修造、挖土、修路皆不可，命中即淘汰",
    });
  }

  const constructionBuildStar = getConstructionBuildStarAssessment(day);
  scored.score += constructionBuildStar.points;
  if (constructionBuildStar.points > 0) {
    scored.reasons.push(constructionBuildStar.detail);
  } else if (constructionBuildStar.points < 0) {
    scored.cautions.push(constructionBuildStar.detail);
  }
  scored.scoreBreakdown.push({
    label: "建除十二神（建房）",
    points: constructionBuildStar.points,
    type: constructionBuildStar.points > 0 ? "bonus" : constructionBuildStar.points < 0 ? "penalty" : "info",
    detail: constructionBuildStar.detail,
  });

  if (BIG_REPAIR_DAYS.has(day.dayGanZhi) || MINOR_REPAIR_TRAVEL_DAYS[day.dayGanZhi]) {
    const repairName = BIG_REPAIR_DAYS.has(day.dayGanZhi) ? "大偷修日" : "小偷修日";
    scored.score += GOOD_TIER_FOUR_POINTS;
    scored.reasons.push(`建房修造权重上升：${repairName}`);
    scored.scoreBreakdown.push({
      label: "偷修日（建房加权）",
      points: GOOD_TIER_FOUR_POINTS,
      type: "bonus",
      detail: `${repairName}已按第二梯队计入；建房、修造事项再小幅加权`,
    });
  }

  scored.score = roundScore(scored.score);
  return scored;
}

function applyConstructionHostSelection(scored: ScoredDay, day: AlmanacDay, input: DateInput) {
  const profile = getMovingBirthProfile(input);
  const hostGroup = getTrinityGroupByBranch(profile.dayZhi);
  const dayGroup = getTrinityGroupByBranch(day.dayZhi);
  if (!hostGroup || !dayGroup) {
    scored.scoreBreakdown.push({
      label: "建房三合局先筛",
      points: 0,
      type: "info",
      detail: `未能识别客户日支${profile.dayZhi || "空"}或本日${day.dayZhi || "空"}所属三合局，无法做三合局生克筛选`,
    });
    return;
  }

  if (CONTROLS[dayGroup.element] === hostGroup.element) {
    scored.score -= 100;
    scored.eliminated = true;
    scored.cautions.push(`建房三合局不取：本日${day.dayZhi}入${dayGroup.label}，${dayGroup.element}克客户${hostGroup.element}`);
    scored.scoreBreakdown.push({
      label: "建房三合局先筛",
      points: -100,
      type: "eliminate",
      detail: `择日总原则：先排除一定不能选的。客户日支${profile.dayZhi}属${hostGroup.label}（${hostGroup.element}局），本日${day.dayZhi}属${dayGroup.label}（${dayGroup.element}局），${dayGroup.element}克${hostGroup.element}，不可选`,
    });
    return;
  }

  const birthHarmfulHitsForUse = getBirthDayBranchHits(profile, THREE_MISFORTUNES_SIX_HARMS);
  if (birthHarmfulHitsForUse.length > 0) {
    const drainGroup = getTrinityGroupByElement(GENERATES[hostGroup.element]);
    const consumeGroup = getTrinityGroupByElement(CONTROLS[hostGroup.element]);
    if (hostGroup.branches.includes(day.dayZhi)) {
      scored.score -= 100;
      scored.eliminated = true;
      scored.cautions.push(`三凶六害三合不取：客户日支${profile.dayZhi}命中${birthHarmfulHitsForUse.join("、")}，本日${day.dayZhi}与客户日支同局，需转看耗泄`);
      scored.scoreBreakdown.push({
        label: "三凶六害取用",
        points: -100,
        type: "eliminate",
        detail: `三凶六害的三合不取，以客户日支为准。客户日支${profile.dayZhi}命中${birthHarmfulHitsForUse.join("、")}，属${hostGroup.label}（${hostGroup.element}局），本日${day.dayZhi}同局，包括同一个地支也不取三合；宜转看泄局${drainGroup?.branches.join("、") || "未识别"}或耗局${consumeGroup?.branches.join("、") || "未识别"}`,
      });
      return;
    }
    if (drainGroup?.branches.includes(day.dayZhi)) {
      scored.score += 18;
      scored.reasons.push(`三凶六害取泄局：${hostGroup.element}生${drainGroup.element}，取${day.dayZhi}日`);
      scored.scoreBreakdown.push({
        label: "三凶六害取用",
        points: 18,
        type: "bonus",
        detail: `客户日支${profile.dayZhi}命中${birthHarmfulHitsForUse.join("、")}，不取同局三合，转看耗泄。客户日支属${hostGroup.label}（${hostGroup.element}局），${hostGroup.element}生${drainGroup.element}为泄，本日${day.dayZhi}属${drainGroup.label}，按泄局取用`,
      });
      return;
    }
    if (consumeGroup?.branches.includes(day.dayZhi)) {
      scored.score += GOOD_TIER_TWO_POINTS;
      scored.reasons.push(`三凶六害取耗局：${hostGroup.element}克${consumeGroup.element}，取${day.dayZhi}日`);
      scored.scoreBreakdown.push({
        label: "三凶六害取用",
        points: GOOD_TIER_TWO_POINTS,
        type: "bonus",
        detail: `客户日支${profile.dayZhi}命中${birthHarmfulHitsForUse.join("、")}，不取同局三合，转看耗泄。客户日支属${hostGroup.label}（${hostGroup.element}局），${hostGroup.element}克${consumeGroup.element}为耗，本日${day.dayZhi}属${consumeGroup.label}，按耗局取用`,
      });
      return;
    }
  }

  const hostHarmonyBranch = SIX_HARMONY[profile.dayZhi];
  if (hostGroup.branches.includes(day.dayZhi) && day.dayZhi !== profile.dayZhi) {
    const birthAuspiciousHits = getBirthStemBranchHits(profile, THREE_AUSPICIOUS_SIX_BEAUTIES);
    const birthHarmfulHits = getBirthDayBranchHits(profile, THREE_MISFORTUNES_SIX_HARMS);
    if (birthHarmfulHits.length > 0) {
      scored.score -= 100;
      scored.eliminated = true;
      scored.cautions.push(`三凶六害三合不取：客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，本日${day.dayZhi}与客户日支同局，需转看耗泄`);
      scored.scoreBreakdown.push({
        label: "三凶六害取用",
        points: -100,
        type: "eliminate",
        detail: `三凶六害的三合不取，以客户日支为准。客户日支${profile.dayZhi}命中${birthHarmfulHits.join("、")}，本日${day.dayZhi}与客户日支同属${hostGroup.label}，建房不取三合`,
      });
    } else if (birthAuspiciousHits.length > 0) {
      scored.score += GOOD_TIER_ONE_POINTS;
      scored.reasons.push(`建房首看三合：客户${profile.dayZhi}与本日${day.dayZhi}同属${hostGroup.label}`);
      scored.scoreBreakdown.push({
        label: "建房三合取用",
        points: GOOD_TIER_ONE_POINTS,
        type: "bonus",
        detail: `择日总原则：先看三合。本日${day.dayZhi}与客户日支${profile.dayZhi}同属${hostGroup.label}；出生日柱${profile.dayGanZhi}命中${birthAuspiciousHits.join("、")}，列入第一梯队`,
      });
    } else {
      scored.scoreBreakdown.push({
        label: "建房三合取用",
        points: 0,
        type: "info",
        detail: `本日${day.dayZhi}与客户日支${profile.dayZhi}同属${hostGroup.label}，但出生日柱${profile.dayGanZhi}未命中三吉六秀，仅作参考`,
      });
    }
    return;
  }

  if (hostHarmonyBranch === day.dayZhi) {
    scored.score += GOOD_TIER_ONE_SECONDARY_POINTS;
    scored.reasons.push(`建房六合取用：客户日支${profile.dayZhi}六合${day.dayZhi}`);
    scored.scoreBreakdown.push({
      label: "建房六合取用",
      points: GOOD_TIER_ONE_SECONDARY_POINTS,
      type: "bonus",
      detail: `择日总原则：三合之后看六合。客户日支${profile.dayZhi}与本日${day.dayZhi}六合，列入第一梯队`,
    });
    return;
  }

  if (GENERATES[dayGroup.element] === hostGroup.element) {
    scored.score += 18;
    scored.reasons.push(`此日生旺客户：${dayGroup.element}生${hostGroup.element}`);
    scored.scoreBreakdown.push({
      label: "建房生旺客户",
      points: 18,
      type: "bonus",
      detail: `客户日支${profile.dayZhi}属${hostGroup.label}（${hostGroup.element}局），本日${day.dayZhi}属${dayGroup.label}（${dayGroup.element}局），${dayGroup.element}生${hostGroup.element}，此日可生旺客户`,
    });
    return;
  }

  if (CONTROLS[hostGroup.element] === dayGroup.element) {
    scored.score += GOOD_TIER_TWO_POINTS;
    scored.reasons.push(`建房取财：${hostGroup.element}克${dayGroup.element}，克者为财`);
    scored.scoreBreakdown.push({
      label: "建房财局取用",
      points: GOOD_TIER_TWO_POINTS,
      type: "bonus",
      detail: `客户日支${profile.dayZhi}属${hostGroup.label}（${hostGroup.element}局），本日${day.dayZhi}属${dayGroup.label}（${dayGroup.element}局），${hostGroup.element}克${dayGroup.element}，克者为财；列入第二梯队`,
    });
    return;
  }

  scored.scoreBreakdown.push({
    label: "建房三合局先筛",
    points: 0,
    type: "info",
    detail: `客户日支${profile.dayZhi}属${hostGroup.label}，本日${day.dayZhi}属${dayGroup.label}，未命中三合、六合、相生或财局，且未形成克客户的强避关系`,
  });
}

export function getGeneralRecommendedHours(day: AlmanacDay, input?: DateInput) {
  const profile = input ? getMovingBirthProfile(input) : null;
  return getRecommendedHours(day, [], input?.mountainBranch ?? "", profile?.luBranch ?? "", input);
}

function getRecommendedHours(day: AlmanacDay, avoidedBranches: string[], mountainBranch: string, luBranch: string, input?: DateInput) {
  const hours = [];
  const timeAvoidance = getTimeAvoidanceBranches(input);
  const allAvoidedBranches = [...new Set([...avoidedBranches, ...timeAvoidance.branches])];
  hours.push(...getNobleRecommendedHours(day, allAvoidedBranches));
  const dayBranch = day.dayZhi;
  const harmonyBranch = SIX_HARMONY[dayBranch];
  if (harmonyBranch && !allAvoidedBranches.includes(harmonyBranch) && !hours.some((item) => item.branch === harmonyBranch)) {
    hours.push({
      branch: harmonyBranch,
      timeRange: HOUR_RANGES[harmonyBranch],
      relation: "六合" as const,
      detail: `以所选日支${dayBranch}为基准，取${harmonyBranch}时六合`,
    });
  }

  const group = getTrinityGroupByBranch(dayBranch);
  for (const branch of group?.branches ?? []) {
    if (branch !== dayBranch && branch !== harmonyBranch && !allAvoidedBranches.includes(branch) && !hours.some((item) => item.branch === branch)) {
      hours.push({
        branch,
        timeRange: HOUR_RANGES[branch],
        relation: "三合" as const,
        detail: `以所选日支${dayBranch}为基准，${group?.label}，取${branch}时为三合备选`,
      });
    }
  }

  if (hours.length === 0 && allAvoidedBranches.length > 0) {
    for (const branch of Object.keys(HOUR_RANGES)) {
      if (!allAvoidedBranches.includes(branch) && !hours.some((item) => item.branch === branch)) {
        hours.push({
          branch,
          timeRange: HOUR_RANGES[branch],
          relation: "三合" as const,
          detail: `本日优先避开${allAvoidedBranches.join("、")}等冲煞时辰；此时辰仅作避煞备选`,
        });
        break;
      }
    }
  }

  const mountainHours = getMountainRecommendedHours(day, mountainBranch, allAvoidedBranches);
  for (const hour of mountainHours) {
    if (!hours.some((item) => item.branch === hour.branch && item.relation === hour.relation)) {
      hours.push(hour);
    }
  }

  if (luBranch && !allAvoidedBranches.includes(luBranch) && !hours.some((item) => item.branch === luBranch)) {
    hours.push({
      branch: luBranch,
      timeRange: HOUR_RANGES[luBranch],
      relation: "禄时" as const,
      detail: `相主规则：一禄抵万财，四柱有一禄即可；若不取禄日，可取${luBranch}时补禄`,
    });
  }

  return hours
    .filter((hour) => !isTimeStemControllingDayStem(day.dayGan, hour.branch))
    .map((hour) => ({
      ...hour,
      segments: getHourSegments(day, hour.branch),
    }));
}

function getWeddingRecommendedHours(day: AlmanacDay, input: DateInput) {
  const profile = getMovingBirthProfile(input);
  const groomProfile = getWeddingGroomProfile(input);
  const considerChildren = input.weddingConsiderChildren !== false;
  const timeAvoidance = getTimeAvoidanceBranches(input);
  const starRule = WEDDING_STARS_BY_FEMALE_YEAR_STEM[profile.yearGan];
  const luBranch = LU_BRANCH_BY_STEM[profile.yearGan] ?? "";
  const groomLuBranch = LU_BRANCH_BY_STEM[groomProfile.yearGan] ?? "";
  const dateChars = getCourseChars(day);
  const husbandDateCount = starRule ? dateChars.filter((char) => starRule.husband.includes(char)).length : 0;
  const childDateCount = considerChildren && starRule ? dateChars.filter((char) => starRule.child.includes(char)).length : 1;
  const dayGroup = getTrinityGroupByBranch(day.dayZhi);
  const candidates = BRANCHES.map((branch) => {
    const timeGanZhi = getTimeGanZhiByDayStem(day.dayGan, branch);
    const chars = [timeGanZhi.slice(0, 1), timeGanZhi.slice(1, 2)];
    const hitsHusband = Boolean(starRule && chars.some((char) => starRule.husband.includes(char)));
    const hitsChild = Boolean(considerChildren && starRule && chars.some((char) => starRule.child.includes(char)));
    const hitsClash = Boolean(starRule && chars.some((char) => starRule.clashHusband.includes(char) || (considerChildren && starRule.clashChild.includes(char))));
    const hitsFetalClash = Boolean(
      (profile.fetalZhi && SIX_CLASH[profile.fetalZhi] === branch) ||
        (groomProfile.fetalZhi && SIX_CLASH[groomProfile.fetalZhi] === branch)
    );
    const hitsTimeAvoidance = timeAvoidance.branches.includes(branch);
    const currentTimeAvoidanceDetails = timeAvoidance.details.filter((detail) => detail.startsWith(`${branch}时`));
    const hitsTimeStemControl = isTimeStemControllingDayStem(day.dayGan, branch);
    const wouldOverAddHusband = husbandDateCount >= 1 && hitsHusband;
    const nobleInfo = getNobleHourInfo(day, branch);
    const hitsFemaleLu = branch === luBranch;
    const hitsMaleLu = branch === groomLuBranch;
    const relation =
      hitsHusband && hitsChild ? "夫星/子嗣" : hitsHusband ? "夫星" : hitsChild ? "子嗣" : nobleInfo ? nobleInfo.relation : hitsFemaleLu || hitsMaleLu ? "禄时" : "三合";
    const needsHusband = husbandDateCount === 0;
    const needsChild = childDateCount === 0;
    let priority = 0;
    if (needsHusband && hitsHusband) {
      priority += 100;
    }
    if (needsChild && hitsChild) {
      priority += 60;
    }
    if (nobleInfo) {
      priority += 45;
    }
    if (hitsFemaleLu) {
      priority += 25;
    }
    if (hitsMaleLu) {
      priority += 16;
    }
    if (dayGroup?.branches.includes(branch) && branch !== day.dayZhi) {
      priority += 18;
    }
    if (SIX_HARMONY[day.dayZhi] === branch) {
      priority += 14;
    }
    if (hitsClash || hitsFetalClash || wouldOverAddHusband || hitsTimeAvoidance || hitsTimeStemControl) {
      priority -= 200;
    }
    return {
      branch,
      timeRange: HOUR_RANGES[branch],
      relation: relation as "阳贵" | "阴贵" | "夫星" | "子嗣" | "夫星/子嗣" | "禄时" | "三合",
      detail: `结婚择时：${timeGanZhi}时；${[
        hitsHusband ? `补/见夫星${starRule?.husband.join("、")}` : "",
        hitsChild ? `补/见子嗣${starRule?.child.join("、")}` : "",
        nobleInfo ? nobleInfo.detail : "",
        hitsFemaleLu ? `女命${profile.yearGan}禄在${luBranch}` : "",
        hitsMaleLu ? `男命${groomProfile.yearGan}禄在${groomLuBranch}` : "",
        dayGroup?.branches.includes(branch) && branch !== day.dayZhi ? `与所选日${day.dayZhi}成三合` : "",
        SIX_HARMONY[day.dayZhi] === branch ? `与所选日${day.dayZhi}成六合` : "",
        hitsTimeAvoidance ? `避开${currentTimeAvoidanceDetails.join("、")}` : "",
        hitsTimeStemControl ? `${timeGanZhi.slice(0, 1)}时干克${day.dayGan}日干，不取` : "",
      ].filter(Boolean).join("；") || "作为备选时辰"}`,
      priority,
      blocked: hitsClash || hitsFetalClash || wouldOverAddHusband || hitsTimeAvoidance || hitsTimeStemControl,
      hitsHusband,
      hitsChild,
      timeGanZhi,
      nobleInfo,
    };
  });

  const selected = husbandDateCount === 0
    ? candidates
        .filter((item) => !item.blocked && item.hitsHusband)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3)
        .map((item) => ({
          ...item,
          relation: "夫星" as const,
          detail: `夫星在此时辰可补：${item.timeGanZhi}时命中${starRule?.husband.join("、")}${item.nobleInfo ? `；${item.nobleInfo.detail}` : ""}`,
        }))
    : childDateCount === 0
      ? candidates
          .filter((item) => !item.blocked && item.hitsChild)
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 3)
          .map((item) => ({
            ...item,
            relation: "子嗣" as const,
            detail: `子嗣在此时辰可补：${item.timeGanZhi}时命中${starRule?.child.join("、")}${item.nobleInfo ? `；${item.nobleInfo.detail}` : ""}`,
          }))
    : candidates
        .filter((item) => !item.blocked && item.priority > 0)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
  const fallback = candidates
    .filter((item) => !item.blocked)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  const finalHours = selected.length > 0 ? selected : husbandDateCount === 0 || childDateCount === 0 ? [] : fallback;

  return finalHours.map((item) => ({
      branch: item.branch,
      timeRange: item.timeRange,
      relation: item.relation,
      detail: item.detail,
      segments: getHourSegments(day, item.branch),
    }));
}

function getNobleRecommendedHours(day: AlmanacDay, avoidedBranches: string[]) {
  return BRANCHES
    .map((branch) => getNobleHourInfo(day, branch))
    .filter((item): item is NonNullable<ReturnType<typeof getNobleHourInfo>> => Boolean(item))
    .filter((item) => !avoidedBranches.includes(item.branch))
    .map((hour) => ({
        branch: hour.branch,
        timeRange: HOUR_RANGES[hour.branch],
        relation: hour.relation,
        detail: hour.detail,
      }));
}

function getNobleHourInfo(day: AlmanacDay, branch: string) {
  const term = getPreviousQiNameAtHour(day.date, branch);
  const row = term ? NOBLE_HOUR_TABLE[term] : undefined;
  const pair = row?.[day.dayGan];
  if (!pair) {
    return null;
  }
  const relation = branch === pair.yang ? "阳贵" as const : branch === pair.yin ? "阴贵" as const : null;
  if (!relation) {
    return null;
  }
  if (!isNobleHourRelationSuitable(branch, relation)) {
    return null;
  }
  return {
    branch,
    relation,
    detail: `贵人登天表：${term}后，${day.dayGan}日${relation}为${branch}时；白天用阳贵，夜晚用阴贵，黎明傍晚保留复核`,
  };
}

function isNobleHourRelationSuitable(branch: string, relation: "阳贵" | "阴贵") {
  if (relation === "阴贵" && CLEAR_DAYTIME_BRANCHES.has(branch)) {
    return false;
  }
  if (relation === "阳贵" && CLEAR_NIGHTTIME_BRANCHES.has(branch)) {
    return false;
  }
  return true;
}

function getPreviousQiNameAtHour(dateText: string, branch: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  const startHour = getHourStart(branch);
  if (!year || !month || !day || startHour === null) {
    return "";
  }
  const lunar = Solar.fromYmdHms(year, month, day, startHour, 0, 0).getLunar() as {
    getPrevQi?: (wholeDay?: boolean) => { getName?: () => string } | null;
  };
  return lunar.getPrevQi?.(false)?.getName?.() ?? "";
}

function getHourStart(branch: string) {
  const start: Record<string, number> = {
    子: 23,
    丑: 1,
    寅: 3,
    卯: 5,
    辰: 7,
    巳: 9,
    午: 11,
    未: 13,
    申: 15,
    酉: 17,
    戌: 19,
    亥: 21,
  };
  return start[branch] ?? null;
}

function getFetalOrigin(monthGan: string, monthZhi: string) {
  const ganIndex = STEMS.indexOf(monthGan);
  const zhiIndex = BRANCHES.indexOf(monthZhi);
  if (ganIndex < 0 || zhiIndex < 0) {
    return "";
  }
  return `${STEMS[(ganIndex + 1) % STEMS.length]}${BRANCHES[(zhiIndex + 3) % BRANCHES.length]}`;
}

function getCourseChars(day: AlmanacDay) {
  return [
    day.yearGan,
    day.yearZhi,
    day.monthGan,
    day.monthZhi,
    day.dayGan,
    day.dayZhi,
  ].filter(Boolean);
}

function formatCoursePillars(day: AlmanacDay) {
  return `${day.yearGanZhi}年、${day.monthGanZhi}月、${day.dayGanZhi}日`;
}

function getZodiacByBranch(branch: string) {
  const map: Record<string, string> = {
    子: "鼠",
    丑: "牛",
    寅: "虎",
    卯: "兔",
    辰: "龙",
    巳: "蛇",
    午: "马",
    未: "羊",
    申: "猴",
    酉: "鸡",
    戌: "狗",
    亥: "猪",
  };
  return map[branch] ?? "";
}

function getWeddingChartMark(day: AlmanacDay) {
  const dayIndex = ((day.lunarDay - 1) % 16) + 1;
  if (WEDDING_BIG_MONTHS.has(day.lunarMonth)) {
    const row = dayIndex <= 8 ? WEDDING_BIG_MONTH_TOP : WEDDING_BIG_MONTH_BOTTOM;
    const column = 8 - (((dayIndex - 1) % 8) + 1);
    const mark = row[column] ?? "";
    return {
      mark,
      detail: `大月图横看：农历${day.lunarMonth}月${day.lunarDay}日按16日循环落${mark || "未识别"}`,
    };
  }
  if (WEDDING_SMALL_MONTHS.has(day.lunarMonth)) {
    const pairIndex = Math.floor((dayIndex - 1) / 2);
    const isTop = dayIndex % 2 === 1;
    const column = 7 - pairIndex;
    const row = isTop ? WEDDING_SMALL_MONTH_TOP : WEDDING_SMALL_MONTH_BOTTOM;
    const mark = row[column] ?? "";
    return {
      mark,
      detail: `小月图竖看：农历${day.lunarMonth}月${day.lunarDay}日按16日循环落${mark || "未识别"}`,
    };
  }
  return {
    mark: "",
    detail: `农历${day.lunarMonth}月未纳入大月图/小月图分类，暂无法判断落字`,
  };
}

function getEnshrinementSitMark(day: AlmanacDay) {
  const rowIndex = ((day.lunarDay - 1) % 10);
  const marks = ENSHRINEMENT_SIT_TABLE[day.lunarMonth] ?? [];
  const mark = marks[rowIndex] ?? "";
  return {
    mark,
    detail: `进祠、请神、安神择日细表：农历${day.lunarMonth}月${day.lunarDay}日按${formatEnshrinementCycleDays(rowIndex)}同位循环，数到${mark || "未识别"}`,
  };
}

function formatEnshrinementCycleDays(rowIndex: number) {
  const first = rowIndex + 1;
  const days = [first, first + 10, first + 20].filter((day) => day <= 30);
  return days.map(formatSimpleLunarDay).join("/");
}

function formatSimpleLunarDay(day: number) {
  if (day <= 10) {
    return `初${["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][day]}`;
  }
  if (day < 20) {
    return `十${["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][day - 10]}`;
  }
  if (day === 20) {
    return "二十";
  }
  if (day < 30) {
    return `廿${["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][day - 20]}`;
  }
  return "三十";
}

function getProtectiveShaMark(day: AlmanacDay) {
  const offset = (day.lunarDay - 1) % PROTECTIVE_SHA_CYCLE.length;
  const mark = BIG_LUNAR_MONTHS.has(day.lunarMonth)
    ? PROTECTIVE_SHA_CYCLE[offset]
    : PROTECTIVE_SHA_CYCLE[(PROTECTIVE_SHA_CYCLE.length - 1 - offset + PROTECTIVE_SHA_CYCLE.length) % PROTECTIVE_SHA_CYCLE.length];
  return {
    mark,
    detail: BIG_LUNAR_MONTHS.has(day.lunarMonth)
      ? `安神杀煞：大月从“村”顺数，农历${day.lunarMonth}月${day.lunarDay}日取${mark}`
      : `安神杀煞：小月从“外”逆数，农历${day.lunarMonth}月${day.lunarDay}日取${mark}`,
  };
}

function getTimeAvoidanceBranches(input?: DateInput) {
  if (!input) {
    return { branches: [] as string[], details: [] as string[] };
  }

  const profile = getMovingBirthProfile(input);
  const birthSanShaAvoidBranches = getBirthSanShaAvoidBranches(profile);
  const items = [
    { branch: SIX_CLASH[profile.yearZhi], detail: `冲客户生肖${profile.yearZhi}` },
    { branch: SIX_CLASH[profile.dayZhi], detail: `冲客户日支${profile.dayZhi}` },
    ...birthSanShaAvoidBranches.map((branch) => ({ branch, detail: `命主三煞时，客户年支${profile.yearZhi}、日支${profile.dayZhi}所避` })),
  ];
  if ((input.purpose === "moving" || input.purpose === "construction") && input.mountainBranch && isEarthlyBranch(input.mountainBranch)) {
    items.push({ branch: SIX_CLASH[input.mountainBranch], detail: `冲房屋坐山${input.mountainBranch}` });
  }

  const validItems = items.filter((item) => item.branch);
  return {
    branches: [...new Set(validItems.map((item) => item.branch))],
    details: validItems.map((item) => `${item.branch}时${item.detail}`),
  };
}

function getHourSegments(day: AlmanacDay, branch: string): HourSegment[] {
  const cell = TIME_SEGMENT_TABLE[day.dayGan]?.[branch];
  if (!cell) {
    return [];
  }
  const [upper, lower] = cell;
  const ranges = getHourSegmentRanges(branch);
  return TIME_SEGMENT_NAMES.map((name, index) => {
    const spirits = [upper[index] ?? "", lower[index] ?? ""].filter(Boolean);
    const rating = rateHourSegment(spirits);
    return {
      name,
      timeRange: ranges[index],
      spirits,
      rating,
      detail: `${day.dayGan}日${branch}时${name}：${spirits.join("、")}`,
    };
  });
}

function getHourSegmentRanges(branch: string) {
  const [startText] = HOUR_RANGES[branch].split("-");
  const [startHourText, startMinuteText] = startText.split(":");
  const startMinutes = Number(startHourText) * 60 + Number(startMinuteText);
  return [0, 40, 80].map((offset) => `${formatClock(startMinutes + offset)}-${formatClock(startMinutes + offset + 40)}`);
}

function formatClock(totalMinutes: number) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function rateHourSegment(spirits: string[]): HourSegment["rating"] {
  const chars = spirits.join("").split("");
  const goodCount = chars.filter((char) => TIME_SEGMENT_GOOD_MARKS.has(char)).length;
  const badCount = chars.filter((char) => TIME_SEGMENT_BAD_MARKS.has(char)).length;
  if (badCount > goodCount) {
    return "bad";
  }
  if (goodCount > badCount) {
    return "good";
  }
  return "neutral";
}

function findMountainComboMatches(sequence: string, combos: string[]) {
  const matches: Array<{ combo: string; indexes: number[] }> = [];
  const adjacentPairs = [
    { text: sequence.slice(0, 2), indexes: [0, 1] },
    { text: sequence.slice(1, 3), indexes: [1, 2] },
  ];
  const fullSequence = { text: sequence, indexes: [0, 1, 2] };

  for (const combo of combos) {
    if (combo.length === 2) {
      for (const pair of adjacentPairs) {
        if (pair.text === combo || pair.text.split("").reverse().join("") === combo) {
          matches.push({ combo, indexes: pair.indexes });
        }
      }
      continue;
    }

    if (combo.length === 3) {
      const reversed = fullSequence.text.split("").reverse().join("");
      if (fullSequence.text === combo || reversed === combo) {
        matches.push({ combo, indexes: fullSequence.indexes });
      }
    }
  }

  return matches;
}

function getMountainAssessment(day: AlmanacDay, mountainBranch: string) {
  if (!mountainBranch) {
    return { enabled: false, points: 0, detail: "", cautions: [] as string[], eliminate: false, sequence: "" };
  }

  const palaceBase = MOUNTAIN_PALACE_BASE[mountainBranch];
  const facingBranch = MOUNTAIN_OPPOSITE[mountainBranch] ?? "";
  const facingPalaceBase = facingBranch ? MOUNTAIN_PALACE_BASE[facingBranch] : 0;
  const orientation = getMountainOrientationText(mountainBranch);
  const yearCenter = getMountainYearCenter(day.yearGanZhi);
  const mountainMonth = getMountainMonthNumber(day.date, day.lunarMonth);
  const monthCenter = getMountainMonthCenter(day.yearZhi, mountainMonth);
  const dayCenter = getMountainDayCenter(day.date, day.dayGanZhi);
  const centers = [
    { label: "年", center: yearCenter },
    { label: "月", center: monthCenter },
    { label: "日", center: dayCenter },
  ];

  if (!palaceBase || centers.some((item) => !item.center)) {
    return {
      enabled: true,
      points: 0,
      detail: `${orientation}；年/月/日中宫数未能完整识别，暂不评分`,
      cautions: [] as string[],
      eliminate: false,
      sequence: "",
    };
  }

  const mountainNumbers = centers.map((item) => ({
    ...item,
    mountainNumber: flyStarToPalace(item.center, palaceBase),
  }));
  const facingNumbers = facingPalaceBase
    ? centers.map((item) => ({
        ...item,
        mountainNumber: flyStarToPalace(item.center, facingPalaceBase),
      }))
    : [];
  const sequence = mountainNumbers.map((item) => item.mountainNumber).join("");
  const facingSequence = facingNumbers.map((item) => item.mountainNumber).join("");
  const auspiciousComboMatches = findMountainComboMatches(sequence, MOUNTAIN_AUSPICIOUS_COMBOS);
  const rawBadComboMatches = findMountainComboMatches(sequence, MOUNTAIN_BAD_COMBOS);
  const facingAuspiciousCombos = [...new Set(findMountainComboMatches(facingSequence, MOUNTAIN_AUSPICIOUS_COMBOS).map((match) => match.combo))];
  const facingBadCombos = [...new Set(findMountainComboMatches(facingSequence, MOUNTAIN_BAD_COMBOS).map((match) => match.combo))];
  const hasSixEightSupport = sequence.includes("6") && sequence.includes("8");
  const mitigatedBadComboMatches = rawBadComboMatches.filter((match) => match.combo === "25" && hasSixEightSupport);
  const badComboMatches = rawBadComboMatches.filter((match) => !(match.combo === "25" && hasSixEightSupport));
  const badCombos = [...new Set(badComboMatches.map((match) => match.combo))];
  const comboCoveredIndexes = new Set([
    ...auspiciousComboMatches.flatMap((match) => match.indexes),
    ...mitigatedBadComboMatches.flatMap((match) => match.indexes),
    ...badComboMatches.flatMap((match) => match.indexes),
  ]);
  let points = 0;
  const cautions: string[] = [];
  let eliminate = false;

  for (const [index, item] of mountainNumbers.entries()) {
    if (!comboCoveredIndexes.has(index)) {
      const numberPoints = getMountainNumberPoints(item.mountainNumber, item.label === "日");
      points += numberPoints;
    }
    if (MOUNTAIN_BAD_NUMBERS.has(item.mountainNumber) && !comboCoveredIndexes.has(index)) {
      const meaning = MOUNTAIN_BAD_NUMBER_MEANING[item.mountainNumber] ?? "属凶数";
      cautions.push(`抉山${item.label}上${item.mountainNumber}到${mountainBranch}山，${meaning}`);
    }
  }

  const auspiciousCombos = [...new Set(auspiciousComboMatches.map((match) => match.combo))];
  if (auspiciousCombos.length > 0) {
    points += 10;
  }
  if (badCombos.length > 0) {
    points -= 100;
    eliminate = true;
    cautions.push(`抉山坐山组合命中凶组：${badCombos.join("、")}`);
  }
  const mitigatedBadCombos = [...new Set(mitigatedBadComboMatches.map((match) => match.combo))];
  if (mitigatedBadCombos.length > 0) {
    points -= 12;
    cautions.push(`抉山坐山组合见${mitigatedBadCombos.join("、")}，但同局同时见6、8，可作缓解，仍宜谨慎复核`);
  }
  const facingDetail = facingNumbers.length > 0
    ? `；飞到朝向得数：${facingNumbers.map((item) => `${item.label}${item.mountainNumber}`).join("、")}；朝向组合${facingSequence}${facingAuspiciousCombos.length ? `，见吉组${facingAuspiciousCombos.join("、")}` : ""}${facingBadCombos.length ? `，见凶组${facingBadCombos.join("、")}，朝向只作复核说明，不按坐山强避` : ""}`
    : "";
  const comboDetail = `坐山组合${sequence}${auspiciousCombos.length ? `，命中吉组${auspiciousCombos.join("、")}` : ""}${badCombos.length ? `，命中凶组${badCombos.join("、")}` : ""}${mitigatedBadCombos.length ? `，${mitigatedBadCombos.join("、")}遇6、8缓解` : ""}`;

  return {
    enabled: true,
    points: roundScore(points),
    detail: `${orientation}；抉山主要用于造葬、修建动土、乔迁、装修，按第一梯队处理。先看坐山组合吉凶，再看未被组合覆盖的单数；单数只扣分提醒，不作强避。抉山月数${mountainMonth}；中宫数：年${yearCenter}、月${monthCenter}、日${dayCenter}；飞到坐山得数：${mountainNumbers.map((item) => `${item.label}${item.mountainNumber}`).join("、")}；${comboDetail}${facingDetail}`,
    cautions,
    eliminate,
    sequence,
  };
}

function getMountainRecommendedHours(day: AlmanacDay, mountainBranch: string, avoidedBranches: string[]) {
  if (!mountainBranch) {
    return [];
  }
  const palaceBase = MOUNTAIN_PALACE_BASE[mountainBranch];
  const orientation = getMountainOrientationText(mountainBranch);
  if (!palaceBase) {
    return [];
  }

  return BRANCHES.map((branch, index) => {
    const center = getMountainHourCenter(day.date, day.dayZhi, index);
    return {
      branch,
      center,
      mountainNumber: center ? flyStarToPalace(center, palaceBase) : 0,
    };
  })
    .filter((item) => item.center && MOUNTAIN_GOOD_NUMBERS.has(item.mountainNumber) && !avoidedBranches.includes(item.branch))
    .slice(0, 4)
    .map((item) => ({
      branch: item.branch,
      timeRange: HOUR_RANGES[item.branch],
      relation: "抉山" as const,
      detail: `抉山择时：${orientation}；${item.branch}时中宫${item.center}，飞到${mountainBranch}山得${item.mountainNumber}，属吉数1/6/8`,
    }));
}

function getMountainOrientationText(mountainBranch: string) {
  const facing = MOUNTAIN_OPPOSITE[mountainBranch] ?? "";
  const orientation = MOUNTAIN_ORIENTATION_GROUPS.find((group) => group.mountains.includes(mountainBranch))?.label ?? "走向未识别";
  return facing ? `${mountainBranch}山${facing}向，简化为${orientation}` : `${mountainBranch || "空"}山，${orientation}`;
}

function relationText(leftBranch: string, rightBranch: string) {
  const left = BRANCH_ELEMENTS[leftBranch] ?? "";
  const right = BRANCH_ELEMENTS[rightBranch] ?? "";
  if (!left || !right) {
    return { type: "neutral", text: "五行未识别" };
  }
  if (GENERATES[left] === right) {
    return { type: "generate", text: `${leftBranch}${left}生${rightBranch}${right}` };
  }
  if (CONTROLS[left] === right) {
    return { type: "control", text: `${leftBranch}${left}克${rightBranch}${right}` };
  }
  return { type: "neutral", text: `${leftBranch}${left}与${rightBranch}${right}未形成相生/相克` };
}

function addInfo(scoreBreakdown: ScoreBreakdownItem[], label: string, relation: { text: string }) {
  scoreBreakdown.push({ label, points: 0, type: "info", detail: relation.text });
}

function getTrinityGroupByBranch(branch: string) {
  const normalizedBranch = branch.trim();
  return TRINITY_GROUPS.find((group) => group.branches.includes(normalizedBranch));
}

function getTrinityGroupByElement(element: string) {
  return TRINITY_GROUPS.find((group) => group.element === element);
}

function getWeightedStemBranchMatches(day: AlmanacDay, set: Set<string>, totalPoints: number) {
  const matches: string[] = [];
  let points = 0;
  if (set.has(day.dayGan)) {
    matches.push(`日干${day.dayGan}`);
    points += totalPoints * STEM_WEIGHT;
  }
  if (set.has(day.dayZhi)) {
    matches.push(`日支${day.dayZhi}`);
    points += totalPoints * BRANCH_WEIGHT;
  }
  return { matches, points: roundScore(points) };
}

function getBirthStemBranchHits(profile: MovingBirthProfile, set: Set<string>) {
  const hits: string[] = [];
  const dayGan = profile.dayGanZhi.slice(0, 1);
  if (set.has(dayGan)) {
    hits.push(`日干${dayGan}`);
  }
  if (set.has(profile.dayZhi)) {
    hits.push(`日支${profile.dayZhi}`);
  }
  return hits;
}

function getBirthDayBranchHits(profile: MovingBirthProfile, set: Set<string>) {
  return set.has(profile.dayZhi) ? [`日支${profile.dayZhi}`] : [];
}

function hasStemBranchHit(day: AlmanacDay, set: Set<string>) {
  return set.has(day.dayGan) || set.has(day.dayZhi);
}

function getLuPillarHits(day: AlmanacDay, luBranch: string) {
  if (!luBranch) {
    return { hits: [] as string[], points: 0 };
  }
  const hits: string[] = [];
  let points = 0;
  if (day.yearZhi === luBranch) {
    hits.push(`年支${day.yearZhi}`);
    points += GOOD_TIER_TWO_POINTS;
  }
  if (day.monthZhi === luBranch) {
    hits.push(`月支${day.monthZhi}`);
    points += GOOD_TIER_ONE_SECONDARY_POINTS;
  }
  if (day.dayZhi === luBranch) {
    hits.push(`日支${day.dayZhi}`);
    points += GOOD_TIER_ONE_POINTS;
  }
  return { hits, points };
}

function getResolverStarPoints(star: string) {
  if (star.startsWith("天德(") || star.startsWith("月德(")) {
    return GOOD_TIER_ONE_POINTS;
  }
  if (star.startsWith("天德合(") || star.startsWith("月德合(")) {
    return GOOD_TIER_TWO_POINTS;
  }
  return GOOD_TIER_TWO_POINTS;
}

function getXiuLuckPoints(luck: string) {
  switch (luck) {
    case "吉":
      return GOOD_TIER_FOUR_POINTS;
    case "半吉":
      return GOOD_TIER_FOUR_POINTS / 2;
    case "凶":
      return -GOOD_TIER_FOUR_POINTS;
    case "半凶":
      return -GOOD_TIER_FOUR_POINTS / 2;
    default:
      return 0;
  }
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function isEarthlyBranch(value: string): value is (typeof BRANCHES)[number] {
  return BRANCHES.includes(value);
}

function formatJianMonth(month: number) {
  const names: Record<number, string> = {
    1: "正月",
    2: "二月",
    3: "三月",
    4: "四月",
    5: "五月",
    6: "六月",
    7: "七月",
    8: "八月",
    9: "九月",
    10: "十月",
    11: "十一月",
    12: "十二月",
  };
  return names[month] ?? `${month}月`;
}

function getMountainYearCenter(yearGanZhi: string) {
  const index = JIA_ZI.indexOf(yearGanZhi);
  if (index < 0) {
    return 0;
  }
  return wrapNine(7 - index);
}

function getMountainMonthCenter(yearBranch: string, lunarMonth: number) {
  const group = MOUNTAIN_MONTH_CENTER_BY_YEAR_BRANCH_GROUP.find((item) => item.branches.includes(yearBranch));
  if (!group || lunarMonth < 1 || lunarMonth > 12) {
    return 0;
  }
  return group.centers[lunarMonth - 1] ?? 0;
}

function getMountainMonthNumber(date: string, lunarMonth: number) {
  const period = getMountainSolarTermPeriod(date);
  const periodMonth = MOUNTAIN_MONTH_BY_SOLAR_TERM_PERIOD[period];
  if (periodMonth && (lunarMonth === periodMonth || lunarMonth === periodMonth - 1)) {
    return periodMonth;
  }
  return lunarMonth;
}

function getMountainDayCenter(date: string, dayGanZhi: string) {
  const index = JIA_ZI.indexOf(dayGanZhi);
  const period = getMountainSolarTermPeriod(date);
  if (index < 0 || !period) {
    return 0;
  }
  const rowIndex = index % 9;
  return MOUNTAIN_DAY_CENTER_BY_PERIOD[period]?.[rowIndex] ?? 0;
}

function getMountainHourCenter(date: string, dayBranch: string, hourBranchIndex: number) {
  const half = getMountainSolsticeHalf(date);
  const dayBranchGroup = getMountainBranchGroupLabel(dayBranch);
  if (!half || !dayBranchGroup) {
    return 0;
  }
  return MOUNTAIN_HOUR_CENTER[half][dayBranchGroup][hourBranchIndex] ?? 0;
}

function getMountainBranchGroupLabel(branch: string): "子午卯酉" | "辰戌丑未" | "寅申巳亥" | "" {
  if (["子", "午", "卯", "酉"].includes(branch)) {
    return "子午卯酉";
  }
  if (["辰", "戌", "丑", "未"].includes(branch)) {
    return "辰戌丑未";
  }
  if (["寅", "申", "巳", "亥"].includes(branch)) {
    return "寅申巳亥";
  }
  return "";
}

function getMountainSolarTermPeriod(date: string) {
  const cursor = parseLocalDate(date);
  for (let i = 0; i < 90; i += 1) {
    const term = getAlmanacDay(cursor).solarTerm;
    if (MOUNTAIN_SOLAR_TERM_STARTS.has(term)) {
      return term;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return "";
}

function getMountainSolsticeHalf(date: string): "winter" | "summer" | "" {
  const period = getMountainSolarTermPeriod(date);
  if (!period) {
    return "";
  }
  return ["冬至", "雨水", "谷雨"].includes(period) ? "winter" : "summer";
}

function flyStarToPalace(center: number, palaceBase: number) {
  return wrapNine(palaceBase + center - 5);
}

function wrapNine(value: number) {
  return ((((value - 1) % 9) + 9) % 9) + 1;
}

function getMountainNumberPoints(number: number, isDay: boolean) {
  if (MOUNTAIN_GOOD_NUMBERS.has(number)) {
    return isDay ? 10 : 6;
  }
  if (MOUNTAIN_SMALL_GOOD_NUMBERS.has(number)) {
    return isDay ? 5 : 3;
  }
  if (MOUNTAIN_BAD_NUMBERS.has(number)) {
    return isDay ? -12 : -8;
  }
  return 0;
}

function getBirthSanShaDay(day: AlmanacDay, profile: MovingBirthProfile) {
  const hardHits: string[] = [];
  const softHits: string[] = [];
  const rules = getBirthSanShaRules(profile);
  const avoidBranches = getBirthSanShaAvoidBranches(profile);

  if (avoidBranches.includes(day.dayZhi)) {
    hardHits.push(`日支${day.dayZhi}命中${rules.map((rule) => rule.label).join("；")}`);
  }
  if (avoidBranches.includes(day.yearZhi)) {
    softHits.push(`年支${day.yearZhi}命中命主三煞`);
  }
  if (avoidBranches.includes(day.monthZhi)) {
    softHits.push(`月支${day.monthZhi}命中命主三煞`);
  }
  const points = hardHits.length > 0 ? -100 : softHits.length * -6;
  const detailParts = [];
  if (hardHits.length > 0) {
    detailParts.push(`客户年支${profile.yearZhi}、日支${profile.dayZhi}取对岸三合局为${avoidBranches.join("、")}；${hardHits.join("；")}，命主三煞日强避淘汰`);
  }
  if (softHits.length > 0) {
    detailParts.push(`${softHits.join("；")}，年/月层只作小幅扣分`);
  }
  return {
    points,
    eliminate: hardHits.length > 0,
    detail: detailParts.join("；"),
  };
}

function getBirthSanShaRules(profile: MovingBirthProfile) {
  const rules = [profile.yearZhi, profile.dayZhi]
    .map((branch) => BIRTH_SAN_SHA_DAY_RULES.find((rule) => rule.source.includes(branch)))
    .filter((rule): rule is (typeof BIRTH_SAN_SHA_DAY_RULES)[number] => Boolean(rule));
  return [...new Map(rules.map((rule) => [rule.label, rule])).values()];
}

function getBirthSanShaAvoidBranches(profile: MovingBirthProfile) {
  return [...new Set(getBirthSanShaRules(profile).flatMap((rule) => rule.avoid))];
}

function getThreeFuneralSha(day: AlmanacDay) {
  const rule = THREE_FUNERAL_SHA_BY_SEASON.find((item) => item.months.includes(day.lunarMonth));
  if (rule?.branch === day.dayZhi) {
    return `${rule.season}季逢${day.dayZhi}日`;
  }
  return "";
}

function getYearBigDefeat(day: AlmanacDay) {
  const rules = YEAR_BIG_DEFEAT_DAYS[day.yearGan] ?? [];
  const hit = rules.find((item) => item.month === day.lunarMonth && item.dayGanZhi === day.dayGanZhi);
  if (!hit) {
    return "";
  }
  return `${day.yearGan}年农历${day.lunarMonth}月${day.dayGanZhi}`;
}

function getBuildStarAssessment(day: AlmanacDay) {
  const zhiXing = day.zhiXing.replace("日", "");
  switch (zhiXing) {
    case "除":
      return { name: "日", points: 1, detail: "除日：除旧迎新大吉；建除十二神仅作参考，小幅加分" };
    case "成":
      return { name: "日", points: 2, detail: "成日：开业、结婚、上学、庆典吉；建除十二神仅作参考，小幅加分" };
    case "开":
      return { name: "日", points: 2, detail: "开日：开业、结婚、垒灶台吉；建除十二神仅作参考，小幅加分" };
    case "执":
      return { name: "日", points: -2, detail: "执日：建房、种植吉；搬家、旅行、开市不吉。建除十二神仅作参考，小幅扣分" };
    case "危":
      return { name: "日", points: -3, detail: "危日：万事不利；建除十二神仅作参考，轻扣分" };
    case "破":
      return { name: "日", points: -8, detail: "破日：万事不利，但可做拆毁之事；非拆房事项中建除十二神不超过10分影响，乔迁扣分但不绝对淘汰" };
    case "闭":
      return { name: "日", points: -8, detail: "闭日：万事皆凶，但宜修筑；非拆房事项中建除十二神不超过10分影响，乔迁扣分但不绝对淘汰" };
    case "建":
      return { name: "日", points: -2, detail: "建日：诸事可为，但不宜动土修造；建除十二神仅作参考，兼装修动土时小幅扣分" };
    case "定":
      return { name: "日", points: 1, detail: "定日：垒灶台、宴会、学习、订协议吉；仅作小幅参考" };
    case "收":
      return { name: "日", points: 1, detail: "收日：收藏、垒灶台吉；仅作小幅参考" };
    case "满":
      return { name: "日", points: -2, detail: "满日：祭祀吉，其他不吉；建除十二神仅作参考，小幅扣分" };
    default:
      return { name: zhiXing ? "日" : "", points: 0, detail: zhiXing ? `${zhiXing}日：暂未设置乔迁权重` : "未识别建除十二神" };
  }
}

function getConstructionBuildStarAssessment(day: AlmanacDay) {
  const zhiXing = day.zhiXing.replace("日", "");
  switch (zhiXing) {
    case "闭":
      return { points: 8, detail: "闭日：万事皆凶，唯修造吉；非拆房事项中建除十二神不超过10分影响，建房择日加分参考" };
    case "执":
      return { points: 3, detail: "执日：修造、种树吉；建除十二神除破日、闭日外仅作参考，小幅加分" };
    case "建":
      return { points: -4, detail: "建日：文档记不可建造、不可动土；建除十二神除破日、闭日外仅作参考，小幅扣分" };
    case "破":
      return { points: -8, detail: "破日：适合拆房、看病、手术、离婚；非拆房事项中建除十二神不超过10分影响，建房不优先" };
    case "危":
      return { points: -3, detail: "危日：做什么都不好；建除十二神除破日、闭日外仅作参考，小幅扣分" };
    case "满":
      return { points: -3, detail: "满日：只能祭祀，其他都不好；建除十二神除破日、闭日外仅作参考，小幅扣分" };
    case "成":
      return { points: 2, detail: "成日：不可看病、拆房；建房仅作小幅参考" };
    case "开":
      return { points: 2, detail: "开日：不可安葬、下葬，其他可；建房仅作小幅参考" };
    case "定":
      return { points: 1, detail: "定日：开光、签合同、布局可；建房仅作小幅参考" };
    case "收":
      return { points: -1, detail: "收日：农村打灶可，其他不利；建房仅作小幅参考" };
    case "除":
      return { points: 0, detail: "除日：打扫卫生；建房择日不单独加减分" };
    default:
      return { points: 0, detail: zhiXing ? `${zhiXing}日：建房规则暂未设权重` : "未识别建除十二神" };
  }
}

function getSanShaByBranch(branch: string) {
  return SAN_SHA_RULES.find((rule) => rule.source.includes(branch));
}

function getGoldSpiritFlags(day: AlmanacDay) {
  const flags: string[] = [];
  if (BA_ZI_GOLD_SPIRIT_DAYS.has(day.dayGanZhi)) {
    flags.push(`日柱金神日${day.dayGanZhi}`);
  }
  if (GOLD_SPIRIT_BRANCHES_BY_YEAR_STEM[day.yearGan]?.includes(day.dayZhi)) {
    flags.push(`${day.yearGan}年金神七煞逢${day.dayZhi}日`);
  }
  if (LODGE_GOLD_SPIRIT_XIU.has(day.xiu)) {
    flags.push(`金神七煞：${day.xiu}金${day.xiuAnimal}`);
  }
  return flags;
}

function getNayinTimeJudgments(day: ScoredDay) {
  const table = NAYIN_TIME_LUCK_TABLE[day.dayGanZhi];
  if (!table || day.recommendedHours.length === 0) {
    return [];
  }
  return day.recommendedHours
    .map((hour) => {
      const timeGanZhi = getTimeGanZhiByDayStem(day.dayGan, hour.branch);
      const judgment = table[timeGanZhi];
      return judgment ? `${hour.branch}时${timeGanZhi}：${judgment}` : "";
    })
    .filter(Boolean);
}

function getTimeGanZhiByDayStem(dayStem: string, hourBranch: string) {
  const startStemByDayStem: Record<string, string> = {
    甲: "甲",
    己: "甲",
    乙: "丙",
    庚: "丙",
    丙: "戊",
    辛: "戊",
    丁: "庚",
    壬: "庚",
    戊: "壬",
    癸: "壬",
  };
  const startStem = startStemByDayStem[dayStem];
  const branchIndex = BRANCHES.indexOf(hourBranch);
  const stemIndex = STEMS.indexOf(startStem);
  if (branchIndex < 0 || stemIndex < 0) {
    return "";
  }
  return `${STEMS[(stemIndex + branchIndex) % STEMS.length]}${hourBranch}`;
}

function isTimeStemControllingDayStem(dayStem: string, hourBranch: string) {
  const timeStem = getTimeGanZhiByDayStem(dayStem, hourBranch).slice(0, 1);
  const timeElement = STEM_ELEMENTS[timeStem];
  const dayElement = STEM_ELEMENTS[dayStem];
  return Boolean(timeElement && dayElement && CONTROLS[timeElement] === dayElement);
}

function getYearSanShaMountains(yearBranch: string) {
  const rule = getSanShaByBranch(yearBranch);
  const mountainsByShaBranch: Record<string, string[]> = {
    亥: ["亥", "壬"],
    子: ["子", "癸"],
    丑: ["丑"],
    寅: ["寅", "甲"],
    卯: ["卯", "乙"],
    辰: ["辰"],
    巳: ["巳", "丙"],
    午: ["午", "丁"],
    未: ["未"],
    申: ["申", "庚"],
    酉: ["酉", "辛"],
    戌: ["戌"],
  };
  return [...new Set((rule?.sha ?? []).flatMap((branch) => mountainsByShaBranch[branch] ?? [branch]))];
}

function isTaiSuiFacing(yearBranch: string, facingMountain: string) {
  const taiSuiMountains: Record<string, string[]> = {
    子: ["壬", "子", "癸"],
    丑: ["丑", "艮"],
    寅: ["艮", "寅", "甲"],
    卯: ["甲", "卯", "乙"],
    辰: ["辰", "巽"],
    巳: ["巽", "巳", "丙"],
    午: ["丙", "午", "丁"],
    未: ["未", "坤"],
    申: ["坤", "申", "庚"],
    酉: ["庚", "酉", "辛"],
    戌: ["戌", "乾"],
    亥: ["乾", "亥", "壬"],
  };
  return taiSuiMountains[yearBranch]?.includes(facingMountain) ?? false;
}

function getGoldSymbolStar(day: AlmanacDay) {
  const jiaZiIndex = JIA_ZI.indexOf(day.dayGanZhi);
  const startIndex = GOLD_SYMBOL_START_INDEX_BY_MONTH[day.lunarMonth];
  if (jiaZiIndex < 0 || startIndex === undefined) {
    return null;
  }

  const star = GOLD_SYMBOL_STARS[(startIndex + jiaZiIndex) % GOLD_SYMBOL_STARS.length];
  const startStar = GOLD_SYMBOL_STARS[startIndex];
  const monthType =
    startIndex === 0 ? "四孟月，甲子起妖星" : startIndex === 1 ? "四仲月，甲子起惑星" : "四季月，甲子起禾刀";

  return {
    star,
    detail: `农历${day.lunarMonth}月为${monthType}；${day.dayGanZhi}为六十甲子第${jiaZiIndex + 1}位，顺排得${star}`,
  };
}

function getFormationBonuses(day: AlmanacDay) {
  const pillars = [day.yearGanZhi, day.monthGanZhi, day.dayGanZhi];
  const stems = [day.yearGan, day.monthGan, day.dayGan];
  const branches = [day.yearZhi, day.monthZhi, day.dayZhi];
  const bonuses: Array<{ name: string; points: number; detail: string }> = [];

  if (sameNonEmpty(pillars)) {
    bonuses.push({
      name: "天地同流",
      points: GOOD_TIER_THREE_POINTS + 6,
      detail: `年、月、日三柱同为${day.dayGanZhi}；若择同干支时，可补成四柱天地同流，按成格局参考`,
    });
  }

  if (sameNonEmpty(stems)) {
    bonuses.push({
      name: "天元一气",
      points: GOOD_TIER_THREE_POINTS,
      detail: `年、月、日天干同为${day.dayGan}；若择同天干时，可补成四柱天元一气，列入第三梯队`,
    });
  }

  if (sameNonEmpty(branches)) {
    bonuses.push({
      name: "地支一气",
      points: GOOD_TIER_THREE_POINTS,
      detail: `年、月、日地支同为${day.dayZhi}；若择同地支时，可补成四柱地支一气，列入第三梯队`,
    });
  }

  const stemCount = countMostFrequent(stems);
  if (stemCount.count === 2 && stemCount.value) {
    const matchingHours = getHourOptionsForStem(day.dayGan, stemCount.value);
    const timeHint = matchingHours.length > 0
      ? `可取${matchingHours.join("、")}，则成天干三朋`
      : "本日暂未推得对应时干，请下方择时再复核";
    bonuses.push({
      name: "天干三朋可成",
      points: GOOD_TIER_THREE_POINTS,
      detail: `年、月、日中已有两个${stemCount.value}干；${timeHint}`,
    });
  }

  return bonuses;
}

function getHourOptionsForStem(dayStem: string, targetStem: string) {
  return BRANCHES
    .map((branch) => {
      const ganZhi = getTimeGanZhiByDayStem(dayStem, branch);
      return ganZhi.startsWith(targetStem) ? `${branch}时${ganZhi}` : "";
    })
    .filter(Boolean);
}

function sameNonEmpty(values: string[]) {
  return values.every(Boolean) && new Set(values).size === 1;
}

function countMostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].reduce(
    (best, [value, count]) => (count > best.count ? { value, count } : best),
    { value: "", count: 0 }
  );
}

function getSeasonBoundaryAvoidance(dateValue: string) {
  const current = parseLocalDate(dateValue);
  const tomorrow = addDays(current, 1);
  const tomorrowDay = getAlmanacDay(tomorrow);
  if (!SEASON_BOUNDARY_TERMS.has(tomorrowDay.solarTerm)) {
    return "";
  }
  if (FOUR_JUE_TERMS.has(tomorrowDay.solarTerm)) {
    return `四绝日：${tomorrowDay.solarTerm}前一日`;
  }
  if (FOUR_LI_TERMS.has(tomorrowDay.solarTerm)) {
    return `四离日：${tomorrowDay.solarTerm}前一日`;
  }
  return "";
}

function getAuspiciousResolverStars(day: AlmanacDay) {
  const monthTable = AUSPICIOUS_RESOLVER_TABLE[day.monthZhi];
  if (!monthTable) {
    return [];
  }
  return Object.entries(monthTable)
    .filter(([, value]) => day.dayGan === value || day.dayZhi === value)
    .map(([name, value]) => `${name}(${value})`);
}
