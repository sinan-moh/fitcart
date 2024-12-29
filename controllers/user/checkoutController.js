const { request } = require('express');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema');
const Coupon=require('../../models/couponSchema')

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
                paymentMethods: ['COD', 'UPI'],
                shippingAddress: 'Please update your address.',
                addresses: []  // Ensure addresses is passed as an empty array
            });
        }

        // Fetch user's addresses
        const address = await Address.findOne({ userId });
        const addresses = address ? address.address : [];

        // Calculate subtotal
        const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

        // Check if the subtotal qualifies for free delivery
        const deliveryChargeDiscount = subtotal > 5000 ? 65 : 0; // If subtotal > 5000, remove delivery charge

        // Calculate the discount if any (for example, you can apply a fixed discount here)
        const discount = subtotal * 0.1; // 10% discount (just an example)

        // Calculate total with discount and delivery charge adjustments
        const total = subtotal - discount + (deliveryChargeDiscount > 0 ? 0 : 65); // Apply delivery charge discount if any

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
                subtotal: subtotal.toFixed(2),
                tax: (subtotal * 0.1).toFixed(2),  // Calculate tax (example: 10%)
                total: total.toFixed(2),
                discount: discount.toFixed(2),
                deliveryChargeDiscount: deliveryChargeDiscount,
            },
            paymentMethods: ['COD', 'UPI'],
            shippingAddress: addresses.length ? addresses[0] : 'Please add an address.',
            addresses,  // Pass the addresses to the view
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

const applyCoupon = async (req, res) => {
    const { couponCode, totalPrice, userId } = req.body;
    console.log(req.body)

    try {
        // Validate couponCode
        if (!couponCode) {
            return res.status(400).json({ message: 'Coupon code is required.' });
        }

        // Fetch the coupon from the database
        const coupon = await Coupon.findOne({ name: couponCode });

        if (!coupon) {
            return res.status(400).json({ message: 'The coupon code is invalid.' });
        }

        // Check if the coupon has expired
        if (coupon.expireOn < new Date()) {
            return res.status(400).json({ message: 'The coupon code has expired.' });
        }

        // Check if the coupon is still active
        if (!coupon.isList) {
            return res.status(400).json({ message: 'The coupon is no longer active.' });
        }

        // Check if the user is eligible to use this coupon
        if (coupon.eligibleUsers.length > 0 && !coupon.eligibleUsers.includes(userId)) {
            return res.status(400).json({ message: 'You are not eligible to use this coupon.' });
        }

        // Ensure the total price meets the minimum requirement for the coupon
        if (totalPrice < coupon.minimumPrice) {
            return res.status(400).json({
                message: `Order total must be at least ₹${coupon.minimumPrice} to use this coupon.`,
            });
        }

        // Calculate the discount based on the coupon type
        let discount = 0;
        if (coupon.offerPrice > 0) {
            // If the coupon offers a flat discount
            discount = coupon.offerPrice;
        } else if (coupon.discountPercentage > 0) {
            // If the coupon offers a percentage discount
            discount = (totalPrice * coupon.discountPercentage) / 100;
        }

        // Calculate the new total price after applying the coupon discount
        const newTotal = totalPrice - discount;

        // Respond with the new total and discount
        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully!',
            newTotal: newTotal.toFixed(2),  // Round to 2 decimal places
            discount: discount.toFixed(2), // Round to 2 decimal places
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user  || req.session.passport?.user;
        if (!userId) {
            return res.status(401).json({ message: "User is not authenticated" });
        }

        // Fetch user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch user's cart data
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

        // Fetch user's address
        const address = await Address.findOne({ userId });
        if (!address || !address.address || address.address.length === 0) {
            return res.status(400).json({ message: "Please add an address to your account" });
        }

        // Get the first address (adjust if you want a specific address)
        const shippingAddress = address.address[0];
        console.log(shippingAddress);
        

        // Calculate subtotal, discount, and final amount
        const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const deliveryCharge = subtotal > 5000 ? 0 : 65; // Delivery charge
        const discount = subtotal * 0.1; // 10% discount
        const finalAmount = subtotal - discount + deliveryCharge;

        // Prepare the ordered items
        const orderedItems = cart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price,
            flavours: item.flavours,
            weights: item.weights,
        }));

        // Check stock availability and update stock
        for (const item of cart.items) {
            const product = item.productId;
            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }
            product.quantity -= item.quantity; // Deduct the stock
            await product.save(); // Save the updated product
        }

        // Get payment method from request body
        const { paymentMethod } = req.body; // Payment method can be 'COD' or 'UPI'

        // Create a new order object
        const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: subtotal,
            discount,
            finalAmount,
            address: shippingAddress, // Reference to Address model
            invoiceDate: Date.now(),
            status: 'Placed',
        });

        // Save the order
        const savedOrder = await newOrder.save();

        // Clear the cart after placing the order (optional)
        await Cart.updateOne({ userId }, { $set: { items: [] } });

        // Handle payment flow
        if (paymentMethod.toUpperCase() === 'COD') {
            res.status(200).json({
                message: 'Order placed successfully. Please pay on delivery.',
                orderId: savedOrder._id,
            });
        } else if (paymentMethod.toUpperCase() === 'UPI') {
            res.status(200).json({
                message: 'Redirecting to UPI payment gateway.',
                orderId: savedOrder._id,
                paymentLink: 'https://example-upi-payment.com', // Placeholder URL for UPI payment
            });
        } else {
            res.status(400).json({ message: 'Invalid payment method.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error placing order.', error: error.message });
    }
};

const orderConformation=async(req,res)=>{
    try {
        const userId = req.session.user || req.session.passport?.user;;
        const user= await Cart.findOne({ userId })
        res.render('order-sucess',{user})
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
    applyCoupon
};
