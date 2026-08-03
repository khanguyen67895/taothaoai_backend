const User       = require("../models/User");
const Contact    = require("../models/Contact");
const YSuContact = require("../models/YSuContact");
const ToolLead   = require("../models/ToolLead");

// GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.search) {
      const re = new RegExp(req.query.search, "i");
      filter.$or = [{ fullName: re }, { email: re }, { username: re }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users.map((u) => u.toPublicJSON()),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    }
    res.json({ success: true, data: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role không hợp lệ (user | admin)" });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "Không thể tự thay đổi role của mình" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    }

    res.json({ success: true, message: `Đã cập nhật role thành ${role}`, data: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "Không thể xoá tài khoản của chính mình" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản" });
    }

    res.json({ success: true, message: "Đã xoá tài khoản thành công" });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/contacts
// Query params:
//   search   — tìm theo tên, sđt hoặc email (1 ô duy nhất)
//   problem  — lọc theo vấn đề (exact)
//   mode     — lọc theo hình thức học
//   status   — lọc theo trạng thái (new|converted|processing|lost)
//   isRead   — lọc đã đọc (true|false)
//   page, limit
exports.getContacts = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }];
    }

    if (req.query.problem) filter.problem   = req.query.problem;
    if (req.query.mode)    filter.mode      = req.query.mode;
    if (req.query.status)  filter.status    = req.query.status;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

    const [contacts, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/contacts/:id/read
exports.markContactRead = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!contact) {
      return res.status(404).json({ success: false, message: "Không tìm thấy liên hệ" });
    }
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/contacts/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Không tìm thấy liên hệ" });
    }
    res.json({ success: true, message: "Đã xoá liên hệ thành công" });
  } catch (err) {
    next(err);
  }
};

// ─── Y SƯ contacts ────────────────────────────────────────────────────────────

// GET /api/admin/ysu-contacts
// Query: search (zalo/youtube), status, isRead, page, limit
exports.getYSuContacts = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ zalo: re }, { youtubeChannel: re }, { symptoms: re }];
    }
    if (req.query.status)            filter.status  = req.query.status;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

    const [contacts, total] = await Promise.all([
      YSuContact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      YSuContact.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/ysu-contacts/:id
exports.updateYSuContact = async (req, res, next) => {
  try {
    const allowed = ["status", "isRead", "assignedTo", "notes"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Không có trường nào để cập nhật" });
    }

    const contact = await YSuContact.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!contact) return res.status(404).json({ success: false, message: "Không tìm thấy liên hệ Y Sư" });

    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/ysu-contacts/:id
exports.deleteYSuContact = async (req, res, next) => {
  try {
    const contact = await YSuContact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: "Không tìm thấy liên hệ Y Sư" });
    res.json({ success: true, message: "Đã xoá liên hệ Y Sư" });
  } catch (err) {
    next(err);
  }
};

// ─── Tool leads (trang "Tải Tool") ────────────────────────────────────────────

// GET /api/admin/tool-leads
// Query: search (name/phone/email/toolName), status, isRead, page, limit
exports.getToolLeads = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const re = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }, { toolName: re }];
    }
    if (req.query.status)            filter.status  = req.query.status;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

    const [leads, total] = await Promise.all([
      ToolLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ToolLead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tool-leads/:id
exports.updateToolLead = async (req, res, next) => {
  try {
    const allowed = ["status", "isRead", "assignedTo", "notes"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Không có trường nào để cập nhật" });
    }

    const lead = await ToolLead.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: "Không tìm thấy lead tool" });

    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/tool-leads/:id
exports.deleteToolLead = async (req, res, next) => {
  try {
    const lead = await ToolLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Không tìm thấy lead tool" });
    res.json({ success: true, message: "Đã xoá lead tool" });
  } catch (err) {
    next(err);
  }
};
