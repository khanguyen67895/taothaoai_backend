/**
 * One-time migration: copy User.t1.* → CourseProgress { tier: "t1" }
 *
 * Run ONCE before deploying the new code:
 *   node scripts/migrate-t1-to-progress.js
 *
 * Safe to re-run (upsert — won't duplicate records).
 * After confirming all data is migrated, you can drop the `t1` field
 * from existing User documents with the optional cleanup step at the end.
 */

require("dotenv").config();
const mongoose       = require("mongoose");
const CourseProgress = require("../src/models/CourseProgress");

// Read User docs directly (bypass the updated model that has no t1 field)
// so we can still see the legacy embedded data.
const userSchema = new mongoose.Schema({}, { strict: false });
const UserRaw    = mongoose.model("UserRaw", userSchema, "users");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const users = await UserRaw.find({ "t1.currentStep": { $exists: true } }).lean();
  console.log(`Found ${users.length} user(s) with legacy t1 data`);

  let migrated = 0;
  let skipped  = 0;

  for (const user of users) {
    const t1 = user.t1 || {};

    // Skip users that already have a CourseProgress record
    const existing = await CourseProgress.findOne({ userId: user._id, tier: "t1" });
    if (existing) {
      skipped++;
      continue;
    }

    await CourseProgress.create({
      userId:         user._id,
      tier:           "t1",
      currentStep:    t1.currentStep    ?? 0,
      completedSteps: t1.completedSteps ?? [],
      linhKhi:        t1.linhKhi        ?? 0,
      surveyData: {
        lapTheName:    t1.lapTheName    || "",
        lapTheSource:  t1.lapTheSource  || "",
        lapTheYoutube: t1.lapTheYoutube || "",
      },
      quizData: {
        linhCanAnswers:   t1.linhCanAnswers   || [],
        linhCanResultIdx: t1.linhCanResultIdx ?? null,
        thienKiepAnswers: t1.thienKiepAnswers || [],
        thienKiepNiche:   t1.thienKiepNiche   || "",
      },
    });

    migrated++;
  }

  console.log(`Migrated: ${migrated} | Skipped (already exists): ${skipped}`);

  // ── Optional cleanup ────────────────────────────────────────────────────────
  // After verifying the migration is correct, uncomment to strip the legacy
  // t1 field from all User documents:
  //
  // const result = await UserRaw.updateMany({}, { $unset: { t1: "" } });
  // console.log(`Cleaned up t1 field from ${result.modifiedCount} user(s)`);

  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
