const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4().substring(0,10).replace('-',''),
        unique: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true, // Optimizing queries
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
            required: false, // Optional if not applicable for all products
        },
        weights: {
            type: String,
            required: false, // Optional if not applicable for all products
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
    address: {  // Single Address
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
        enum: ['Placed','Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true,
    },
    couponApplied: {
        type: Boolean,
        default: false,
    },
});


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
