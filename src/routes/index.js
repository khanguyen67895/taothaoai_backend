const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/admin", require("./admin"));
router.use("/landing", require("./landing"));
router.use("/t1", require("./t1"));
router.use("/user", require("./user"));

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is running", timestamp: new Date().toISOString() });
});

module.exports = router;
