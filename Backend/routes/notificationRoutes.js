const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

// @route  GET /api/notifications
// @desc   Get user notifications
// @access Private
router.get("/notifications", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  PUT /api/notifications/mark-as-read
// @desc   Mark all notifications as read
// @access Private
router.put("/notifications/mark-as-read", authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
        res.json({ msg: "Notifications marked as read" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;
