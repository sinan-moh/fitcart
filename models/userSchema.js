const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import uuid for referral codes
const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: true, sparse: true, default: null },
    googleId: { type: String, unique: false, sparse: true }, // For Google login
    password: { type: String, required: false },
    isBlocked: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    
    cart: [{ type: Schema.Types.ObjectId, ref: "Cart" }],
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet" },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Wishlist" }],
    orderHistory: [{ type: Schema.Types.ObjectId, ref: "Order" }],

    createdOn: { type: Date, default: Date.now },

    referalcode: {
        type: String,
        unique: true,
        default: () => uuidv4().substring(0, 8).replace(/-/g, '').toUpperCase(),
    },
    redeemed: { type: Boolean, default: false }, 
    redeemedUser: [{ type: Schema.Types.ObjectId, ref: "User" }], 

    searchHistory: [{
        category: { type: Schema.Types.ObjectId, ref: "Category" },
        brand: { type: String },
        searchOn: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model("User", userSchema);

module.exports = User;
