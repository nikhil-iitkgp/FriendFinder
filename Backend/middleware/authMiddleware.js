const jwt = require("jsonwebtoken");
const Logout = require("../models/Logout"); // Import the Logout model

module.exports = async function (req, res, next) {
    // Get token from request headers
    const token = req.header("Authorization");

    // Check if token exists
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    // Check if the token is blacklisted
    const blacklistedToken = await Logout.findOne({ token });
    if (blacklistedToken) {
        return res.status(401).json({ msg: "Session expired. Please log in again." });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Add user info to request object
        next(); // Move to the next middleware/route
    } catch (error) {
        res.status(401).json({ msg: "Invalid token" });
    }
};