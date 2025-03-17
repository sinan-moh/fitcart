const Order = require('../../models/orderSchema'); 

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
      try {
        const salesData = await Order.aggregate([
          { $match: { status: "Delivered" } },
          {
            $group: {
              _id: { $month: "$createdAt" },
              totalSales: { $sum: "$totalPrice" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
  
        const totalOrders = await Order.countDocuments();
        const totalProfit = await Order.aggregate([
          { $match: { status: "Delivered" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]);
        const totalDiscount = await Order.aggregate([
          { $match: { status: "Delivered" } },
          { $group: { _id: null, total: { $sum: "$discountAmount" } } },
        ]);
  
        const bestSellingProducts = await Order.aggregate([
          { $unwind: "$orderedItems" },
          {
            $group: {
              _id: "$orderedItems.product",
              totalSold: { $sum: "$orderedItems.quantity" },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: "$product" },
          { $project: { productName: "$product.productName", totalSold: 1 } },
        ]);
  
        const bestSellingCategories = await Order.aggregate([
          { $unwind: "$orderedItems" },
          {
            $lookup: {
              from: "products",
              localField: "orderedItems.product",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $group: {
              _id: "$productDetails.category",
              totalSold: { $sum: "$orderedItems.quantity" },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "categories",
              localField: "_id",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          { $unwind: "$categoryDetails" },
          { $project: { categoryName: "$categoryDetails.name", totalSold: 1 } },
        ]);
  
        const recentSalesData = salesData.slice(-5);
  
        res.render("dashboard", {
          salesData,
          totalOrders,
          totalProfit: totalProfit[0]?.total || 0,
          totalDiscount: totalDiscount[0]?.total || 0,
          bestSellingProducts,
          bestSellingCategories,
          recentSalesData,
        });
      } catch (error) {
        console.error("Error loading dashboard:", error);
        res.redirect("/pageError");
      }
    } else {
      res.redirect("/admin/login");
    }
  };

module.exports={
    loadDashboard

}