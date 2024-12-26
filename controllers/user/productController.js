const Product =  require('../../models/productSchema')
const Category=  require('../../models/categorySchema')
const User    =  require('../../models/userSchema')


const productDetails =async (req,res)=>{
    try {
        const userId=req.session.user ||req.session.passport?.user;;
        const userData = await User.findById(userId)
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const categoryOffer = findCategory ?.categoryOffer|| 0;
        const productOffer =product.productOffer || 0;
        const totalOffer=categoryOffer +productOffer;
        const relatedProducts = await Product.find({
            category: product.category, 
            _id: { $ne: product._id }   
        }).limit(4);
        
        
        res.render('product-details',{
            product:product,
            user:userData,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
            relatedProducts:relatedProducts,

        })

    } catch (error) {
        console.log('Error for fecting prodect detail',error);
        res.redirect('/pageNotFount')
        
        
        
    }
}
module.exports={
    productDetails
}