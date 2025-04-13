const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },

  wifiSignals: [
    {
      bssid: String, // Unique WiFi hardware identifier
      strength: Number, // Signal strength in dBm
    },
  ],
  bluetoothIdentifier: {
    type: String,
    default: function () {
        return `BT-${this._id.toString().substring(0, 8)}`; // Assign a unique Bluetooth ID
    },
},


  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  bio: {
    type: String,
    default: "",
  },
  profilePicture: {
    type: String, // URL to profile picture
    default: "https://example.com/default-avatar.jpg",
  },
  isOnline: {
    type: Boolean,
    default: false,
  },

  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  reports: [
    {
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reason: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  
  wifiEnabled: { type: Boolean, default: false },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

userSchema.index({ location: "2dsphere" });

module.exports = User;
