const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv").config();
const Order = require("../../models/orderSchema");

// Initialize Razorpay
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Payment Order
const createPayment = async (amount) => {
    try {
        console.log("Creating Razorpay Order...");

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
            amount: order.amount
        };

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        return null;
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const secret = process.env.RAZORPAY_KEY_SECRET;

        // Generate HMAC Signature
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature === razorpay_signature) {
            // Check if session order exists
            const pendingOrder = req.session.pendingOrder;
            if (!pendingOrder) {
                return res.status(400).json({ message: "Invalid session data." });
            }

            // Update Order Status to 'Placed' (or you can use 'Completed' based on your logic)
            await Order.updateOne(
                { paymentId: razorpay_order_id },
                { $set: { status: "Placed", paymentId: razorpay_payment_id } }
            );

            // Clear pending order session
            delete req.session.pendingOrder;

            // Redirect to order confirmation page
            return res.redirect("/order-confirmation");

        } else {
            console.log("Razorpay Signature Verification Failed");

            // Fetch order details for failure handling
            const order = await Order.findOne({ paymentId: razorpay_order_id }) || await Order.findById(razorpay_order_id);

            const orderId = order ? order.orderId : razorpay_order_id;
            const amount = order ? order.finalAmount || 0 : 0;
            const status = "Payment Pending"; 

            // Generate retry URL
            const retryUrl = `/retry-payment/${orderId}`;

            // Rendering order failure page with necessary information
            return res.render("orderFailPage", { orderId, amount, status, retryUrl });
        }
    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        return res.status(500).json({ message: "Payment verification failed.", error: error.message });
    }
};

module.exports = {
    createPayment,
    verifyRazorpayPayment,
   
};
