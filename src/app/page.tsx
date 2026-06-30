"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { addDays, formatDate, getAlmanacDay, getBirthSolarDate } from "@/lib/calendar";
import { PURPOSE_RULES } from "@/lib/rules";
import { evaluateCandidateDay, selectAuspiciousDays } from "@/lib/selection";
import type { DateInput, FamilyMember, MountainBranch, Purpose, RecommendationResult, ScoredDay, TimeBranch } from "@/lib/types";

const TIME_BRANCHES: TimeBranch[] = ["", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MOUNTAIN_BRANCHES: MountainBranch[] = [
  "",
  "壬",
  "子",
  "癸",
  "丑",
  "艮",
  "寅",
  "甲",
  "卯",
  "乙",
  "辰",
  "巽",
  "巳",
  "丙",
  "午",
  "丁",
  "未",
  "坤",
  "申",
  "庚",
  "酉",
  "辛",
  "戌",
  "乾",
  "亥",
];
const PURPOSES: Purpose[] = ["wedding", "moving", "demolition", "construction", "enshrinement", "general"];
const HOST_CORE_PURPOSES: Purpose[] = ["moving", "construction"];
const FAMILY_INFO_PURPOSES: Purpose[] = ["moving", "construction", "enshrinement", "general"];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const withBasePath = (path: string) => `${BASE_PATH}${path}`;
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
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
const CONTROLS: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};
const BIRTH_SAN_SHA_RULES = [
  { source: ["巳", "午", "未"], avoid: ["申", "子", "辰"], label: "巳午未避申子辰" },
  { source: ["申", "酉", "戌"], avoid: ["亥", "卯", "未"], label: "申酉戌避亥卯未" },
  { source: ["亥", "子", "丑"], avoid: ["寅", "午", "戌"], label: "亥子丑避寅午戌" },
  { source: ["寅", "卯", "辰"], avoid: ["巳", "酉", "丑"], label: "寅卯辰避巳酉丑" },
];
const SIX_CLASH_BRANCHES: Record<string, string> = {
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
const ZODIAC_BY_BRANCH: Record<string, string> = {
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

const ENCYCLOPEDIA_SECTIONS = [
  {
    title: "历法与输入",
    items: [
      { name: "生日历法", detail: "可填阳历或阴历生日。若填阳历，系统先换算为阴历，再展示对应阴历生日和八字。" },
      { name: "真太阳时", detail: "出生地和经度均为选填。填写出生地或经度，并填写出生具体时间后，系统按真太阳时校正；都不填则默认北京时间。" },
      { name: "输出日期", detail: "推荐日以阴历日期为主，阳历只作日历参考；日课显示年柱、月柱、日柱和推荐时柱。" },
      { name: "资料总表", detail: "日课统计显化表作为规则总表来源，不再单独作为一个分类承载所有规则；具体规则按用途分别放在取用、避忌、辅助参考等栏目。" },
    ],
  },
  {
    title: "相主",
    items: [
      { name: "四柱有禄", detail: "乔迁、建房、动工以家主生日年干取禄；其他事项以客户生日年干取禄。相主此处只放“禄”，一禄抵万财，年、月、日、时四柱有一个禄都算有禄。" },
      { name: "禄神冲命", detail: "禄神冲命主日柱时，不取禄日，可改取禄月或禄时。" },
      { name: "结婚禄神", detail: "结婚以女命为主、男命兼看。女命年干取禄权重较高，男命年干取禄权重稍低；年月日有禄加分，没有则择时可作辅助。" },
    ],
  },
  {
    title: "日课取用",
    items: [
      { name: "三合六合", detail: "乔迁、建房、动工以家主为核心，先避大忌，再看三合、六合。能合家主、合坐山者优先。" },
      { name: "生旺家主", detail: "候选日三合局若生家主日支三合局，视为此日生旺家主。" },
      { name: "财局", detail: "以家主生日日支所属三合局定本气，再以本气所克为财；只按已给定四组三合局取财，不自动补土财。" },
      { name: "相邻五行", detail: "年与月、月与日相邻五行只作辅助参考。相生加分；相克只是降低优先级，并在温馨提醒中提示，不作为绝对不能选。" },
      { name: "三吉六秀", detail: "甲、己、庚、辰、丑、亥、酉、丙、丁。不单独加减分；以客户出生日柱为准，用来判断三合、耗、泄、克是否可取。" },
      { name: "三凶六害", detail: "寅、卯、乙、未、申、辛、戌、壬、癸。不单独加减分；一般择日先取三合、六合；只有客户日支命中三凶六害时，同局三合不取，转看泄局、耗局。" },
      { name: "好日子权重", detail: "第一梯队：有禄、天德、月德、三合、六合；第二梯队：天德合、月德合、偷修日、财日；第三梯队：天干一气、地支一气；第四梯队：金符九星吉星、二十八星宿吉星。" },
    ],
  },
  {
    title: "强避与冲煞",
    items: [
      { name: "择日六冲", detail: "固定六冲为子午、丑未、寅申、卯酉、辰戌、巳亥。重点避：冲生肖、冲日支、冲坐山、月破、岁破。" },
      { name: "日柱伏吟", detail: "自己的日柱与所择日柱相同即为日柱伏吟，主重复、停滞、反复，列入第一梯队强避。" },
      { name: "日课四柱六冲", detail: "候选日课自身年、月、日三柱之间出现六冲，按强避处理。" },
      { name: "杨公忌日", detail: "按农历固定 13 日强避：正月十三、二月十一、三月初九、四月初七、五月初五、六月初三、七月初一、七月廿九、八月廿七、九月廿五、十月廿三、十一月廿一、十二月十九。" },
      { name: "红砂日", detail: "1/4/7/10 月逢酉日，2/5/8/11 月逢巳日，3/6/9/12 月逢丑日，强避。" },
      { name: "三煞", detail: "命主三煞看客户年支和日支，取其对岸三合局为三煞支。例如年支或日支为子，则避寅午戌。日课日支或所选时支命中为强避；日课年支、月支命中只作小幅扣分。" },
      { name: "金神日", detail: "乙丑、己巳、癸酉为日柱金神；二十八宿亢、牛、娄、鬼四金宿为金神七煞，择日时列为强避。" },
      { name: "复日", detail: "按建月判断：正月甲、二月乙、三月戊、四月丙、五月丁、六月己、七月庚、八月辛、九月戊、十月壬、十一月癸、十二月己。正式乔迁和建房开工强避。" },
      { name: "四绝四离", detail: "立春、立夏、立秋、立冬前一日为四绝；春分、夏至、秋分、冬至前一日为四离，强避。普通节气不参与评分。" },
      { name: "十恶日 / 年大败", detail: "十恶日强避；年大败按年干、农历月、日干支匹配，命中强避。" },
      { name: "三丧煞", detail: "春辰、夏未、秋戌、冬丑，命中慎用。" },
    ],
  },
  {
    title: "辅助参考",
    items: [
      { name: "天德/月德", detail: "按月支查天德、月德、天德合、月德合。天德、月德权重高于合星。" },
      { name: "金符九星", detail: "只作辅助参考，不能单独决定日子。三吉星为煞贡、直星、人专；六凶星最多只作 12 分辅助扣分。若同日得天德、月德、天德合、月德合，可减其凶势，但不作完全化解论。" },
      { name: "二十八星宿", detail: "按万年历返回的星宿吉凶判断；吉星小幅加分，凶星辅助扣分，不单独决定吉凶。若同日得天德、月德、天德合、月德合，可减其凶势，但不作完全化解论。" },
      { name: "六十甲子纳音吉凶表", detail: "按日柱和推荐时辰的时柱查表，作为判断依据，不单独加减分。" },
      { name: "建除十二神", detail: "建除十二神仅作参考；其中破日、闭日在乔迁和建房中权重较高。" },
      { name: "大偷修日 / 小偷修日", detail: "偷修日列入好日子第二梯队；建房修造时权重上升。" },
    ],
  },
  {
    title: "抉山",
    items: [
      { name: "适用范围", detail: "抉山主要用于造葬、修建动土、乔迁、装修；坐山先看组合吉凶，凶组优先强避，单数凶意只作降序提醒。" },
      { name: "24 山坐山", detail: "壬子癸归坎一，丑艮寅归艮八，甲卯乙归震三，辰巽巳归巽四，丙午丁归离九，未坤申归坤二，庚酉辛归兑七，戌乾亥归乾六。" },
      { name: "朝向简化", detail: "朝向按四类走向归并：南北、东西、东北-西南、东南-西北。例如子山午向、壬山丙向都默认为南北走向；朝向数字会展示给复核，但日期强避以坐山组合为主。" },
      { name: "年/月/日飞星", detail: "按抉山表起中宫，再飞到坐山和朝向宫位取数。正式评分先看坐山组合，朝向组合只作复核说明。" },
      { name: "抉山吉凶数", detail: "吉：1、6、8；小吉：9、4；凶：5、7、2、3。2 主病，3 主争执，5 主灾病，7 主口舌、盗贼、破耗。" },
      { name: "组合判断", detail: "先看组合吉凶，再看未被组合覆盖的单数。吉组：14、16、13、39、86、87、89、19、27、38、49、147、258、369；坐山凶组：25、37、97、23、67，命中强避；其中25若同局同时见6、8，可作缓解。单数只扣分提醒，不作强避。" },
      { name: "抉山择时", detail: "抉山时辰放在推荐时辰中处理：按时辰中宫飞到坐山取数，优先推荐坐山为 1、6、8 的时辰；若日子可用但原时辰不佳，可改取坐山吉数对应的时辰。" },
    ],
  },
  {
    title: "结婚择日",
    items: [
      { name: "男女双方信息", detail: "结婚择日入口单独填写女方、男方信息。以女命为主推大利月、夫星、子嗣、冲夫冲子、女命禄神，同时兼看男命禄神，并用男方信息检查男方生肖禁年和男方胎元避冲。" },
      { name: "女命利月", detail: "按女命生肖查农历大利月、小利月。大利月加权最高，小利月次之；若不在大利月或小利月，只降低优先级，不直接淘汰。" },
      { name: "夫星", detail: "按女命年天干查夫星。年月日时八个字里必须出现夫星，且只能出现一个；年月日不满足时，优先通过择时补足。若年月日已出现两个或两个以上夫星，强避淘汰。" },
      { name: "子嗣", detail: "默认按女命年天干查子嗣。年月日时八个字里至少出现一个子嗣；年月日未见时，通过择时补足。若客户明确不考虑生育，可在结婚入口关闭“考虑子嗣”，关闭后不再以子嗣缺失或冲子淘汰。" },
      { name: "冲夫冲子", detail: "按女命年天干查冲夫、冲子，年月日时都看；候选日期的年月日三柱若命中冲夫或冲子，强避淘汰。择时也会避开冲夫、冲子的时辰。" },
      { name: "胎元避冲", detail: "胎元算法为出生月干加一、月支加三。例如戊戌月出生，胎元为己丑。结婚择日不可冲女方胎元，也不可冲男方胎元；择时也会避开冲双方胎元的时辰。" },
      { name: "男方生肖禁年", detail: "按利月表左侧，某年对应禁止结婚的男方属相。例如子年忌男方属蛇。以候选年份年支与男方生肖匹配，命中强避。" },
      { name: "大月图/小月图", detail: "大月图用于农历 1、3、5、7、8、10、12 月，横看；小月图用于农历 2、4、6、9、11 月，竖看。第一行第八字永远是初一，按 16 日循环。此表只判断落字，不等同万年历“不将日”。落夫、姑、翁、妇强避；落灶、第、床、死作提示。" },
      { name: "不将日", detail: "不将日以万年历吉神宜趋出现“不将”为准；只有命中“不将”时，才作为结婚吉神参考。" },
      { name: "结婚禄神", detail: "按年干取禄：甲禄寅、乙禄卯、丙戊禄巳、丁己禄午、庚禄申、辛禄酉、壬禄亥、癸禄子。结婚女命禄神权重较高，男命禄神权重稍低；年月日有禄加分，没有则择时可作辅助。" },
      { name: "结婚避红砂日", detail: "1、4、7、10月遇酉日；2、5、8、11月遇巳日；3、6、9、12月遇丑日。结婚择日强避。" },
      { name: "结婚避黑道日", detail: "按万年历天神类型判断，若当日为黑道日，结婚择日强避。" },
      { name: "结婚避四绝日", detail: "立春、立夏、立秋、立冬的前一天为四绝日，结婚择日强避。" },
      { name: "结婚避四离日", detail: "春分、夏至、秋分、冬至的前一天为四离日，结婚择日强避。" },
      { name: "结婚避八专日", detail: "甲寅、乙卯、庚申、辛酉、戊戌、丁未、己未、癸丑，结婚择日强避。" },
      { name: "结婚避亥日", detail: "结婚择日避开亥日。" },
      { name: "结婚避绝阴日", detail: "甲寅、甲戌、辛未、己未、丙申、丁丑，结婚择日强避。" },
      { name: "结婚避孤鸾日", detail: "甲寅、辛亥、戊申、丁巳、乙巳、壬子，结婚择日强避。" },
      { name: "天罡河魁等", detail: "结婚择日忌天罡、河魁、厌对、招摇；从万年历凶神宜忌中识别，命中强避。" },
      { name: "结婚四大吉神", detail: "天德、月德、天德合、月德合为四大吉神，结婚择日作加分参考。" },
    ],
  },
  {
    title: "案例校准",
    items: [
      { name: "拆房择日", detail: "按案例规则单独计算，不套用乔迁入宅取用规则。拆房首选破日，破日列为强推，直接进入80-100分档；但破日不可覆盖强避，金神日除外；避红砂日、土符日、土府日，次选大偷修日。" },
      { name: "土符土府", detail: "土符：正月寅、二月卯、三月辰、四月巳、五月午、六月未、七月申、八月酉、九月戌、十月亥、十一月子、十二月丑。土府：正月丑、二月巳、三月酉、四月寅、五月午、六月戌、七月卯、八月未、九月亥、十月辰、十一月申、十二月子。" },
      { name: "建房择日", detail: "建房、动工以家主为核心，兼顾配偶、子女生日。先排除一定不能选的；再看三合、六合。候选日三合局若克家主日支三合局，直接淘汰。例如家主戌入寅午戌火局，申入申子辰水局，水克火，不可选。" },
      { name: "建房坐山", detail: "年三煞、月三煞均可向不可坐；太岁可坐不可向。通过三合局筛选后，再看家主八字、家属避冲、建除十二神、抉山年/月/日/时飞星。" },
      { name: "建房强避", detail: "红砂日不可动工、建房、装修、安门、起灶；土符、土府不可动土，一切动土、修造、挖地下室、挖土、修路皆不可。" },
    ],
  },
  {
    title: "请神安神进祠",
    items: [
      { name: "坐睡吊表", detail: "按农历月和农历日查表。1、7、10月：初三/五/七/九、十三/十五/十七/十九、廿三/廿五/廿七/廿九为坐；4月：初二/四/六/八、十二/十四/十六/十八、廿二/廿四/廿六/廿八为坐；5、8月：初二/四/七、十二/十四/十七、廿二/廿四/廿七为坐；2、11月：初四/七/九、十四/十七/十九、廿四/廿七/廿九为坐；3、12月：初二/四/初十、十二/十四/二十、廿二/廿四/三十为坐；6、9月：初一/七/九、十一/十七/十九、廿一/廿七/廿九为坐。数到坐能用，睡、吊都不可。" },
      { name: "安神杀煞", detail: "用于保护自己。大月从“村”顺数，小月从“外”逆数。选“外”最好；其次选“村”，村代表小区或村里其他人；绝不能选“主”和“师”，主代表主人，师代表风水师。" },
      { name: "请神取用", detail: "先用坐睡吊表强筛，非坐直接淘汰；再看安神杀煞，外加权最高，村次选，主和师强避。家属生日用于辅助避开年柱、日柱相冲，择时沿用通用择时规则。" },
    ],
  },
  {
    title: "择时",
    items: [
      { name: "择时顺序", detail: "先选日，选好日后再选时；时辰确定后，再按日干与时支查选刻表，分上刻、中刻、下刻。" },
      { name: "择时来源", detail: "择完日后先选时，再选刻。择时主规则为贵人登天表：按日干和准确交节时间所在节气段取阳贵、阴贵，白天用阳贵，夜晚用阴贵；明显白天不取阴贵，明显夜晚不取阳贵，黎明傍晚保留复核。若不命中贵人登天，也可看六合、三合、抉山吉时、禄时等辅助时。结婚择时仍先满足夫星/子嗣硬条件。" },
      { name: "选刻表", detail: "左侧取日干，顶部取时支；每个时辰 120 分钟分三刻：上刻前 40 分钟，中刻中间 40 分钟，下刻后 40 分钟。按表内神煞字样标记优先、避开或参考。" },
    ],
  },
];

const today = new Date();
const defaultStart = formatDate(today);
const defaultEnd = formatDate(addDays(today, 90));

function getPurposeShortLabel(purpose: Purpose) {
  if (purpose === "construction") {
    return "建房";
  }
  return PURPOSE_RULES[purpose].label.replace("择日", "");
}

function getVisibleWeddingRules(rules: string[], form: DateInput) {
  if (form.purpose !== "wedding" || form.weddingConsiderChildren) {
    return rules;
  }
  return rules.filter((rule) => !rule.includes("子嗣") && !rule.includes("冲子"));
}

function getStandaloneCautionRules(forbiddenRules: string[], hardAvoidRules: string[]) {
  const hardAvoidSet = new Set(hardAvoidRules);
  return forbiddenRules.filter((rule) => !hardAvoidSet.has(rule));
}

function buildAdvice(day: ScoredDay) {
  return day.remedies.filter((item) => !item.includes("时") && !item.includes("择时"));
}

function shouldShowTrueSolarStatus(status: string) {
  return Boolean(status) && !status.startsWith("如需真太阳时") && !status.startsWith("已填写出生地时");
}

function buildCautionItems(day: ScoredDay) {
  const cautionItems = day.cautions.filter((item) => !isNonCautionMessage(item));
  if (cautionItems.length > 0) {
    return cautionItems;
  }
  return [];
}

function isNonCautionMessage(message: string) {
  return [
    "未命中",
    "未触发",
    "未发现需要特别避开",
    "没有发现必须避开",
    "本日暂未发现",
  ].some((phrase) => message.includes(phrase));
}

function buildComputedChongNotice(day: ScoredDay, form: DateInput, birthProfile: RecommendationResult["birthProfile"]) {
  const birthBranches = getBaZiBranches(birthProfile.baZiText);
  const clientZodiac = birthBranches.year ? ZODIAC_BY_BRANCH[birthBranches.year] : "";
  const primaryLabel = HOST_CORE_PURPOSES.includes(form.purpose) ? "家主" : "客户";
  const checks = [
    clientZodiac
      ? SIX_CLASH_BRANCHES[birthBranches.year] === day.dayZhi
        ? `命中${primaryLabel}生肖：${primaryLabel}属${clientZodiac}，本日${day.dayZhi}日相冲`
        : `未冲${primaryLabel}生肖${clientZodiac}`
      : `未识别${primaryLabel}生肖`,
    birthBranches.day
      ? SIX_CLASH_BRANCHES[birthBranches.day] === day.dayZhi
        ? `命中${primaryLabel}日支：${birthBranches.day}与本日${day.dayZhi}相冲`
        : `未冲${primaryLabel}日支${birthBranches.day}`
      : `未识别${primaryLabel}日支`,
    SIX_CLASH_BRANCHES[day.monthZhi] === day.dayZhi
      ? `犯月破：本日${day.dayZhi}冲月建${day.monthZhi}`
      : `未犯月破（月建${day.monthZhi}，本日${day.dayZhi}）`,
    SIX_CLASH_BRANCHES[day.yearZhi] === day.dayZhi
      ? `犯岁破：本日${day.dayZhi}冲太岁${day.yearZhi}`
      : `未犯岁破（太岁${day.yearZhi}，本日${day.dayZhi}）`,
  ];

  if ((form.purpose === "moving" || form.purpose === "construction") && form.mountainBranch) {
    checks.splice(
      2,
      0,
      SIX_CLASH_BRANCHES[form.mountainBranch] === day.dayZhi
        ? `命中房屋坐山：坐山${form.mountainBranch}与本日${day.dayZhi}相冲`
        : `未冲房屋坐山${form.mountainBranch}`
    );
  }

  return `万年历显示本日冲${day.dayChongZodiac}。已核对重点相冲：${checks.join("；")}。未命中上述重点相冲时，此项只作背景参考。`;
}

function getBaZiBranches(baZiText: string) {
  const parts = baZiText.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    year: getPillarBranch(parts.find((part) => part.endsWith("年")) || ""),
    day: getPillarBranch(parts.find((part) => part.endsWith("日")) || ""),
  };
}

function getZodiacFromBaZiText(baZiText: string) {
  const yearBranch = getBaZiBranches(baZiText).year;
  return yearBranch ? ZODIAC_BY_BRANCH[yearBranch] || "" : "";
}

function getProcessZodiacText(result: RecommendationResult, form: DateInput) {
  if (form.purpose !== "wedding") {
    return result.inputZodiac || "未识别";
  }

  const brideZodiac = getZodiacFromBaZiText(result.birthProfile.baZiText);
  const groomZodiac = result.groomBirthProfile ? getZodiacFromBaZiText(result.groomBirthProfile.baZiText) : "";
  const parts = [
    groomZodiac ? `男方${groomZodiac}` : "男方未识别",
    brideZodiac ? `女方${brideZodiac}` : "女方未识别",
  ];
  return parts.join("，");
}

function getPillarBranch(pillarText: string) {
  const pillar = pillarText.replace(/[年月日时]/g, "");
  return pillar.length >= 2 ? pillar.slice(1, 2) : "";
}

function getUnsuitableReasons(day: ScoredDay) {
  if (day.cautions.length > 0) {
    return dedupeReviewCautions(day.cautions).slice(0, 4);
  }
  const importantItems = day.scoreBreakdown
    .filter((item) => item.type === "eliminate" || item.type === "penalty")
    .map((item) => `${item.label}：${item.detail}`);
  const dedupedItems = dedupeReviewCautions(importantItems);
  return dedupedItems.length > 0 ? dedupedItems.slice(0, 4) : ["命中淘汰规则，需查看计算过程复核"];
}

function dedupeReviewCautions(items: string[]) {
  const hasHostSanSha = items.some((item) => item.includes("命主三煞"));
  const hasSoftDayHourSanSha = items.some((item) => item.includes("日时三煞较轻") || item.includes("只作扣分提醒"));
  return items.filter((item) => !((hasHostSanSha || hasSoftDayHourSanSha) && item.startsWith("三煞日：")));
}

function isWithinSelectedRange(date: string, form: DateInput) {
  return date >= form.startDate && date <= form.endDate;
}

function getCustomerReviewConclusion(day: ScoredDay, result: RecommendationResult, form: DateInput, timeBranch: TimeBranch) {
  const inRecommendations = result.recommendations.some((item) => item.date === day.date);
  const outsideRange = !isWithinSelectedRange(day.date, form);
  const timeText = timeBranch ? `，已同时复核${getTimeGanZhiText(day.dayGan, timeBranch)}时` : "";

  if (inRecommendations) {
    return `此日已在本次备选中，可按推荐解析继续复核${timeText}。`;
  }

  if (outsideRange) {
    return `此日不在本次填写的择日时间段内，所以不会进入本次备选；以下仍按当前客户资料单独复核${timeText}。`;
  }

  if (day.eliminated) {
    return `此日未进入备选，主因是命中强避或关键避忌，按当前规则不作为正式候选${timeText}。`;
  }

  const cutoff = result.recommendations.at(-1)?.score;
  return cutoff === undefined
    ? `此日未被强避，但当前时间范围内没有形成正式备选；可查看下方逐项原因${timeText}。`
    : `此日未被强避，但综合分为${day.score}分，低于或未优于当前备选末位${cutoff}分，所以没有进入前列备选${timeText}。`;
}

function getCustomerReviewReasons(day: ScoredDay, result: RecommendationResult, form: DateInput) {
  const inRecommendations = result.recommendations.some((item) => item.date === day.date);
  const reasons: string[] = [];

  if (!isWithinSelectedRange(day.date, form)) {
    reasons.push("不在本次择日时间段内，程序筛选备选时不会纳入此日。");
  }

  if (inRecommendations) {
    reasons.push("此日已经进入本次备选，不属于未入选日期。");
  } else if (day.eliminated) {
    reasons.push(...getUnsuitableReasons(day));
  } else {
    const penalties = day.scoreBreakdown
      .filter((item) => item.type === "penalty")
      .map((item) => `${item.label}：${item.detail}`)
      .slice(0, 3);
    reasons.push(...penalties);
    const eligible = result.allDays.filter((item) => !item.eliminated);
    const rank = eligible.findIndex((item) => item.date === day.date);
    if (rank >= 0) {
      reasons.push(`此日在未淘汰日期中排第${rank + 1}位，本次只取前3-6个作为正式备选。`);
    } else if (isWithinSelectedRange(day.date, form)) {
      reasons.push("此日没有进入本次前列备选，主要是综合分和优先项不如已推荐日期。");
    }
  }

  if (reasons.length === 0) {
    reasons.push("未见明显强避项，但优先程度不足，建议结合推荐日期再复核。");
  }

  return reasons.slice(0, 5);
}

function getCustomerHourReview(day: ScoredDay, timeBranch: TimeBranch, form: DateInput) {
  if (!timeBranch) {
    return ["未填写自选时辰，本次只复核日期本身。"];
  }

  const timeGanZhi = getTimeGanZhiText(day.dayGan, timeBranch);
  const timeStemControl = getTimeStemControlText(day.dayGan, timeGanZhi);
  const birthSanShaTimeControl = getBirthSanShaTimeControlText(form, timeBranch);
  const matchedHour = day.recommendedHours.find((hour) => hour.branch === timeBranch);
  if (matchedHour) {
    const items = [`${timeGanZhi}时在本日推荐时辰内，取用为${matchedHour.relation}：${matchedHour.detail}`];
    if (matchedHour.segments && matchedHour.segments.length > 0) {
      items.push(
        `选刻参考：${matchedHour.segments
          .map((segment) => `${segment.name}${segment.timeRange}${segment.spirits.join("、")}，${segment.rating === "good" ? "优先" : segment.rating === "bad" ? "避开" : "参考"}`)
          .join("；")}`
      );
    }
    return items;
  }

  if (day.recommendedHours.length === 0) {
    return [
      `${timeGanZhi}时未列入推荐，本日也没有可展示的推荐时辰。`,
      ...(timeStemControl ? [timeStemControl] : []),
      ...(birthSanShaTimeControl ? [birthSanShaTimeControl] : []),
    ];
  }

  return [
    `${timeGanZhi}时未列入本日推荐时辰。`,
    ...(timeStemControl ? [timeStemControl] : []),
    ...(birthSanShaTimeControl ? [birthSanShaTimeControl] : []),
    `本日可参考的时辰：${day.recommendedHours.slice(0, 5).map((hour) => `${getTimeGanZhiText(day.dayGan, hour.branch)}时${hour.timeRange}（${hour.relation}）`).join("、")}。`,
  ];
}

function getTimeGanZhiText(dayStem: string, hourBranch: string) {
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
  if (!startStem || branchIndex < 0 || stemIndex < 0) {
    return `${hourBranch}`;
  }
  return `${STEMS[(stemIndex + branchIndex) % STEMS.length]}${hourBranch}`;
}

function getTimeStemControlText(dayStem: string, timeGanZhi: string) {
  const timeStem = timeGanZhi.slice(0, 1);
  const timeElement = STEM_ELEMENTS[timeStem];
  const dayElement = STEM_ELEMENTS[dayStem];
  if (!timeElement || !dayElement || CONTROLS[timeElement] !== dayElement) {
    return "";
  }
  return `择时规则：${timeStem}时干克${dayStem}日干，此时不取。`;
}

function getBirthSanShaTimeControlText(form: DateInput, timeBranch: TimeBranch) {
  if (!timeBranch) {
    return "";
  }
  const birthDay = getAlmanacDay(getBirthSolarDate(form));
  const rules = [birthDay.yearZhi, birthDay.dayZhi]
    .map((branch) => BIRTH_SAN_SHA_RULES.find((rule) => rule.source.includes(branch)))
    .filter((rule): rule is (typeof BIRTH_SAN_SHA_RULES)[number] => Boolean(rule));
  const avoidBranches = [...new Set(rules.flatMap((rule) => rule.avoid))];
  if (!avoidBranches.includes(timeBranch)) {
    return "";
  }
  return `命主三煞时：客户年支${birthDay.yearZhi}、日支${birthDay.dayZhi}取${avoidBranches.join("、")}为三煞支，${timeBranch}时命中，按强避不取。`;
}

function buildAnalysisItems(day: ScoredDay) {
  const items = [`综合评分 ${day.score}/100`];
  items.push(...day.reasons);
  const boundaryRule = day.scoreBreakdown.find((item) => item.label === "四绝四离" && item.type === "eliminate");
  if (boundaryRule) {
    items.push(boundaryRule.detail);
  }
  return items;
}

function formatPoints(points: number) {
  if (points > 0) {
    return `+${points}`;
  }
  return `${points}`;
}

function formatSolarDisplay(dateText: string) {
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) {
    return dateText;
  }
  return `${Number(year)}年${Number(month)}月${Number(day)}日`;
}

function getEffectiveForm(form: DateInput): DateInput {
  if (form.purpose !== "wedding") {
    return form;
  }
  return {
    ...form,
    birthCalendar: form.brideBirthCalendar,
    birthDate: form.brideBirthDate,
    birthClockTime: form.brideBirthClockTime,
    birthPlace: form.brideBirthPlace,
    birthLongitude: form.brideBirthLongitude,
    birthTimeBranch: form.brideBirthTimeBranch,
  };
}

export default function Home() {
  const [form, setForm] = useState<DateInput>({
    birthCalendar: "solar",
    birthDate: "1990-01-01",
    birthClockTime: "",
    birthPlace: "",
    birthLongitude: "",
    birthTimeBranch: "",
    brideBirthCalendar: "solar",
    brideBirthDate: "1990-01-01",
    brideBirthClockTime: "",
    brideBirthPlace: "",
    brideBirthLongitude: "",
    brideBirthTimeBranch: "",
    groomBirthCalendar: "solar",
    groomBirthDate: "1990-01-01",
    groomBirthClockTime: "",
    groomBirthPlace: "",
    groomBirthLongitude: "",
    groomBirthTimeBranch: "",
    weddingConsiderChildren: true,
    familyMembers: [{ relation: "配偶", name: "", birthCalendar: "solar", birthDate: "" }],
    mountainBranch: "子",
    purpose: "moving",
    startDate: defaultStart,
    endDate: defaultEnd,
  });
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeNav, setActiveNav] = useState<"calendar" | "encyclopedia">("calendar");
  const [customerDate, setCustomerDate] = useState("");
  const [customerTimeBranch, setCustomerTimeBranch] = useState<TimeBranch>("");
  const [customerReviewDay, setCustomerReviewDay] = useState<ScoredDay | null>(null);
  const [customerReviewMessage, setCustomerReviewMessage] = useState("");
  const resultRef = useRef<HTMLElement | null>(null);

  const activeRule = useMemo(() => PURPOSE_RULES[form.purpose], [form.purpose]);
  const visibleFavorableRules = useMemo(
    () => getVisibleWeddingRules(activeRule.favorable, form),
    [activeRule.favorable, form]
  );
  const visibleForbiddenRules = useMemo(
    () => getVisibleWeddingRules(activeRule.forbidden, form),
    [activeRule.forbidden, form]
  );
  const visibleHardAvoidRules = useMemo(
    () => getVisibleWeddingRules(activeRule.hardAvoid, form),
    [activeRule.hardAvoid, form]
  );
  const visibleStandaloneCautionRules = useMemo(
    () => getStandaloneCautionRules(visibleForbiddenRules, visibleHardAvoidRules),
    [visibleForbiddenRules, visibleHardAvoidRules]
  );

  useEffect(() => {
    function updateActiveNav() {
      const encyclopedia = document.getElementById("encyclopedia");
      if (!encyclopedia) {
        return;
      }
      const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      const triggerLine = topbarHeight + window.innerHeight * 0.18;
      setActiveNav(encyclopedia.getBoundingClientRect().top <= triggerLine ? "encyclopedia" : "calendar");
    }

    updateActiveNav();
    window.addEventListener("scroll", updateActiveNav, { passive: true });
    window.addEventListener("resize", updateActiveNav);
    return () => {
      window.removeEventListener("scroll", updateActiveNav);
      window.removeEventListener("resize", updateActiveNav);
    };
  }, []);

  function updateForm<K extends keyof DateInput>(key: K, value: DateInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFamilyMember(index: number, patch: Partial<FamilyMember>) {
    setForm((current) => ({
      ...current,
      familyMembers: current.familyMembers.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      ),
    }));
  }

  function addFamilyMember() {
    setForm((current) => ({
      ...current,
      familyMembers: [
        ...current.familyMembers,
        { relation: "子女", name: "", birthCalendar: "solar", birthDate: "" },
      ],
    }));
  }

  function removeFamilyMember(index: number) {
    setForm((current) => ({
      ...current,
      familyMembers: current.familyMembers.filter((_, memberIndex) => memberIndex !== index),
    }));
  }

  function handleCustomerDayReview() {
    if (!customerDate) {
      setCustomerReviewDay(null);
      setCustomerReviewMessage("请先填写客户自选的阳历日期。");
      return;
    }

    try {
      const reviewedDay = evaluateCandidateDay(getEffectiveForm(form), customerDate);
      setCustomerReviewDay(reviewedDay);
      setCustomerReviewMessage("");
    } catch (error) {
      console.error(error);
      setCustomerReviewDay(null);
      setCustomerReviewMessage("自选日课复核失败，请检查日期和客户资料后再试。");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCalculating(true);
    setStatusMessage("正在翻历书、排三合、避神煞...");

    window.setTimeout(() => {
      try {
        if (form.purpose === "wedding" && (!form.brideBirthDate || !form.groomBirthDate)) {
          setResult(null);
          setStatusMessage("结婚择日请先填写男女双方生日。");
          setIsCalculating(false);
          return;
        }

        if (form.purpose !== "wedding" && !form.birthDate) {
          setResult(null);
          setStatusMessage(HOST_CORE_PURPOSES.includes(form.purpose) ? "请先填写家主生日。" : "请先填写客户生日。");
          setIsCalculating(false);
          return;
        }

        const start = new Date(`${form.startDate}T00:00:00`);
        const end = new Date(`${form.endDate}T00:00:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          setResult(null);
          setStatusMessage("日期格式有误，请重新选择开始日期和结束日期。");
          setIsCalculating(false);
          return;
        }

        if (start > end) {
          setResult(null);
          setStatusMessage("结束日期不能早于开始日期，请调整日期范围后再试。");
          setIsCalculating(false);
          return;
        }

        const nextResult = selectAuspiciousDays(getEffectiveForm(form));
        setResult(nextResult);
        setCustomerReviewDay(null);
        setCustomerReviewMessage("");
        setStatusMessage(
          nextResult.shortageReason && nextResult.recommendations.length > 0
            ? `已完成推算，当前时间范围只找到 ${nextResult.recommendations.length} 个可展示候选日。`
            : nextResult.recommendations.length > 0
            ? `已完成推算，找到 ${nextResult.recommendations.length} 个候选日。`
            : "已完成推算，但当前日期范围内没有符合强避规则的候选日。"
        );
        setIsCalculating(false);
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        console.error(error);
        setResult(null);
        setStatusMessage("推算过程中出现异常，请检查输入信息后再试。");
        setIsCalculating(false);
      }
    }, 80);
  }

  const customerReviewPanel = result ? (
    <section className="customer-review-panel">
      <div className="customer-review-heading">
        <div>
          <span>自选复核</span>
          <h3 className="font-noto">客户自选日课复核</h3>
        </div>
        <p>若客户自己测算了某个日子，可在这里输入日期和时辰，系统会按本次资料复核为何未进入备选。</p>
      </div>
      <div className="customer-review-form">
        <label>
          客户自选日期（阳历）
          <input
            type="date"
            value={customerDate}
            onInput={(event) => setCustomerDate(event.currentTarget.value)}
            onChange={(event) => setCustomerDate(event.target.value)}
          />
        </label>
        <label>
          客户自选时辰
          <select
            value={customerTimeBranch}
            onInput={(event) => setCustomerTimeBranch(event.currentTarget.value as TimeBranch)}
            onChange={(event) => setCustomerTimeBranch(event.target.value as TimeBranch)}
          >
            <option value="">暂不复核时辰</option>
            {TIME_BRANCHES.filter(Boolean).map((branch) => (
              <option key={`customer-hour-${branch}`} value={branch}>
                {branch}时
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleCustomerDayReview}>
          复核自选日课
        </button>
      </div>
      {customerReviewMessage ? <p className="customer-review-message">{customerReviewMessage}</p> : null}
      {customerReviewDay ? (
        <div className="customer-review-result">
          <div className="customer-review-summary">
            <strong>
              阳历 {formatSolarDisplay(customerReviewDay.date)} · {customerReviewDay.weekday} · {customerReviewDay.score}分
            </strong>
            <span>
              农历{customerReviewDay.lunarText} · {customerReviewDay.yearGanZhi}年 {customerReviewDay.monthGanZhi}月 {customerReviewDay.dayGanZhi}日
            </span>
            <p>{getCustomerReviewConclusion(customerReviewDay, result, form, customerTimeBranch)}</p>
          </div>
          <div className="customer-review-columns">
            <article>
              <strong>未入选重点</strong>
              <ul>
                {getCustomerReviewReasons(customerReviewDay, result, form).map((item) => (
                  <li key={`customer-review-reason-${item}`}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <strong>时辰复核</strong>
              <ul>
                {getCustomerHourReview(customerReviewDay, customerTimeBranch, getEffectiveForm(form)).map((item) => (
                  <li key={`customer-hour-review-${item}`}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  ) : null;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand font-noto">万年红·择日大师</div>
          <nav className="main-nav" aria-label="主导航">
            <a href="#">首页</a>
            <a className={activeNav === "calendar" ? "active" : ""} href="#calendar">
              历书
            </a>
            <a className={activeNav === "encyclopedia" ? "active" : ""} href="#encyclopedia">百科</a>
            <a href="#service">服务</a>
          </nav>
        </div>
      </header>

      <main className="page-shell">
        <section className="hero-title">
          <img className="hero-main-image" src={withBasePath("/wannianhong-hero.png?v=user-tuned")} alt="万年红·福主日课，风水师专用择日工具" />
        </section>

        <section className="exclusive-note" aria-label="日课专用说明">
          <strong>日课专用说明</strong>
          <p>
            本择日系统为当前福主本人、本事项专用，依据命造、所办事项、宅向及本门规则综合推演。
          </p>
          <p>
            一人一事一课，不可截图、转发、外传或套用于他人。
          </p>
          <p>
            日课失其人、失其事、失其向，则吉凶难准；非福主擅自使用或变更用途者，所产生的一切结果由使用者自行承担。
          </p>
        </section>

        <section className="tool-panel" id="calendar" aria-label="择日输入">
          <form className="input-form" onSubmit={handleSubmit} noValidate>
            <div className="form-heading">
              <div>
                <span>历书工具</span>
                <h2 className="font-noto">输入信息</h2>
              </div>
            </div>

            <div className="purpose-field form-section-wide">
              <span>择日目的</span>
              <div className="purpose-tabs" role="radiogroup" aria-label="择日目的">
                {PURPOSES.map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    className={form.purpose === purpose ? "active" : ""}
                    onClick={() => updateForm("purpose", purpose)}
                    aria-pressed={form.purpose === purpose}
                  >
                    {getPurposeShortLabel(purpose)}
                  </button>
                ))}
              </div>
            </div>

            {form.purpose === "wedding" ? (
              <div className="couple-section form-section-wide">
                <div className="wedding-option-card">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={form.weddingConsiderChildren}
                      onChange={(event) => updateForm("weddingConsiderChildren", event.target.checked)}
                    />
                    <span>
                      <strong>结婚择日考虑子嗣</strong>
                      <small>默认开启：子嗣必须出现，年月日不足时由择时补足；若客户明确不考虑生育，可关闭。</small>
                    </span>
                  </label>
                </div>
                <section className="person-panel">
                  <h3 className="font-noto">男方信息</h3>
                  <div className="person-grid">
                    <label>
                      生日历法
                      <select
                        value={form.groomBirthCalendar}
                        onChange={(event) => updateForm("groomBirthCalendar", event.target.value as DateInput["birthCalendar"])}
                      >
                        <option value="solar">阳历生日</option>
                        <option value="lunar">阴历生日</option>
                      </select>
                    </label>
                    <label>
                      男方生日
                      <input
                        type="date"
                        value={form.groomBirthDate}
                        onChange={(event) => updateForm("groomBirthDate", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      出生具体时间
                      <input
                        type="time"
                        value={form.groomBirthClockTime}
                        onChange={(event) => updateForm("groomBirthClockTime", event.target.value)}
                      />
                    </label>
                    <label>
                      出生时辰
                      <select
                        value={form.groomBirthTimeBranch}
                        onChange={(event) => updateForm("groomBirthTimeBranch", event.target.value as TimeBranch)}
                      >
                        <option value="">暂不使用</option>
                        {TIME_BRANCHES.filter(Boolean).map((branch) => (
                          <option key={`groom-${branch}`} value={branch}>
                            {branch}时
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      出生地
                      <input
                        type="text"
                        value={form.groomBirthPlace}
                        onChange={(event) => updateForm("groomBirthPlace", event.target.value)}
                        placeholder="如：成都、上海"
                      />
                    </label>
                    <label>
                      出生地经度
                      <input
                        type="number"
                        step="0.0001"
                        value={form.groomBirthLongitude}
                        onChange={(event) => updateForm("groomBirthLongitude", event.target.value)}
                        placeholder="选填；不填则默认北京时间"
                      />
                    </label>
                  </div>
                </section>

                <section className="person-panel">
                  <h3 className="font-noto">女方信息</h3>
                  <div className="person-grid">
                    <label>
                      生日历法
                      <select
                        value={form.brideBirthCalendar}
                        onChange={(event) => updateForm("brideBirthCalendar", event.target.value as DateInput["birthCalendar"])}
                      >
                        <option value="solar">阳历生日</option>
                        <option value="lunar">阴历生日</option>
                      </select>
                    </label>
                    <label>
                      女方生日
                      <input
                        type="date"
                        value={form.brideBirthDate}
                        onChange={(event) => updateForm("brideBirthDate", event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      出生具体时间
                      <input
                        type="time"
                        value={form.brideBirthClockTime}
                        onChange={(event) => updateForm("brideBirthClockTime", event.target.value)}
                      />
                    </label>
                    <label>
                      出生时辰
                      <select
                        value={form.brideBirthTimeBranch}
                        onChange={(event) => updateForm("brideBirthTimeBranch", event.target.value as TimeBranch)}
                      >
                        <option value="">暂不使用</option>
                        {TIME_BRANCHES.filter(Boolean).map((branch) => (
                          <option key={`bride-${branch}`} value={branch}>
                            {branch}时
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      出生地
                      <input
                        type="text"
                        value={form.brideBirthPlace}
                        onChange={(event) => updateForm("brideBirthPlace", event.target.value)}
                        placeholder="如：成都、上海"
                      />
                    </label>
                    <label>
                      出生地经度
                      <input
                        type="number"
                        step="0.0001"
                        value={form.brideBirthLongitude}
                        onChange={(event) => updateForm("brideBirthLongitude", event.target.value)}
                        placeholder="选填；不填则默认北京时间"
                      />
                    </label>
                  </div>
                </section>
              </div>
            ) : (
              <>
                {HOST_CORE_PURPOSES.includes(form.purpose) ? (
                  <div className="host-note form-section-wide">
                    <strong>家主填写提醒</strong>
                    <span>
                      乔迁、建房、动工以家主为核心。这里的客户生日请填写家主生日，家主指主要家庭经济支柱；配偶、子女生日在下方“家属信息”填写，用作辅助避冲。
                    </span>
                  </div>
                ) : null}

                <label>
                  生日历法
                  <select
                    value={form.birthCalendar}
                    onChange={(event) => updateForm("birthCalendar", event.target.value as DateInput["birthCalendar"])}
                  >
                    <option value="solar">阳历生日</option>
                    <option value="lunar">阴历生日</option>
                  </select>
                </label>

                <label>
                  {HOST_CORE_PURPOSES.includes(form.purpose) ? "家主生日" : "客户生日"}
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => updateForm("birthDate", event.target.value)}
                    required
                  />
                </label>

                <label>
                  出生具体时间
                  <input
                    type="time"
                    value={form.birthClockTime}
                    onChange={(event) => updateForm("birthClockTime", event.target.value)}
                  />
                </label>

                <label>
                  出生地
                  <input
                    type="text"
                    value={form.birthPlace}
                    onChange={(event) => updateForm("birthPlace", event.target.value)}
                    placeholder="国内城市不限；如：成都、上海、县/市名"
                  />
                </label>

                <label>
                  出生地经度
                  <input
                    type="number"
                    step="0.0001"
                    value={form.birthLongitude}
                    onChange={(event) => updateForm("birthLongitude", event.target.value)}
                    placeholder="选填；不填则默认北京时间"
                  />
                </label>

                <label>
                  出生时辰
                  <select
                    value={form.birthTimeBranch}
                    onChange={(event) => updateForm("birthTimeBranch", event.target.value as TimeBranch)}
                  >
                    <option value="">暂不使用</option>
                    {TIME_BRANCHES.filter(Boolean).map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}时
                      </option>
                    ))}
                  </select>
                </label>

                {FAMILY_INFO_PURPOSES.includes(form.purpose) ? (
                  <section className="family-section form-section-wide">
                    <div className="family-heading">
                      <div>
                        <strong>家属信息</strong>
                        <span>
                          {form.purpose === "general"
                            ? "只有关系到家人的择日，例如调风水、安宅等，才需要填写家属信息；若是个人事项，例如给自己的饰品开光，可不填写。填写后用于辅助避开家属年柱、日柱相冲。"
                            : "填写配偶、子女等家属生日，用于辅助避开年柱、日柱相冲。"}
                        </span>
                      </div>
                      <button type="button" className="ghost-button" onClick={addFamilyMember}>
                        添加家属
                      </button>
                    </div>

                    <div className="family-list">
                      {form.familyMembers.map((member, index) => (
                        <div className="family-row" key={`family-${index}`}>
                          <label>
                            关系
                            <select
                              value={member.relation}
                              onChange={(event) => updateFamilyMember(index, { relation: event.target.value as FamilyMember["relation"] })}
                            >
                              <option value="配偶">配偶</option>
                              <option value="子女">子女</option>
                              <option value="父母">父母</option>
                              <option value="其他">其他</option>
                            </select>
                          </label>
                          <label>
                            称呼
                            <input
                              type="text"
                              value={member.name}
                              onChange={(event) => updateFamilyMember(index, { name: event.target.value })}
                              placeholder="如：妻子、长子"
                            />
                          </label>
                          <label>
                            生日历法
                            <select
                              value={member.birthCalendar}
                              onChange={(event) => updateFamilyMember(index, { birthCalendar: event.target.value as FamilyMember["birthCalendar"] })}
                            >
                              <option value="solar">阳历生日</option>
                              <option value="lunar">阴历生日</option>
                            </select>
                          </label>
                          <label>
                            生日
                            <input
                              type="date"
                              value={member.birthDate}
                              onChange={(event) => updateFamilyMember(index, { birthDate: event.target.value })}
                            />
                          </label>
                          <button type="button" className="remove-family-button" onClick={() => removeFamilyMember(index)}>
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            )}

            <div className="time-input-note form-section-wide">
              <strong>出生时间填写说明</strong>
              <ol>
                <li>若知道具体出生时间，建议同时填写出生地或经度，系统会优先按真太阳时校正时柱。</li>
                <li>若只知道出生时辰，直接选择对应时辰。</li>
                <li>若时辰也不确定，可选“暂不使用”，先按已知生日信息推算，后续再补充复核。</li>
              </ol>
            </div>

            {["moving", "construction"].includes(form.purpose) ? (
              <label>
                新宅坐山
                <select
                  value={form.mountainBranch}
                  onChange={(event) => updateForm("mountainBranch", event.target.value as MountainBranch)}
                >
                  <option value="">暂不使用抉山</option>
                  {MOUNTAIN_BRANCHES.filter(Boolean).map((branch) => (
                    <option key={`mountain-${branch}`} value={branch}>
                      {branch}山
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <section className="date-range-section form-section-wide">
              <div className="date-range-heading">
                <strong>择日时间段</strong>
                <span>请填入客户希望择日的时间范围，系统会在此范围内筛选候选日课。</span>
              </div>
              <div className="date-range-grid">
                <label>
                  开始日期
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm("startDate", event.target.value)}
                    required
                  />
                </label>

                <label>
                  结束日期
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateForm("endDate", event.target.value)}
                    required
                  />
                </label>
              </div>
            </section>

            <button className="secondary-submit" type="submit" disabled={isCalculating}>
              {isCalculating ? "计算中..." : "开始择日"}
            </button>
          </form>

        </section>
        {statusMessage ? (
          <div className={`status-message ${isCalculating ? "calculating" : ""}`}>
            {isCalculating ? <span className="loading-dot" aria-hidden="true" /> : null}
            <span>{statusMessage}</span>
          </div>
        ) : null}
        <section className="result-heading" ref={resultRef}>
          <div>
            <span>推荐日课</span>
            <h2 className="font-noto">推荐日期</h2>
          </div>
          {result ? (
            <p>
              已查看 {result.consideredCount} 天，淘汰 {result.eliminatedCount} 天，生日生肖：
              <strong>{getProcessZodiacText(result, form)}</strong>
            </p>
          ) : (
            <p>点击开始择日后，将在下方生成 3-6 个候选吉日。</p>
          )}
        </section>

        {result && form.purpose === "wedding" && result.groomBirthProfile ? (
          <section className="birth-profile wedding-profile">
            <div className="birth-profile-group">
              <div>
                <span>男方阴历生日</span>
                <strong>{result.groomBirthProfile.lunarText}</strong>
                <small>阳历参考：{result.groomBirthProfile.solarDate}</small>
              </div>
              <div>
                <span>男方八字</span>
                <strong>{result.groomBirthProfile.baZiText}</strong>
              </div>
              <div>
                <span>男方真太阳时</span>
                <strong>{result.groomBirthProfile.trueSolarTimeText}</strong>
                {shouldShowTrueSolarStatus(result.groomBirthProfile.trueSolarTimeStatus) ? <small>{result.groomBirthProfile.trueSolarTimeStatus}</small> : null}
              </div>
            </div>
            <div className="birth-profile-group">
              <div>
                <span>女方阴历生日</span>
                <strong>{result.birthProfile.lunarText}</strong>
                <small>阳历参考：{result.birthProfile.solarDate}</small>
              </div>
              <div>
                <span>女方八字</span>
                <strong>{result.birthProfile.baZiText}</strong>
              </div>
              <div>
                <span>女方真太阳时</span>
                <strong>{result.birthProfile.trueSolarTimeText}</strong>
                {shouldShowTrueSolarStatus(result.birthProfile.trueSolarTimeStatus) ? <small>{result.birthProfile.trueSolarTimeStatus}</small> : null}
              </div>
            </div>
            <p>以下推荐日期均以阴历日期为主，括号内阳历仅作日历参考。</p>
          </section>
        ) : result ? (
          <section className="birth-profile">
            <div className="birth-profile-group">
              <div>
                <span>
                  {form.purpose === "wedding" ? "女方阴历生日" : HOST_CORE_PURPOSES.includes(form.purpose) ? "家主阴历生日" : "客户阴历生日"}
                </span>
                <strong>{result.birthProfile.lunarText}</strong>
                <small>阳历参考：{result.birthProfile.solarDate}</small>
              </div>
              <div>
                <span>{form.purpose === "wedding" ? "女方八字" : HOST_CORE_PURPOSES.includes(form.purpose) ? "家主八字" : "客户八字"}</span>
                <strong>{result.birthProfile.baZiText}</strong>
              </div>
            </div>
            <div className="birth-profile-group true-solar-group">
              <div>
                <span>{form.purpose === "wedding" ? "女方真太阳时" : "真太阳时"}</span>
                <strong>{result.birthProfile.trueSolarTimeText}</strong>
                {shouldShowTrueSolarStatus(result.birthProfile.trueSolarTimeStatus) ? <small>{result.birthProfile.trueSolarTimeStatus}</small> : null}
              </div>
            </div>
            <p>以下推荐日期均以阴历日期为主，括号内阳历仅作日历参考。</p>
          </section>
        ) : null}
        {result && result.recommendations.length > 0 ? (
          <section className="date-grid" aria-label="推荐日期列表">
            {result.recommendations.map((day, index) => (
              <article className="date-card" key={day.date}>
                {index === 0 ? <div className="pick-badge">★ 首选</div> : null}
                <div className="date-card-head">
                  <div className="solar-date font-noto">阳历 {formatSolarDisplay(day.date)}</div>
                  <div className="date-line">{day.weekday}</div>
                  <div className="jade-pill">
                    <span>农历{day.lunarText}</span>
                    <strong>{day.yearGanZhi}年 {day.monthGanZhi}月 {day.dayGanZhi}日</strong>
                  </div>
                </div>

                <div className="date-card-body">
                  <section className="analysis-block">
                    <h3 className="font-noto">
                      <span aria-hidden="true">理</span>
                      专业解析
                    </h3>
                    <ul className="analysis-list">
                      {buildAnalysisItems(day).map((item) => (
                        <li key={`${day.date}-analysis-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  {(() => {
                    const adviceItems = buildAdvice(day);
                    return adviceItems.length > 0 ? (
                      <section className="analysis-block">
                        <h3 className="font-noto">
                          <span aria-hidden="true">宜</span>
                          优选建议
                        </h3>
                        <ul>
                          {adviceItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ) : null;
                  })()}

                  {(() => {
                    const cautionItems = buildCautionItems(day);
                    return cautionItems.length > 0 ? (
                      <div className="warning-box">
                        <span aria-hidden="true">！</span>
                        <div>
                          <strong>温馨提醒</strong>
                          <ul>
                            {cautionItems.map((item) => (
                              <li key={`${day.date}-caution-${item}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {day.recommendedHours.length > 0 ? (
                    <section className="time-block">
                      <h3 className="font-noto">
                        <span aria-hidden="true">时</span>
                        {getRecommendedHourTitle(form.purpose, day)}
                      </h3>
                      <ul>
                        {day.recommendedHours.map((hour) => (
                          <li key={`${day.date}-${hour.branch}-${hour.relation}`}>
                            <strong>
                              {getTimeGanZhiText(day.dayGan, hour.branch)}时 {hour.timeRange} · {hour.relation}
                            </strong>
                            {hour.segments && hour.segments.length > 0 ? (
                              <div className="segment-list">
                                {hour.segments.map((segment) => (
                                  <span className={`segment-pill ${segment.rating}`} key={`${hour.branch}-${segment.name}`}>
                                    {segment.name} {segment.timeRange}：{segment.spirits.join("、")}
                                    {segment.rating === "good" ? " · 优先" : segment.rating === "bad" ? " · 避开" : " · 参考"}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-result">
            {result
              ? "已完成推算，但当前范围内没有可展示的推荐日期。请放宽日期范围，或后续调整强避规则。"
              : "填写信息后点击“开始择日”，我们会根据提供的信息，给出3-6个备选日期。"}
          </section>
        )}

        {result?.shortageReason ? (
          <section className="shortage-panel">
            <h3 className="font-noto">当前时间范围内选不出3个符合的日期</h3>
            <p>{result.shortageReason}</p>
            <div className="shortage-options">
              <article>
                <strong>1. 修改时间段</strong>
                <span>建议延长开始/结束日期后重新择日，优先找出真正合适的日子。</span>
              </article>
              <article>
                <strong>2. 查看最高分但不合适的日期</strong>
                <span>下面列出被淘汰日期中分数最高的 3 个，只作复核，不作为正式推荐。</span>
              </article>
              {form.purpose === "wedding" ? (
                <article>
                  <strong>3. 不考虑子嗣重新筛选</strong>
                  <span>若客户明确没有子嗣需求，可关闭上方“考虑子嗣”开关后重新计算。</span>
                </article>
              ) : null}
            </div>
            {result.nearMisses.length > 0 ? (
              <div className="near-miss-list">
                {result.nearMisses.map((day) => (
                  <article key={`near-${day.date}`}>
                    <strong>
                      {day.date} · {day.weekday} · {day.score}分
                    </strong>
                    <span>农历{day.lunarText} · {day.yearGanZhi}年 {day.monthGanZhi}月 {day.dayGanZhi}日</span>
                    <p>不合适原因：{getUnsuitableReasons(day).join("；")}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {customerReviewPanel}

        {result ? (
          <section className="process-panel">
            <div className="process-heading">
              <div>
                <span>推算过程</span>
                <h2 className="font-noto">计算过程</h2>
              </div>
              <p>
                候选 {result.consideredCount} 天 · 推荐 {result.recommendations.length} 天 · 淘汰{" "}
                {result.eliminatedCount} 天
              </p>
            </div>

            <div className="process-grid">
              <article className="process-card">
                <h3 className="font-noto">本次规则</h3>
                <ul>
                  <li>基础分：{activeRule.baseScore}</li>
                  <li>优先规则：{visibleFavorableRules.join("、")}</li>
                  <li>慎避规则：{visibleStandaloneCautionRules.join("、") || "暂无单列慎避项"}</li>
                  <li>强避规则：{visibleHardAvoidRules.join("、") || "暂无"}</li>
                  <li>{HOST_CORE_PURPOSES.includes(form.purpose) ? "家主生肖" : "生日生肖"}：{getProcessZodiacText(result, form)}</li>
                  {FAMILY_INFO_PURPOSES.includes(form.purpose) ? (
                    <li>
                      家属辅助：已填写 {form.familyMembers.filter((member) => member.birthDate).length} 人；若候选日冲家属年柱或日柱，会在温馨提醒中注明对应人员当天不要在现场
                    </li>
                  ) : null}
                  {HOST_CORE_PURPOSES.includes(form.purpose) ? <li>抉山：造葬、修建动土、乔迁、装修按第一梯队处理；已按 24 山坐山计入年/月/日飞星与择时</li> : null}
                </ul>
              </article>

              <article className="process-card">
                <h3 className="font-noto">筛选步骤</h3>
                <ol>
                  <li>生成日期范围内所有候选日，共 {result.consideredCount} 天。</li>
                  <li>读取每一天的农历、干支、冲生肖、宜忌与节气。</li>
                  <li>按当前事项规则逐日加分、扣分、强避淘汰。</li>
                  <li>移除淘汰日期，按综合分排序，取前 3-6 个。</li>
                </ol>
              </article>
            </div>

            <div className="trace-list">
              {result.recommendations.map((day) => (
                <details className="trace-item" key={day.date} open>
                  <summary>
                    <span>
                      {day.date} · {day.weekday} · 农历{day.lunarText}
                    </span>
                    <strong>{day.score}分</strong>
                  </summary>
                  <div className="trace-body">
                    <div className="trace-meta">
                      <span>日课：{day.yearGanZhi}年 {day.monthGanZhi}月 {day.dayGanZhi}日</span>
                      <span>冲生肖：{day.dayChongZodiac || "无"}</span>
                    </div>
                    {day.recommendedHours.length > 0 ? (
                      <div className="trace-hours">
                        {day.recommendedHours.map((hour) => (
                          <span key={`${day.date}-trace-${hour.branch}`}>
                            {getTimeGanZhiText(day.dayGan, hour.branch)}时 {hour.timeRange}：{hour.detail}
                            {hour.segments && hour.segments.length > 0
                              ? `；选刻：${hour.segments
                                  .map((segment) => `${segment.name}${segment.timeRange}${segment.spirits.join("/")}`)
                                  .join("，")}`
                              : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <table>
                      <thead>
                        <tr>
                          <th>规则</th>
                          <th>分值</th>
                          <th>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.scoreBreakdown.map((item) => (
                          <tr className={item.type} key={`${day.date}-${item.label}-${item.detail}`}>
                            <td>{item.label}</td>
                            <td>{formatPoints(item.points)}</td>
                            <td>{item.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>

            <div className="eliminated-panel">
              <h3 className="font-noto">淘汰样本</h3>
              <p>先展示最多 12 个被淘汰日期，用来快速检查强避规则是否过严。</p>
              <div>
                {result.allDays
                  .filter((day) => day.eliminated)
                  .slice(0, 12)
                  .map((day) => (
                    <span key={day.date}>
                      {day.date} · {day.score}分 · {day.cautions.join("；") || "命中淘汰规则"}
                    </span>
                  ))}
                {result.allDays.filter((day) => day.eliminated).length === 0 ? <span>本次没有强避淘汰日期。</span> : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="encyclopedia-panel" id="encyclopedia">
          <div className="encyclopedia-heading">
            <div>
              <span>规则百科</span>
              <h2 className="font-noto">规则百科</h2>
            </div>
            <p>这里汇总已整理入库的规则，便于学习、核实和后续校正。</p>
          </div>
          <div className="encyclopedia-grid">
            {ENCYCLOPEDIA_SECTIONS.map((section) => (
              <article className="encyclopedia-card" key={section.title}>
                <h3 className="font-noto">{section.title}</h3>
                <dl>
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.name}`}>
                      <dt>{item.name}</dt>
                      <dd>{item.detail}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="service-panel" id="service">
          <div className="service-copy">
            <span>服务支持</span>
            <h2 className="font-noto">有疑问可微信联系</h2>
            <p>如对候选日、择时、客户资料填写或规则复核有疑问，可扫码添加微信沟通。</p>
          </div>
          <div className="wechat-card">
            <img src={withBasePath("/wechat-qr.png")} alt="微信二维码" />
            <strong>微信咨询</strong>
            <small>扫码添加，说明择日事项和客户资料</small>
          </div>
        </section>

      </main>

      <footer className="footer">
        <div>
          <div className="brand font-noto">万年红·择日大师</div>
          <p>传承古典智慧，指引现代生活。</p>
        </div>
        <nav aria-label="页脚链接">
          <a href="#">隐私政策</a>
          <a href="#">使用条款</a>
          <a href="#service">联系我们</a>
          <a href="#">关于文化</a>
        </nav>
      </footer>
    </>
  );
}

function getRecommendedHourTitle(purpose: Purpose, day: ScoredDay) {
  if (purpose === "wedding" && day.recommendedHours.length > 0 && day.recommendedHours.every((hour) => hour.relation === "夫星")) {
    return "夫星在以下时辰中选一个";
  }
  if (purpose === "wedding" && day.recommendedHours.length > 0 && day.recommendedHours.every((hour) => hour.relation === "子嗣")) {
    return "子嗣在以下时辰中选一个";
  }
  return "推荐时辰";
}
