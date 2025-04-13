const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Multer Storage for Image Uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ✅ Serve Uploaded Images
router.use("/uploads", express.static(uploadDir));

// @route  GET /api/profile
// @desc   Get current user profile
// @access Private
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("friendRequests", "name email profilePicture")
      .populate("friends", "name email profilePicture"); // ✅ Populate friends list

    if (!user) {
      return res.status(404).json({ msg: "User  not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  PUT /api/profile
// @desc   Update user profile with Profile Picture
// @access Private
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { name, bio } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User  not found" });

      if (name) user.name = name;
      if (bio) user.bio = bio;

      // ✅ Delete old profile picture if updating
      if (req.file && user.profilePicture) {
        const oldImagePath = path.join(__dirname, "..", user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // ✅ Save new profile picture
      if (req.file) {
        user.profilePicture = `/uploads/${req.file.filename}`;
      }

      await user.save();
      res.json({ msg: "Profile updated successfully", user });
    } catch (error) {
      console.error("Error updating profile:", error.message);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

// @route  GET /api/search
// @desc   Search users by name or email
// @access Private
router.get("/search", authMiddleware, async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ msg: "Search query is required" });
  }

  try {
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");

    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/online-users
// @desc   Get all online users
// @access Private
router.get("/online-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ isOnline: true }).select("-password");
    res.json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
