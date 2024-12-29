
const Coupon = require('../../models/couponSchema')
const mongoose= require("mongoose")

const loadCoupon = async (req, res) => {
    try {

        const findCoupons = await Coupon.find({})
        return res.render("coupon", { coupon: findCoupons })


    } catch (error) {
        return res.redirect("/pageerror")

    }
}

const createCoupon = async (req, res) => {
    try {
        const data = {
            couponName: req.body.couponName,
            startDate: new Date(req.body.startDate + "T00:00:00"),
            endDate: new Date(req.body.endDate + "T00:00:00"),
            offerPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice),


        }

        const newConpon = new Coupon({
            name: data.couponName,
            createOn: data.startDate,
            expireOn: data.endDate,
            offerPrice: data.offerPrice,
            minimumPrice: data.minimumPrice,
        })
        await newConpon.save()
        return res.redirect("/admin/coupon")
    } catch (error) {
        res.redirect("/pageerror")

    }
}
const editCoupon = async(req,res)=>{
    try {
        const id = req.query.id;
        const findCoupon = await Coupon.findOne({_id:id});
        res.render('edit-coupon',{
            findCoupon:findCoupon
        })
    } catch (error) {
        res.redirect("/pageerror")
        
    }

}
const updateCoupon=async(req,res)=>{
    try {
        
        const couponId=req.body.couponId
        const oid =new mongoose.Types.ObjectId(couponId)
        const selectedCoupon= await Coupon.findOne({_id:oid})
        if(selectedCoupon){
            const startDate =new Date(req.body.startDate);
            console.log(startDate);
            
            const endDate = new Date(req.body.endDate);
            const updateCoupon=await Coupon.updateOne(
                {_id:oid},
                {$set:{
                    name:req.body.couponName,
                    createOn:startDate,
                    expireOn:endDate,
                    offerPrice:parseInt(req.body.offerPrice),
                    minimumPrice:parseInt(req.body.minimumPrice),
                },
            },{new:true}
            )
            if(updateCoupon !==null){
                res.send("coupon updated successfully")
            }else{
                res.status(500).send("coupon update Faild")
            }
        }
    } catch (error) {
        res.redirect("/pageerror")
        
    }
} 
const deleteCoupon =  async (req, res) => {
    const couponId = req.body.id;

    try {
        // Delete the coupon using its ID
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        
        if (!deletedCoupon) {
            // If no coupon is found, return an error
            return res.status(404).send('Coupon not found');
        }

        // Send a success message to the frontend
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (err) {
        console.error('Error deleting coupon:', err);
        return res.status(500).send('Error deleting coupon');
    }
};



module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon
}