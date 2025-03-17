const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const walletController = require('../../controllers/user/walletController')
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Get all orders and render them in the order management view
const getOrderlist = async (req, res) => {
    try {
        // Fetch orders with populated user and product details
        const orders = await Order.find()
            .populate('orderedItems.product')
            .populate('userId', 'name');  // Fetch customer name

        if (!orders.length) {
            return res.status(404).send('No orders found');
        }

        // Format orders to include necessary details
        const formattedOrders = orders.map(order => ({
            id: order.orderId,
            customerName: order.userId?.name || 'Unknown',  // If name is not found, show 'Unknown'
            productNames: order.orderedItems.map(item => item.product?.productName || 'Unknown').join(', '),  // Join product names if multiple products
            status: order.status,
        }));

        // Render the page with the formatted orders
        res.render('orderList', { orders: formattedOrders });
    } catch (error) {
        console.error('Error rendering order management page:', error.message);  // Log the actual error message
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

module.exports = {
    getOrderlist,
    updateOrderStatus,
};
