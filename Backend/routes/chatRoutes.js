const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Message = require("../models/Message");

// @route  POST /api/messages
// @desc   Send a message
// @access Private
router.post("/messages", authMiddleware, async (req, res) => {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
        return res.status(400).json({ msg: "Receiver ID and message are required" });
    }

    try {
        const newMessage = new Message({
            sender: req.user.id,
            receiver: receiverId,
            message,
        });

        await newMessage.save();
        res.json({ msg: "Message sent successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  GET /api/messages/:friendId
// @desc   Get chat history with a friend
// @access Private
router.get("/messages/:friendId", authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: req.params.friendId },
                { sender: req.params.friendId, receiver: req.user.id },
            ],
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;
