const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// @route  POST /api/block/:id
// @desc   Block a user
// @access Private
router.post("/block/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const blockedUser = await User.findById(req.params.id);

        if (!blockedUser) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.blockedUsers.includes(blockedUser.id)) {
            return res.status(400).json({ msg: "User is already blocked" });
        }

        user.blockedUsers.push(blockedUser.id);
        await user.save();

        res.json({ msg: "User blocked successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  POST /api/unblock/:id
// @desc   Unblock a user
// @access Private
router.post("/unblock/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== req.params.id);
        await user.save();

        res.json({ msg: "User unblocked successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  POST /api/report/:id
// @desc   Report a user
// @access Private
router.post("/report/:id", authMiddleware, async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ msg: "Report reason is required" });
    }

    try {
        const reportedUser = await User.findById(req.params.id);
        if (!reportedUser) {
            return res.status(404).json({ msg: "User not found" });
        }

        reportedUser.reports.push({
            reportedBy: req.user.id,
            reason
        });

        await reportedUser.save();
        res.json({ msg: "User reported successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;
