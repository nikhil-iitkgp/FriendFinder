const mongoose = require("mongoose");

const logoutSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: "2d" // Token expires in 2 day
    }
});

const Logout = mongoose.model("Logout", logoutSchema);
module.exports = Logout;
