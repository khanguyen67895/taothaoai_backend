const mongoose = require("mongoose");

// One document per (user, tier) pair.
// Replaces the embedded User.t1 block — see scripts/migrate-t1-to-progress.js
// to migrate existing data.
//
// Adding T2-T10 = just insert a new doc with tier:"t2", etc.
// No User model changes needed.
const courseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // "t1" | "t2" | ... | "t10"
    tier: {
      type: String,
      required: true,
      enum: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10"],
    },

    // ── Progress (shared across all tiers) ────────────────────────────────────
    currentStep:    { type: Number,   default: 0 },
    completedSteps: { type: [Number], default: [] },
    linhKhi:        { type: Number,   default: 0 },

    // ── Tier-specific data (flexible, defined per tier) ───────────────────────
    // T1 surveyData: { lapTheName, lapTheSource, lapTheYoutube }
    surveyData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // T1 quizData: { linhCanAnswers, linhCanResultIdx, thienKiepAnswers, thienKiepNiche }
    quizData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Gamification (server-authoritative, không lưu localStorage) ───────────
    // Rương hàng ngày: timestamp lần cuối user claim — kiểm tra cooldown phía server
    chestLastClaimedAt: { type: Date,     default: null },
    // Step 2 chat done: mảng linhCanIdx đã hoàn thành chat — chống bypass step
    step2ChatDone:      { type: [Number], default: []   },
  },
  { timestamps: true }
);

// One progress record per user per tier
courseProgressSchema.index({ userId: 1, tier: 1 }, { unique: true });

module.exports = mongoose.model("CourseProgress", courseProgressSchema);
