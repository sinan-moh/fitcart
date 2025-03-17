const Order = require('../../models/orderSchema');

// Sales Report Generation
const salesReport = async (req, res) => {
    try {
        const { dateRange, startDate: customStartDate, endDate: customEndDate } = req.query;

        // Calculate date range based on the selected dateRange
        const endDate = new Date();
        const startDate = new Date();
        
        if (dateRange === 'custom' && customStartDate && customEndDate) {
            // For custom date range, use the provided dates
            startDate.setTime(new Date(customStartDate).getTime());
            startDate.setHours(0, 0, 0, 0); // Beginning of start date
            
            endDate.setTime(new Date(customEndDate).getTime());
            endDate.setHours(23, 59, 59, 999); // End of end date
        } else {
            // Use predefined ranges
            switch (dateRange) {
                case 'day':
                    // Set startDate to the beginning of today (12:00 AM)
                    startDate.setHours(0, 0, 0, 0); 
                    // Set endDate to the end of today (11:59 PM)
                    endDate.setHours(23, 59, 59, 999); 
                    break;
                case 'week':
                    // Set startDate to the beginning of 7 days ago
                    startDate.setDate(startDate.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0); 
                    // Set endDate to the end of today
                    endDate.setHours(23, 59, 59, 999); 
                    break;
                case 'month':
                    // Set startDate to the beginning of one month ago
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate.setHours(0, 0, 0, 0); 
                    // Set endDate to the end of today
                    endDate.setHours(23, 59, 59, 999); 
                    break;
                default:
                    // Default to last 7 days
                    startDate.setDate(startDate.getDate() - 7);
                    startDate.setHours(0, 0, 0, 0); 
                    // Set endDate to the end of today
                    endDate.setHours(23, 59, 59, 999); 
            }
        }
        
        // For debugging
        console.log(`Date Range: ${dateRange}`);
        console.log(`Start Date: ${startDate.toISOString()}`);
        console.log(`End Date: ${endDate.toISOString()}`);

        // Fetch orders with populated user data, excluding 'Cancelled' and 'Returned' orders
        const orders = await Order.find({
            createdOn: {
                $gte: startDate,
                $lte: endDate
            },
            status: { $in: ['Delivered'] }
        })
        .populate('userId', 'name')  // Populate the user data (name only)
        .sort({ createdOn: -1 });

        // Transform orders into sales report format
        const sales = orders.map(order => {
            const regularDiscount = order.discount || 0;
            
            return {
                orderId: order.orderId,
                totalAmount: order.totalPrice,
                offerDiscount: regularDiscount,
                userName: order.userId?.name || 'Unknown User',
                date: order.createdOn.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                })
            };
        });

        // Calculate summary statistics for the sales report
        let totalAmount = 0;
        let totalDiscount = 0;

        sales.forEach(sale => {
            totalAmount += sale.totalAmount;
            totalDiscount += (sale.couponDiscount || 0) + (sale.offerDiscount || 0);
        });

        const averageOrderValue = sales.length ? (totalAmount / sales.length).toFixed(2) : 0;
        const discountPercentage = totalAmount ? ((totalDiscount / totalAmount) * 100).toFixed(2) : 0;

        const summary = {
            totalSales: sales.length,
            totalAmount: Number(totalAmount.toFixed(2)),
            totalDiscount: Number(totalDiscount.toFixed(2)),
            averageOrderValue: Number(averageOrderValue),
            discountPercentage: Number(discountPercentage)
        };

        // Prepare filter data to pass to the view
        const filterData = {
            selectedRange: dateRange || 'day',
            startDate: customStartDate || startDate.toISOString().split('T')[0],
            endDate: customEndDate || endDate.toISOString().split('T')[0]
        };

        if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
            return res.json({ 
                sales, 
                summary,
                filter: filterData
            });
        } else {
            res.render('salesReport', {
                sales,
                summary,
                ...filterData
            });
        }
        
    } catch (error) {
        console.error('Sales report error:', error);
    
        if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error generating sales report',
                error: error.message,
            });
        }
    
        res.status(500).render('error', { error: error.message });
    }
};
    


module.exports = {
    salesReport
};
