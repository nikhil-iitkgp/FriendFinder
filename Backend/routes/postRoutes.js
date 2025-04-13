const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");

// @route  POST /api/posts
// @desc   Create a new post
// @access Private
router.post("/posts", authMiddleware, async (req, res) => {
    const { content, media } = req.body;

    if (!content) {
        return res.status(400).json({ msg: "Content is required" });
    }

    try {
        const newPost = new Post({
            user: req.user.id,
            content,
            media
        });

        await newPost.save();
        res.json(newPost);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  GET /api/posts
// @desc   Get all posts
// @access Private
router.get("/posts", authMiddleware, async (req, res) => {
    try {
        const posts = await Post.find().populate("user", "name email").sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  POST /api/posts/:id/like
// @desc   Like a post
// @access Private
router.post("/posts/:id/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: "Post not found" });
        }

        if (post.likes.includes(req.user.id)) {
            return res.status(400).json({ msg: "You already liked this post" });
        }

        post.likes.push(req.user.id);
        await post.save();

        res.json({ msg: "Post liked successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

// @route  POST /api/posts/:id/comment
// @desc   Comment on a post
// @access Private
router.post("/posts/:id/comment", authMiddleware, async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ msg: "Comment text is required" });
    }

    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: "Post not found" });
        }

        const newComment = {
            user: req.user.id,
            text
        };

        post.comments.push(newComment);
        await post.save();

        res.json({ msg: "Comment added successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server error");
    }
});

module.exports = router;
