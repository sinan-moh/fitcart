const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)


        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            cat: categoryData,
            currentpage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });


    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror")

    }
}
const addCategory = async (req, res) => {
    const { name, description } = req.body;

    // Input validation
    if (!name || !description) {
        return res.status(400).json({ error: "Name and description are required" });
    }

    // Validate category name: ensure it’s not just spaces and follows a specific format (alphanumeric + spaces)
    const nameRegex = /^[a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(name)) {
        return res.status(400).json({ error: "Category name must be alphanumeric and can only include spaces" });
    }

    // Validate description: must be at least 10 characters long
    if (description.length < 10) {
        return res.status(400).json({ error: "Description must be at least 10 characters long" });
    }

    // Trim and sanitize inputs (to prevent accidental spaces and unwanted characters)
    const sanitizedName = name.trim();
    const sanitizedDescription = description.trim();

    try {
        // Check if category already exists (case insensitive check)
        const existingCategory = await Category.findOne({ name: sanitizedName.toLowerCase() });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        // Create and save new category
        const newCategory = new Category({
            name: sanitizedName,
            description: sanitizedDescription,
        });
        await newCategory.save();

        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error(error); // Log error for debugging
        return res.status(500).json({ message: "Internal server error" });
    }
};


const addCategoryOffer = async (req, res) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId);
        

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" })
        }
        const products = await Product.find({ category: category._id });
        
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({ status: false, message: "product with this category already have product" });
        }

        const categoryUpdateResult = await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        
        res.json({ status: true });
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" })

    }
}

const removeCategoryOffer = async (req, res) => {
    try {

        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" })
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100))
                product.productOffer = 0
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true })
    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" })
    }
}

const getListCategory= async (req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}
const getUnListCategory = async(req,res)=>{
    try {
        let id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/admin/pageerror")
        
    }

}
const getEditcategory=async(req,res)=>{
    try{
    let id=req.query.id;
    let category=await Category.findOne({_id:id});
    res.render("edit-category",{category:category})
    }catch(error){
        res.redirect("/admin/pageerror")
    }
}

const editCategory= async (req,res)=>{
    try {
        const id=req.params.id;
        const {categoryName,description}=req.body;
        
        const existingCategory=await Category.findOne({name:categoryName})
        if(existingCategory){
            return res.status(400).json({error:"Category existed,please choose anothur name"})
        }
       const updateCategory= await Category.findByIdAndUpdate(id,{name:categoryName,description:description},{new:true})

       if(updateCategory){
        res.redirect("/admin/category")
       }else{
        return res.status(404).json({ error: "Category not found" })
       }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" })
    }
}


module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditcategory,
    editCategory,


}