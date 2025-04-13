const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Import the User model

// Endpoint to find nearby users based on WiFi
router.get("/nearby-wifi", async (req, res) => {
    try {
        const nearbyUsers = await User.find({ wifiEnabled: true }); // Fetch users who have WiFi enabled
        res.json(nearbyUsers);
    } catch (error) {
        console.error("Error fetching nearby users:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/nearby-bluetooth", async (req, res) => {
    try {
        const { bluetoothIdentifier } = req.query; // Get Bluetooth ID from request query

        if (!bluetoothIdentifier) {
            return res.status(400).json({ message: "Bluetooth identifier is required" });
        }

        // Find users with matching Bluetooth identifiers (excluding the requester)
        const nearbyUsers = await User.find({
            bluetoothIdentifier: { $ne: null, $eq: bluetoothIdentifier },
        }).select("name email bluetoothIdentifier");

        res.json(nearbyUsers);
    } catch (error) {
        console.error("Error fetching nearby friends via Bluetooth:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
