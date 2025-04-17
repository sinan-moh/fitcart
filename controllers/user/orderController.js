const mongoose = require("mongoose");  
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const walletController = require('../../controllers/user/walletController');
const paymentController = require('../../controllers/user/paymentController');
const fs = require("fs");
const path = require("path");
const pdf = require("html-pdf"); 


//  Fetch orders for the logged-in user
const getOrdersPage = async (req, res) => {
    const userId = req.session.user || req.session.passport?.user;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(userId);
        const orders = await Order.find({ userId })
            .populate('orderedItems.product')
            .populate('address')
            .sort({ createdOn: -1 });

        res.render('my-orders', { orders, user, message: orders.length ? '' : 'No orders found.' });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Error fetching orders.");
    }
};

//  Cancel an order and refund (if applicable)
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Allow cancellation only if not already cancelled or shipped
        if (order.status === 'Cancelled') {
            return res.json({ success: false, message: 'Order is already cancelled' });
        }
        if (order.status === 'Shipped') {
            return res.json({ success: false, message: 'Shipped orders cannot be cancelled' });
        }

        //  Update stock for all products in the order
        for (const item of order.orderedItems) {
            const product = await Product.findById(item.product._id);
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }

        //  Refund to wallet if payment was online
        if (order.paymentId) {
            await walletController.updateWallet(order.finalAmount, "credit", order.userId, "Refund", order._id);
        }

        order.status = 'Cancelled';
        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully and stock updated' });
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

      const productIndex = order.orderedItems.findIndex(item => item.product._id.toString() === productId);
      if (productIndex === -1) {
          return res.json({ success: false, message: 'Product not found in the order' });
      }

      const removedItem = order.orderedItems[productIndex];
      const product = await Product.findById(removedItem.product._id);

      if (product) {
          product.quantity += removedItem.quantity; // Update product stock
          await product.save();
      }

      // Refund to wallet for removed product
      const refundAmount = removedItem.quantity * removedItem.product.salePrice;
      if (refundAmount > 0) {
          await walletController.updateWallet(refundAmount, "credit", order.userId, "Product Removed", order._id);
      }

      // Mark the specific product as 'Cancelled' in the orderedItems
      order.orderedItems[productIndex].status = 'Cancelled';  // Change the product status to 'Cancelled'

      // Explicitly mark the orderedItems array as modified so that Mongoose persists the change
      order.markModified('orderedItems');

      order.totalPrice -= refundAmount;
      order.discount = order.totalPrice > 1000 ? order.totalPrice * 0.1 : 0;
      order.finalAmount = order.totalPrice - order.discount;

      // If the order has no items left, mark the overall order as 'Cancelled'
      if (order.orderedItems.length === 0) {
          order.status = 'Cancelled'; // Set overall order status to 'Cancelled' if no items left
          order.totalPrice = 0;
          order.discount = 0;
          order.finalAmount = 0;
      }

      await order.save();

      res.json({
          success: true,
          message: 'Product status changed to cancelled, stock updated, and refund issued',
          order: { totalPrice: order.totalPrice, discount: order.discount, finalAmount: order.finalAmount },
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error removing the product', error: error.message });
  }
};



const invoiceDownload = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      // Validate orderId
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ error: "Invalid order ID format" });
      }
  
      // Fetch order details
      const order = await Order.findById(orderId)
        .populate("userId", "name email")
        .populate("orderedItems.product", "productName productImage")
        .exec();
  
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
  
      const userId = order.userId._id;
      const addressId = order.address;
  
      // Fetch address
      const user = await Address.findOne({ userId });
      const specificAddress = user?.address.find(
        (addr) => addr._id.toString() === addressId.toString()
      );
  
      if (!specificAddress) {
        return res.status(404).json({ error: "Address not found" });
      }
  
      // Create invoice HTML
      const invoiceHTML = `
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 20px; }
              .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #3498db; }
              .order-details, .address { margin-bottom: 20px; }
              .product-list table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .product-list th, .product-list td { padding: 10px; border: 1px solid #ddd; text-align: left; }
              .product-list th { background-color: #3498db; color: white; }
              .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 30px; color: #777; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Invoice</h1>
                <p>Order ID: ${order.orderId}</p>
                <p>Invoice Date: ${new Date().toLocaleDateString()}</p>
              </div>
              <div class="order-details">
                <p><strong>Billing Name:</strong> ${order.userId.name}</p>
                <div class="address">
                  <p><strong>Billing Address:</strong> ${specificAddress.addressType}, ${specificAddress.landMark || ""}, ${specificAddress.city}, ${specificAddress.state} - ${specificAddress.pincode}</p>
                  <p><strong>Phone:</strong> ${specificAddress.phone}</p>
                </div>
                <p><strong>Total Price:</strong> ₹${order.finalAmount}</p>
              </div>
              <div class="product-list">
                <h3>Ordered Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.orderedItems.map(item => `
                      <tr>
                        <td>${item.product.productName}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price}</td>
                        <td>₹${item.quantity * item.price}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
              <div class="total">
                <p>Total Amount: ₹${order.finalAmount}</p>
              </div>
              <div class="footer">
                <p>Thank you for shopping with us!</p>
              </div>
            </div>
          </body>
        </html>
      `;
  
      // Define PDF file path
      const pdfPath = path.join(__dirname, `../../invoices/invoice-${orderId}.pdf`);
  
      // Generate PDF
      pdf.create(invoiceHTML, { format: "A4" }).toFile(pdfPath, (err) => {
        if (err) {
          console.error("Error generating PDF:", err);
          return res.status(500).json({ error: "Error generating invoice PDF" });
        }
  
        // Send file for download
        res.download(pdfPath, `Invoice-${orderId}.pdf`, (downloadErr) => {
          if (downloadErr) {
            console.error("Error sending PDF:", downloadErr);
            res.status(500).json({ error: "Error sending invoice PDF" });
          }
  
          // Optional: Delete the file after sending to save storage
          setTimeout(() => fs.unlinkSync(pdfPath), 5000);
        });
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Error generating invoice PDF" });
    }
  };
// Order details
const orderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user || req.session.passport?.user;

        const order = await Order.findById(orderId).populate('orderedItems.product');
        if (!order) {
            return res.status(404).render('page-404', { message: 'Order not found.' });
        }

        let addressData = await Address.findOne({ userId });
        const address = addressData?.address?.find(addr => addr._id.equals(order.address));

        if (!address) {
            return res.status(404).render('page-404', { message: 'Address not found for this order.' });
        }

        res.render('order-details', { order, address ,userId});
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('page-404', { message: 'An error occurred while fetching order details.' });
    }
};

// Return order
const returnOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'Only delivered orders can be returned.' });
        }

        order.status = 'Returning';
        await order.save();

        res.status(200).json({ success: true, message: 'Return request submitted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to process the return request.' });
    }
};

const retryPayment = async (req, res) => {
  try {
      const orderId = req.params.orderId;

      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(400).json({ message: "Invalid order for repayment." });
      }

      if (order.status !== "Payment Pending") {
          return res.status(400).json({ message: "Invalid order for repayment." });
      }

      const newOrder = await paymentController.createPayment(order.finalAmount);
      if (!newOrder) {
          return res.status(500).json({ message: "Failed to create Razorpay order." });
      }

      order.paymentId = newOrder.orderId;
      await order.save();

      req.session.pendingOrder = {
          razorpayOrderId: newOrder.orderId,
          userId: order.userId,
          orderId: order._id.toString()
      };

      return res.json({
          success: true,
          orderId: newOrder.orderId,
          orderAmount: order.finalAmount * 100, // paisa
          RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID
      });

  } catch (error) {
      return res.status(500).json({ message: "Error retrying payment.", error: error.message });
  }
};



module.exports = { getOrdersPage, cancelOrder, removeProduct, orderDetails, returnOrder, retryPayment,invoiceDownload};
