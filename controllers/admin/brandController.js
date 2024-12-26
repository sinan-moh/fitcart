const Brand=require("../../models/brandSchema")
const Product=require("../../models/productSchema");


const getBrandPage=async (req,res)=>{
    try {
        const page= parseInt(req.query.page) || 1;
        const limit = 4;
        const skip=(page-1)*limit;
        const brandDate = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments()
        const totalPages = Math.ceil(totalBrands/limit)
        const reverseBrand =brandDate.reverse();
        res.render("brand",{
            data:reverseBrand,
            currentPage:page,
            totalBrands:totalBrands,
            totalPages:totalPages
        })
        } catch (error) {
        res.render("/admin/pageerror")
    }

}
const addBrand = async (req, res) => {
    try {
        const brand = req.body.name.trim();
        const findBrand = await Brand.findOne({ brandName: brand });

        if (findBrand) {
            return res.render("brand", {
                errorMessage: "Brand name already exists. Please use a different name.",
                data: await Brand.find({}).sort({ createdAt: -1 }), // Pass existing brands for re-render
            });
        }

        if (!req.file || !req.file.filename) {
            return res.render("brand", {
                errorMessage: "Image is required for the brand.",
                data: await Brand.find({}).sort({ createdAt: -1 }), // Pass existing brands for re-render
            });
        }

        const image = req.file.filename;
        const newBrand = new Brand({
            brandName: brand,
            brandImage: [image],
        });

        await newBrand.save();
        res.redirect('/admin/brands');
    } catch (error) {
        console.error("Error adding brand:", error);
        res.render("brand", {
            errorMessage: "An unexpected error occurred. Please try again later.",
            data: await Brand.find({}).sort({ createdAt: -1 }),
        });
    }
};
const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });  // Set isBlocked to true to block the brand
        res.redirect("/admin/brands");  // Redirect to the brands page after blocking
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");  // Redirect to error page if something goes wrong
    }
};

const unBlockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });  // Set isBlocked to false to unblock the brand
        res.redirect("/admin/brands");  // Redirect to the brands page after unblocking
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");  // Redirect to error page if something goes wrong
    }
};
const deleteBrand = async (req, res) => {
    try {
        const id = req.query.id; // Ensure you're getting the `id` from query parameters
        if (!id) {
            return res.status(400).json({ success: false, message: "Brand ID is required." });
        }

        // Delete the brand from the database
        await Brand.deleteOne({ _id: id });
        res.json({ success: true, message: "Brand deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete the brand." });
        redirect("/admin/brands")
    }
};



module.exports={
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand,
}