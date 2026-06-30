require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

const ADMIN_EMAIL    = "admin@taothao.ai";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Taothao@2026";
const ADMIN_FULLNAME = "Admin Tao Thao";

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  let user = await User.findOne({ $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }] }).select("+password");

  if (user) {
    user.password = ADMIN_PASSWORD;
    user.role = "admin";
    await user.save();
    console.log(`Updated admin: ${user.email} (username: ${user.username})`);
  } else {
    user = await User.create({
      fullName: ADMIN_FULLNAME,
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      role: "admin",
      isEmailVerified: true,
    });
    console.log(`Created admin: ${user.email} (username: ${user.username})`);
  }

  process.exit(0);
}).catch(err => { console.error(err.message); process.exit(1); });
