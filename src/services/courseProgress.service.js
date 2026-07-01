const CourseProgress = require("../models/CourseProgress");

// ── Linh Căn (T1 step 1) ─────────────────────────────────────────────────────

const LINH_CAN_PROFILES = ["Lưu Bị", "Trương Phi", "Quan Vũ", "Khổng Minh", "Tư Mã Ý"];

function normalizeLinhCanIndex(answer) {
  const value =
    typeof answer === "object" && answer !== null
      ? answer.resultIdx ?? answer.linhCanIdx ?? answer.linhCanIndex ?? answer.profileIdx ?? answer.value
      : answer;
  const idx = Number(value);
  return Number.isInteger(idx) && idx >= 0 && idx < LINH_CAN_PROFILES.length ? idx : null;
}

function calculateLinhCanResult(answers) {
  const scores = LINH_CAN_PROFILES.map(() => 0);

  answers.forEach((answer) => {
    if (answer && typeof answer === "object" && answer.scores && typeof answer.scores === "object") {
      LINH_CAN_PROFILES.forEach((_p, idx) => {
        const score = Number(answer.scores[idx]);
        if (Number.isFinite(score) && score > 0) scores[idx] += score;
      });
      return;
    }
    const idx = normalizeLinhCanIndex(answer);
    if (idx !== null) scores[idx] += 1;
  });

  const maxScore = Math.max(...scores);
  if (maxScore <= 0) return null;
  const resultIdx = scores.findIndex((s) => s === maxScore);
  return { resultIdx, profile: LINH_CAN_PROFILES[resultIdx], scores };
}

// ── Coupon / Pricing (T1) ─────────────────────────────────────────────────────

const DISCOUNT_CODES = { HOA_DAO_30: 0.3 };
const BASE_PRICE = 24_000_000;

function validateCouponCode(code) {
  const normalized = (code || "").trim().toUpperCase();
  const discount = DISCOUNT_CODES[normalized] ?? 0;
  return { valid: discount > 0, discount, code: normalized };
}

function calcFinalAmount(couponCode, overrideAmount) {
  const { discount } = validateCouponCode(couponCode);
  if (overrideAmount !== undefined) return overrideAmount;
  return BASE_PRICE - Math.round(BASE_PRICE * discount);
}

// ── Order ID ─────────────────────────────────────────────────────────────────

function genOrderId() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `#TTA${ds}${rand}`;
}

// ── Progress CRUD ─────────────────────────────────────────────────────────────

// Returns the raw doc (lean) or null for a new user.
async function findProgress(userId, tier) {
  return CourseProgress.findOne({ userId, tier }).lean();
}

// Create or update any subset of fields.
async function upsertProgress(userId, tier, fields) {
  return CourseProgress.findOneAndUpdate(
    { userId, tier },
    { $set: fields },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

// ── T1 response shape (maps internal doc → API contract the FE expects) ───────
// Keeping this mapper in the service means the controller stays thin AND
// adding T2 later just means writing a mapT2Response() alongside this one.

function mapT1Response(cp) {
  if (!cp) {
    return {
      currentStep: 0,
      completedSteps: [],
      linhKhi: 0,
      lapTheName: "",
      lapTheSource: "",
      lapTheYoutube: "",
      linhCanAnswers: [],
      linhCanResultIdx: null,
      thienKiepAnswers: [],
      thienKiepNiche: "",
      deferredPay: false,
    };
  }
  return {
    currentStep:      cp.currentStep ?? 0,
    completedSteps:   cp.completedSteps ?? [],
    linhKhi:          cp.linhKhi ?? 0,
    lapTheName:       cp.surveyData?.lapTheName    || "",
    lapTheSource:     cp.surveyData?.lapTheSource  || "",
    lapTheYoutube:    cp.surveyData?.lapTheYoutube || "",
    linhCanAnswers:   cp.quizData?.linhCanAnswers   || [],
    linhCanResultIdx: cp.quizData?.linhCanResultIdx ?? null,
    thienKiepAnswers: cp.quizData?.thienKiepAnswers || [],
    thienKiepNiche:   cp.quizData?.thienKiepNiche   || "",
    deferredPay:      cp.deferredPay ?? false,
  };
}

// ── Daily Chest (server-authoritative cooldown) ───────────────────────────────

const CHEST_CD_MS = 24 * 60 * 60 * 1000;

const CHEST_REWARDS = [
  { type: "linh_khi", icon: "/icons/ic_energy.png",      label: "Linh Khí",        value: "+150 Linh Khí",      linhKhiAmount: 150 },
  { type: "linh_khi", icon: "/icons/ic_energy.png",      label: "Linh Khí",        value: "+200 Linh Khí",      linhKhiAmount: 200 },
  { type: "dan_duoc", icon: "/icons/ic_kimdan.png",      label: "Đan Dược",        value: "×2 Đan Dược",        linhKhiAmount: 0   },
  { type: "phu_luc",  icon: "/icons/ic_exp_present.png", label: "Phụ Lục Bí Kíp", value: "×1 Phụ Lục Bí Kíp", linhKhiAmount: 0   },
  { type: "ngoc",     icon: "/icons/ic_treasure.png",    label: "Ngọc Tu Luyện",  value: "×1 Ngọc Tu Luyện",   linhKhiAmount: 0   },
];

async function getChestStatus(userId) {
  const cp = await CourseProgress.findOne({ userId, tier: "t1" }, { chestLastClaimedAt: 1 }).lean();
  const lastClaimed = cp?.chestLastClaimedAt ?? null;
  const now         = Date.now();
  const canClaim    = !lastClaimed || now - lastClaimed.getTime() >= CHEST_CD_MS;
  const nextClaimAt = lastClaimed ? new Date(lastClaimed.getTime() + CHEST_CD_MS) : null;
  return { canClaim, lastClaimedAt: lastClaimed, nextClaimAt };
}

async function claimChest(userId) {
  const cp = await CourseProgress.findOne({ userId, tier: "t1" }, { chestLastClaimedAt: 1 }).lean();
  const lastClaimed = cp?.chestLastClaimedAt ?? null;
  const now         = new Date();

  if (lastClaimed && now.getTime() - lastClaimed.getTime() < CHEST_CD_MS) {
    return { canClaim: false, nextClaimAt: new Date(lastClaimed.getTime() + CHEST_CD_MS) };
  }

  const reward      = CHEST_REWARDS[Math.floor(Math.random() * CHEST_REWARDS.length)];
  const nextClaimAt = new Date(now.getTime() + CHEST_CD_MS);

  if (reward.linhKhiAmount > 0) {
    await CourseProgress.findOneAndUpdate(
      { userId, tier: "t1" },
      { $set: { chestLastClaimedAt: now }, $inc: { linhKhi: reward.linhKhiAmount } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    await upsertProgress(userId, "t1", { chestLastClaimedAt: now });
  }

  return { canClaim: true, reward, claimedAt: now, nextClaimAt };
}

// ── Step 2 Chat Done (chống bypass step) ─────────────────────────────────────

async function getStep2ChatStatus(userId) {
  const cp = await CourseProgress.findOne({ userId, tier: "t1" }, { step2ChatDone: 1 }).lean();
  return { doneIdxs: cp?.step2ChatDone ?? [] };
}

async function markStep2ChatDone(userId, linhCanIdx) {
  await CourseProgress.findOneAndUpdate(
    { userId, tier: "t1" },
    { $addToSet: { step2ChatDone: linhCanIdx } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const cp = await CourseProgress.findOne({ userId, tier: "t1" }, { step2ChatDone: 1 }).lean();
  return { doneIdxs: cp?.step2ChatDone ?? [] };
}

module.exports = {
  // progress
  findProgress,
  upsertProgress,
  mapT1Response,
  // linh can
  calculateLinhCanResult,
  // coupon / order
  DISCOUNT_CODES,
  BASE_PRICE,
  validateCouponCode,
  calcFinalAmount,
  genOrderId,
  // chest
  getChestStatus,
  claimChest,
  // step 2 chat
  getStep2ChatStatus,
  markStep2ChatDone,
};
