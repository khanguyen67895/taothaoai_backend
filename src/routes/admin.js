const express = require("express");
const router = express.Router();

const { protect, requireAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);

router.get("/contacts", adminController.getContacts);
router.patch("/contacts/:id/read", adminController.markContactRead);
router.delete("/contacts/:id", adminController.deleteContact);

module.exports = router;
