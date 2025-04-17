const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4().substring(0, 10).replace('-', ''),
        unique: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        price: {
            type: Number,
            default: 1,
        },
        flavours: {
            type: String,
        },
        weights: {
            type: String,
        },
        status: {  // ✅ NEW FIELD FOR ITEM-LEVEL STATUS
            type: String,
            enum: ['Placed', 'Cancelled'],
            default: 'Placed',
        },
    }],
    totalPrice: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    finalAmount: {
        type: Number,
        required: true,
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true,
    },
    invoiceDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        required: true,
        enum: ['Placed', 'Processing', 'Payment Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returning', 'Returned'],
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'wallet', 'online-payment'],
        required: true,
    },
    paymentId: {
        type: String
    },
    couponApplied: {
        type: Boolean,
        default: false,
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true,
    },
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
