const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const walletController = require('../../controllers/user/walletController')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getOrderlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Set how many orders per page
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find()
            .populate('orderedItems.product')
            .populate('userId', 'name')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        if (!orders.length && page > 1) {
            return res.redirect(`/admin/orders?page=${page - 1}`);
        }

        const formattedOrders = orders.map(order => ({
            id: order.orderId,
            customerName: order.userId?.name || 'Unknown',
            productNames: order.orderedItems.map(item => item.product?.productName || 'Unknown').join(', '),
            status: order.status,
        }));

        res.render('orderList', {
            orders: formattedOrders,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error('Error rendering order management page:', error.message);
        res.status(500).send('Failed to load the order management page.');
    }
};



// Update order status based on request
const updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;
    console.log('Order ID:', orderId); // Useful for debugging

    // Valid statuses
    const validStatuses = ['Placed','Processing', 'Shipped', 'Delivered', 'Rejected',"Returning","Returned"];

    // Check if the provided status is valid
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        // Find the order by its orderId
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if the order is already delivered or rejected (to prevent updates)
        if (order.status === 'Delivered' || order.status === 'Rejected') {
            return res.status(400).json({
                success: false,
                message: `Order cannot be updated because it is already ${order.status}`,
            });
        }
        console.log(order.status)
        if(order.status === 'Returning'){
            await walletController.updateWallet(order.finalAmount,"credit",order.userId,"Return",order.orderId);
        }

        // Update the order status
        order.status = status;
        await order.save();

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order: order, // Optionally, return the updated order details
        });
    } catch (error) {
        console.error('Error updating order status:', error);  // Logging detailed error
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the order status.',
        });
    }
};
const getOrderDetails = async (req, res) => {
    const orderId = req.params.orderId;

    try {
        let order;

        if (mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findOne({
                $or: [
                    { orderId: orderId },
                    { _id: orderId }
                ]
            })
                .populate('userId')
                .populate('orderedItems.product')
                .lean();
        } else {
            order = await Order.findOne({ orderId: orderId })
                .populate('userId')
                .populate('orderedItems.product')
                .lean();
        }

        if (!order) {
            return res.redirect('/pageerror');
        }

        // Get the user's address document
        const addressDoc = await Address.findOne({ userId: order.userId }).lean();

        if (!addressDoc || !addressDoc.address || addressDoc.address.length === 0) {
            return res.status(404).render('page-404', { message: 'Address not found for this order.' });
        }

        // Find the specific address object from the array that matches order.address
        const address = addressDoc.address.find(addr => addr._id.toString() === order.address.toString());

        if (!address) {
            return res.status(404).render('page-404', { message: 'Matching address not found in user address list.' });
        }

        // Attach to order object
        order.fullAddress = address;

        res.render('orderDetails', { order });
    } catch (error) {
        console.error('Error fetching order details:', error.message);
        res.redirect('/pageerror');
    }
};


module.exports = {
    getOrderlist,
    updateOrderStatus,
    getOrderDetails
};
