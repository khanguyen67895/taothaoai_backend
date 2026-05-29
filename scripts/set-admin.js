require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/set-admin.js <email>"); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
  if (!user) { console.error("Không tìm thấy user:", email); process.exit(1); }
  console.log(`OK: ${user.email} => role: ${user.role}`);
  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
