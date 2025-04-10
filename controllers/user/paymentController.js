const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv").config();
const Order = require("../../models/orderSchema");

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Payment Order
const createPayment = async (amount) => {
    try {
        console.log("🔧 Creating Razorpay Order...");

        const options = {
            amount: amount * 100, // Convert to paisa
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
            payment_capture: 1
        };

        const order = await razorpayInstance.orders.create(options);

        return {
            orderId: order.id,
            currency: order.currency,
            orderAmount: order.amount // Use `orderAmount` key here to match frontend expectation
        };

    } catch (error) {
        console.error("❌ Error creating Razorpay order:", error);
        return null;
    }
};

// ✅ Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // ✅ Payment is verified
            const pendingOrder = req.session.pendingOrder;
            if (!pendingOrder || pendingOrder.razorpayOrderId !== razorpay_order_id) {
                return res.status(400).json({ message: "Invalid session data." });
            }

            // Update order status
            await Order.updateOne(
                { _id: pendingOrder.orderId },
                { $set: { status: "Placed", paymentId: razorpay_payment_id } }
            );

            delete req.session.pendingOrder;

            return res.status(200).json({ message: "Payment verified and order placed successfully." });

        } else {
            console.log(" Razorpay Signature Verification Failed");

            const order = await Order.findOne({ paymentId: razorpay_order_id }) || await Order.findById(razorpay_order_id);
            const orderId = order?._id || razorpay_order_id;
            const amount = order?.finalAmount || 0;
            const retryUrl = `/retry-payment/${orderId}`;

            return res.render("orderFailPage", {
                orderId,
                amount,
                status: "Payment Failed",
                retryUrl
            });
        }

    } catch (error) {
        console.error(" Error verifying Razorpay payment:", error);
        return res.status(500).json({ message: "Payment verification failed.", error: error.message });
    }
};

module.exports = {
    createPayment,
    verifyRazorpayPayment,
};
