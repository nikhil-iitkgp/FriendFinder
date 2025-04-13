const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Logout = require("../models/Logout");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

// @route  POST /api/register
// @desc   Register a new user
// @access Public
router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: "User  already exists" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      user = new User({
        name,
        email,
        password: hashedPassword,
      });

      await user.save();
      res.status(201).json({ msg: "User  registered successfully" });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Server error");
    }
  }
);

// @route  POST /api/login
// @desc   Authenticate user & get token
// @access Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    // Generate JWT token
    const payload = { user: { id: user.id } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/me
// @desc   Get logged-in user details
// @access Private
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  PUT /api/update-location
// @desc   Update user location
// @access Private
router.put("/update-location", authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ msg: "Latitude and longitude are required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User  not found" });
    }

    // Update user location
    user.location = { type: "Point", coordinates: [lng, lat] };
    await user.save();

    res.json({ msg: "Location updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/nearby-users
// @desc   Get users within a given distance
// @access Private
router.get("/nearby-users", authMiddleware, async (req, res) => {
  const { distance } = req.query; // Distance in kilometers
  const maxDistance = distance ? parseFloat(distance) * 1000 : 5000; // Default: 5km

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User  not found" });
    }

    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id }, // Exclude the current user
      location: {
        $near: {
          $geometry: user.location,
          $maxDistance: maxDistance,
        },
      },
    }).select("-password"); // Hide password field

    res.json(nearbyUsers);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  PUT /api/update-wifi
// @desc   Update user's WiFi/Hotspot identifier
// @access Private
router.put("/update-wifi", authMiddleware, async (req, res) => {
  const { wifiIdentifier } = req.body;

  if (!wifiIdentifier) {
    return res.status(400).json({ msg: "WiFi identifier is required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User   not found" });
    }

    user.wifiIdentifier = wifiIdentifier;
    await user.save();

    res.json({ msg: "WiFi identifier updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  PUT /api/update-wifi-networks
// @desc   Update user’s detected WiFi networks
// @access Private
router.put("/update-wifi-networks", authMiddleware, async (req, res) => {
  const { wifiSignals } = req.body;

  if (!wifiSignals || wifiSignals.length === 0) {
    return res.status(400).json({ msg: "WiFi signals are required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User   not found" });
    }

    // Update user's WiFi signals
    user.wifiSignals = wifiSignals;
    await user.save();

    res.json({ msg: "WiFi networks updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/wifi-users
// @desc   Get users with the same WiFi identifier
// @access Private
router.get("/wifi-users", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User   not found" });
    }

    if (!user.wifiIdentifier) {
      return res.status(400).json({ msg: "WiFi identifier not set" });
    }

    const wifiUsers = await User.find({
      _id: { $ne: req.user.id }, // Exclude the current user
      wifiIdentifier: user.wifiIdentifier,
    }).select("-password"); // Hide password field

    res.json(wifiUsers);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  POST /api/send-friend-request/:id
// @desc   Send a friend request
// @access Private
router.post("/send-friend-request/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ msg: "User   not found" });
    }

    if (targetUser.friendRequests.includes(user.id)) {
      return res.status(400).json({ msg: "Friend request already sent" });
    }

    targetUser.friendRequests.push(user.id);
    await targetUser.save();

    res.json({ msg: "Friend request sent" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  POST /api/accept-friend-request/:id
// @desc   Accept a friend request
// @access Private
router.post("/accept-friend-request/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends",
      "name email profilePicture"
    );
    const friend = await User.findById(req.params.id).populate(
      "friends",
      "name email profilePicture"
    );

    if (!friend) {
      return res.status(404).json({ msg: "User  not found" });
    }

    if (!user.friendRequests.includes(friend.id)) {
      return res.status(400).json({ msg: "No friend request from this user" });
    }

    // ✅ Add each other as friends
    user.friends.push(friend.id);
    friend.friends.push(user.id);

    // ✅ Remove friend request from both users
    user.friendRequests = user.friendRequests.filter(
      (id) => id.toString() !== friend.id
    );
    friend.friendRequests = friend.friendRequests.filter(
      (id) => id.toString() !== user.id
    );

    await user.save();
    await friend.save();

    res.json({ msg: "Friend request accepted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  DELETE /api/remove-friend/:id
// @desc   Remove a friend
// @access Private
router.delete("/remove-friend/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(req.params.id);

    if (!friend) {
      return res.status(404).json({ msg: "User   not found" });
    }

    // Remove each other from friends list
    user.friends = user.friends.filter((id) => id.toString() !== friend.id);
    friend.friends = friend.friends.filter((id) => id.toString() !== user.id);

    await user.save();
    await friend.save();

    res.json({ msg: "Friend removed" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/search-wifi
// @desc   Find users with overlapping WiFi networks
// @access Private
router.get("/search-wifi", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.wifiSignals || user.wifiSignals.length === 0) {
      return res.status(400).json({ msg: "WiFi networks not detected" });
    }

    // Find users with at least one common WiFi network
    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id },
      wifiSignals: {
        $elemMatch: {
          bssid: { $in: user.wifiSignals.map((w) => w.bssid) },
        },
      },
    }).select("-password");

    res.json(nearbyUsers);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  GET /api/search-location?distance=5
// @desc   Find users within a given distance (km)
// @access Private
router.get("/search-location", authMiddleware, async (req, res) => {
  const { distance } = req.query;
  const maxDistance = distance ? parseFloat(distance) * 1000 : 5000;

  try {
    const user = await User.findById(req.user.id);
    if (!user.location.coordinates) {
      return res.status(400).json({ msg: "Location not set" });
    }

    const nearbyUsers = await User.find({
      _id: { $ne: req.user.id },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: user.location.coordinates },
          $maxDistance: maxDistance,
        },
      },
    }).select("-password");

    res.json(nearbyUsers);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

// @route  POST /api/logout
// @desc   Logout user by blacklisting token
// @access Private
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(400).json({ msg: "No token provided" });
    }

    const newLogout = new Logout({ token });
    await newLogout.save();

    res.json({ msg: "Logged out successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
