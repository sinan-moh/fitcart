const paymentController = require('../../controllers/user/paymentController')
const walletController = require('../../controllers/user/walletController');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Coupon = require('../../models/couponSchema')
const Wallet = require('../../models/walletSchema')
const env = require("dotenv").config();
const Razorpay = require("razorpay");




const getCheckOutPage = async (req, res) => {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
        return res.redirect('/login'); // Redirect if user is not authenticated
    }

    try {
        // Fetch user data
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        // If cart is empty, provide default values
        if (!cart || cart.items.length === 0) {
            return res.render('check-out', {
                user,
                cartItems: [],
                totals: { subtotal: 0, tax: 0, total: 0, discount: 0, deliveryChargeDiscount: 0 },
                paymentMethods: ['COD', 'Online-Payment','Wallet'],
                shippingAddress: 'Please update your address.',
                addresses: [],
            });
        }

        // Fetch user's addresses
        const address = await Address.findOne({ userId });
        const addresses = address ? address.address : [];
        const coupons = await Coupon.find({ isList: true }); 
        
        // Calculate subtotal
        const finalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0) ;
        

        // Check if the subtotal qualifies for free delivery
        const deliveryChargeDiscount = finalPrice > 5000 ? 65 : 0;

      
       
       
        const newTotal = finalPrice + (deliveryChargeDiscount > 0 ? 0 : 65); // Apply delivery charge if no discount

        // if coupon applied feteching the detail of the coupon 
        let coupon = false
        if(cart.coupon){
            coupon = await Cart.findOne({userId}).select('coupon').populate('coupon')
        }
        

  
        
        // Prepare response data
        const checkoutDetails = {
            user,
            cartItems: cart.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
                image: item.productId.productImage && item.productId.productImage[0],
                flavours: item.flavours,
                weights: item.weights,
            })),
            totals: {
                subtotal: finalPrice.toFixed(2),
                total: newTotal.toFixed(2),
                deliveryChargeDiscount: deliveryChargeDiscount,
            },
            paymentMethods: ['COD', 'Online Payment','Wallet'],
            shippingAddress: addresses.length ? addresses[0] : 'Please add an address.',
            addresses, 
            coupons,
            finalPrice:finalPrice,
            coupon,
    
        };

        // Render the checkout page
        res.render('check-out', checkoutDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load checkout page.' });
    }
};


// Add New Address
const addAddress = async (req, res) => {
    try {
        const { name, city, landMark, state, pincode, phone, altPhone, addressType } = req.body;
        const userId = req.session.user || req.session.passport?.user;

        // Validate required fields
        if (!name || !city || !landMark || !state || !pincode || !phone || !addressType) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Validate pincode and phone number formats
        const pincodeRegex = /^[0-9]{6}$/;
        const phoneRegex = /^[0-9]{10}$/;

        if (!pincode.match(pincodeRegex)) {
            return res.status(400).json({ message: "Invalid pincode format. Must be 6 digits." });
        }
        if (!phone.match(phoneRegex)) {
            return res.status(400).json({ message: "Invalid phone number. Must be 10 digits." });
        }

        // Create a new address object
        const newAddress = {
            addressType,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
        };

        // Find the user and push the new address into the address array
        const userAddress = await Address.findOne({ userId });

        if (userAddress) {
            // User exists, add the new address to the address array
            userAddress.address.push(newAddress);
            await userAddress.save();
            return res.status(201).json({ message: "Address added successfully", address: newAddress });
        } else {
            // No existing address for the user, create a new address document
            const newAddressDoc = new Address({
                userId,
                address: [newAddress],
            });
            await newAddressDoc.save();
            return res.status(201).json({ message: "Address added successfully", address: newAddress });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding address", error });
    }
};

// Edit Address
const editAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, city, landMark, state, pincode, phone, altPhone, addressType } = req.body;

        // Validate required fields
        if (!name || !city || !state || !pincode || !phone || !addressType || !landMark) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Validate pincode and phone number formats
        const pincodeRegex = /^[0-9]{6}$/;
        const phoneRegex = /^[0-9]{10}$/;

        if (!pincode.match(pincodeRegex)) {
            return res.status(400).json({ message: "Invalid pincode format. Must be 6 digits." });
        }
        if (!phone.match(phoneRegex)) {
            return res.status(400).json({ message: "Invalid phone number. Must be 10 digits." });
        }

        // Find user address and the specific address to update
        const userAddress = await Address.findOne({ "address._id": id, userId: req.session.user });
        if (!userAddress) {
            return res.status(404).json({ message: "Address not found!" });
        }

        const addressToUpdate = userAddress.address.id(id);

        // Update the fields
        if (name) addressToUpdate.name = name;
        if (city) addressToUpdate.city = city;
        if (landMark) addressToUpdate.landMark = landMark;
        if (state) addressToUpdate.state = state;
        if (pincode) addressToUpdate.pincode = pincode;
        if (phone) addressToUpdate.phone = phone;
        if (altPhone) addressToUpdate.altPhone = altPhone;
        if (addressType) addressToUpdate.addressType = addressType;

        await userAddress.save();

        res.status(200).json({ message: "Address updated successfully!", address: addressToUpdate });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your Razorpay Secret Key
});

const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, addressId } = req.body;
        const userId = req.session.user || req.session.passport?.user;

        if (!userId) return res.status(401).json({ message: "User is not authenticated" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0)
            return res.status(400).json({ message: "Your cart is empty" });

        const finalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        let discount = 0;
        if (cart.coupon) {
            const populatedCart = await Cart.findOne({ userId }).populate('coupon');
            discount = populatedCart.coupon?.offerPrice || 0;
        }

        const deliveryCharge = finalPrice > 5000 ? 0 : 65;
        const finalAmount = (finalPrice - discount) + deliveryCharge;

        // Block COD if amount > 2000
        if (paymentMethod === "cod" && finalAmount > 2000) {
            return res.status(400).json({ message: "COD is not allowed for orders above ₹2000. Please choose another payment method." });
        }

        // Check wallet balance
        if (paymentMethod === "wallet") {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.avaliableBalance < finalAmount) {
                return res.status(400).json({ message: "Insufficient wallet balance" });
            }
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price,
            flavours: item.flavours,
            weights: item.weights,
        }));

        // Stock validation
        for (const item of cart.items) {
            const product = item.productId;
            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }
            product.quantity -= item.quantity;
            await product.save();
        }

        // ✅ Razorpay logic if online payment
        let razorOrder = null;
        if (paymentMethod === 'online-payment') {
            razorOrder = await paymentController.createPayment(finalAmount);
            if (!razorOrder) return res.status(500).json({ message: 'Server error creating Razorpay order' });
        }

        const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: finalPrice,
            discount,
            finalAmount,
            address: addressId,
            invoiceDate: Date.now(),
            status: (paymentMethod === 'cod' || paymentMethod === 'wallet') ? 'Placed' : 'Payment Pending',
            paymentId: (paymentMethod === 'online-payment') ? razorOrder.orderId : null,
            couponApplied: discount !== 0,
            paymentMethod, // ✅ Save the payment method here
        });

        await Cart.updateOne({ userId }, { $set: { coupon: null } });
        const savedOrder = await newOrder.save();
        await Cart.updateOne({ userId }, { $set: { items: [] } });

        // COD success
        if (paymentMethod === 'cod') {
            return res.status(200).json({ message: 'order success', paymentMethord: 'cod' });
        }

        // Wallet success
        if (paymentMethod === 'wallet') {
            await walletController.updateWallet(finalPrice, "debit", userId, "Purchase", savedOrder._id);
            return res.status(200).json({ message: 'order success', paymentMethord: 'wallet' });
        }

        // Razorpay success
        if (paymentMethod === 'online-payment') {
            req.session.pendingOrder = {
                razorpayOrderId: razorOrder.orderId,
                userId,
                orderId: savedOrder._id
            };

            await Order.updateOne(
                { _id: savedOrder._id },
                { $set: { status: "Payment Pending" } }
            );

            return res.status(200).json({
                orderId: razorOrder.orderId,
                orderAmount: razorOrder.orderAmount,
                RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
                userName: user.name,
                email: user.email,
                phoneNumber: user.phone,
                paymentMethord: 'online-payment'
            });
        }

        return res.status(400).json({ message: 'Something went wrong' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error placing order.', error: error.message });
    }
};





const orderConformation = async (req, res) => {
    try {
        const userId = req.session.user || req.session.passport?.user;;
        const user = await Cart.findOne({ userId })
        res.render('order-sucess', { user })
    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Error placing order.', error: error.message });
    }
}




module.exports = {
    getCheckOutPage,
    addAddress,
    editAddress,
    placeOrder,
    orderConformation,
    
};
