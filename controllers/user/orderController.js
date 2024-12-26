const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Address=require('../../models/addressSchema')



const getOrdersPage = async (req, res) => {
    const userId = req.session.user  || req.session.passport?.user;;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        const user =await User.findById( userId )
        // Fetch orders for the logged-in user
        const orders = await Order.find({ userId })  // Find orders belonging to the user
            .populate({
                path: 'orderedItems.product',  // Populate the product details
                model: 'Product',
            })
            .populate({
                path: 'address',  // Populate the address details
                model: 'Address',
            });

        if (!orders || orders.length === 0) {
            return res.render('my-orders', { orders: [], message: 'No orders found.' });
        }

        res.render('my-orders', { orders ,user});
    } catch (error) {
        console.error("Error fetching orders:", error.message);
        res.status(500).send("Error fetching orders.");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // If order status is not 'Cancelled', change it to 'Cancelled' and update stock
        if (order.status !== 'Cancelled') {
            // Update stock for all products in the order
            for (const item of order.orderedItems) {
                const product = await Product.findById(item.product._id);
                if (product) {
                    product.quantity += item.quantity; // Increment the stock
                    await product.save();
                }
            }

            order.status = 'Cancelled';
            await order.save();

            res.json({ success: true, message: 'Order cancelled successfully and stock updated' });
        } else {
            res.json({ success: false, message: 'Order is already cancelled' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error cancelling the order', error: error.message });
    }
};

const removeProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the index of the product to remove
        const productIndex = order.orderedItems.findIndex(item => item.product._id.toString() === productId);

        if (productIndex !== -1) {
            const product = await Product.findById(order.orderedItems[productIndex].product._id);

            if (product) {
                // Increment the stock by the removed quantity
                product.quantity += order.orderedItems[productIndex].quantity;
                await product.save();
            }

            // Remove the product from the order
            order.orderedItems.splice(productIndex, 1);

            // If no products are left, cancel the order
            if (order.orderedItems.length === 0) {
                order.status = 'Cancelled';
            }

            await order.save();
            res.json({ success: true, message: 'Product removed successfully and stock updated' });
        } else {
            res.json({ success: false, message: 'Product not found in the order' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error removing the product', error: error.message });
    }
};

const orderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId =req.session.user  || req.session.passport?.user;
        console.log(`Fetching details for order ID: ${orderId}`);
        
        // Fetch the order by its ID and populate the address field
         const order = await Order.findOne({_id:orderId}).populate('orderedItems.product')
       
        let address = await Address.find({userId})
         address=address[0].address.find((addr)=>{  
            return addr._id.equals(order.address);
        });
       
        
        
        // If the order is not found
        if (!order) {
            return res.status(404).render('page-404', { message: 'Order not found.' });
        }

        // If the address is null (not populated)
        if (!order.address) {
            console.error('Address not found for the order.');
            return res.status(404).render('page-404', { message: 'Address not found for this order.' });
        }

        // Pass the order and address to the view
        res.render('order-details', { order ,address});
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('page-404', { message: 'An error occurred while fetching order details.' });
    }
};




module.exports = { 
    getOrdersPage,
     cancelOrder ,
     removeProduct,
     orderDetails,


};
