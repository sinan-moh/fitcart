const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true // Fixed typo: 'unique' instead of 'uniqUe'
    },
    createOn: {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true
    },
    minimumPrice: { // Changed 'minimumprice' to 'minimumPrice' for consistency
        type: Number,
        required: true
    },
    isList: {
        type: Boolean,
        default: true
    },
    couponUsedBy: [ { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
