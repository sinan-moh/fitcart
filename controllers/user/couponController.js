const Coupon = require('../../models/couponSchema')
const Cart  = require('../../models/cartSchema')

const applyCoupon = async (req,res)=>{
    try {
        //destructring
        const {couponCode} = req.query;
        const userId = req.session.user

        //find coupon from db
        const coupon = await Coupon.findOne({name : couponCode}) 

        if(!coupon){
            return res.status(400).json({message:'Invalid Coupon code'})
        };

        const isUsed = coupon.couponUsedBy.some((ele)=>{
            return ele.toString() === userId._id
        })

       
        
        if(isUsed){
            return res.status(400).json({message:"user already claimed"})
        }
        const  cart = await Cart.findOne({userId});
        
        if(cart.finalPrice < coupon.minimumPrice){
            return res.status(400).json({message:`the prodect shoud more than  ${coupon.minimumPrice}`})
            
        }

        if(coupon.expireOn < new Date()){
            return res.status(400).json({message:"coupen Expired "})
        }


        //add user name in used by list 

        coupon.couponUsedBy.push(userId);
        await coupon.save()
    

       cart.coupon = coupon._id;
       cart.finalPrice = cart.finalPrice - coupon.offerPrice;
    

       await cart.save();

       res.status(200).json({message:"coupon applied successfully", finalPrice : cart.finalPrice})

    } catch (error) {
        console.log(error); 
    }
}
const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;

        // Find the user's cart
        const cart = await Cart.findOne({ userId }).populate('coupon');

        if (!cart || !cart.coupon) {
            return res.status(400).json({ message: 'No coupon applied to the cart' });
        }

        // Retrieve the applied coupon
        const coupon = cart.coupon;

        // Update the coupon's used list by removing the user
        coupon.couponUsedBy = coupon.couponUsedBy.filter(
            (user) => user.toString() !== userId._id.toString()
        );
        await coupon.save();

        // Remove the coupon from the cart and adjust the final price
        cart.finalPrice += coupon.offerPrice; // Add back the coupon discount
        cart.coupon = null; // Remove the coupon reference
        await cart.save();

        res.status(200).json({
            message: 'Coupon removed successfully',
            finalPrice: cart.finalPrice,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while removing the coupon' });
    }
};


module.exports = {
    applyCoupon,
    removeCoupon
}