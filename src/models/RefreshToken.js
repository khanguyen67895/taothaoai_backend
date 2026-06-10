const mongoose = require("mongoose");

// Token format sent to client: "<id>.<rawBytes>"
// Only the SHA-256 hash is stored — raw value never persists.
// Single-use rotation: token is revoked the moment it's consumed.
const refreshTokenSchema = new mongoose.Schema(
  {
    _id:       { type: String },  // UUID — used as the lookup key in the token format "<id>.<raw>"
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date,   required: true },
    revoked:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index — Mongo auto-deletes expired docs

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
