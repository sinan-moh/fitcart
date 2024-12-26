const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const fs = require("fs");
const path = require("path")
const sharp = require("sharp");
const { log } = require("console");




const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false })
        res.render("product-add", {
            cat: category,
            brand: brand
        })
    } catch (error) {
        res.redirect("/admin/pageerror")
    }

}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        

        // Check if the product already exists
        const productExists = await Product.findOne({
            productName: products.productName,
        });

        if (productExists) {
            return res.status(400).json({
                message: "Product already exists. Please try with another name.",
            });
        }

        // Handle file uploads and resizing
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join(
                    "public",
                    "uploads",
                    "product-images",
                    req.files[i].filename
                );

                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                images.push(req.files[i].filename);
            }
        }

        // Validate category
        const category = await Category.findOne({ name: products.category });
        if (!category) {
            return res.status(400).json({
                message: "Invalid category name. Please provide a valid category.",
            });
        }

        // Create new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: category._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdOn: new Date(),
            flavours: products.flavours,
            weights: products.weights,
            quantity: products.quantity,
            productImage: images,
            status: "Available",
        });
        
        await newProduct.save();
        return res.redirect("/admin/addProducts");
    } catch (error) {
        console.error("Error saving product:", error);
        return res.redirect("/admin/pageerror");
    }
};


const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],

        }).limit(limit * 1).skip((page - 1) * limit).populate("category").exec();
        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],
        }).countDocuments()

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        if (category && brand) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand
            })
        } else {
            res.render("page.404");
        }
    } catch (error) {
        console.error(error);

        res.redirect("/admin/pageerror")

    }
}
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;



        // Find the product by ID
        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        // Find the category of the product
        const findCategory = await Category.findById(findProduct.category);
        if (!findCategory) {
            return res.json({ status: false, message: 'Category not found' });
        }

        // Check if the category offer is greater than the product offer
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: 'This product category already has a higher offer' });
        }

        // Calculate the new sale price
        const discount = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.salePrice = findProduct.regularPrice - discount;

        // Update product offer
        findProduct.productOffer = parseInt(percentage, 10);
        await findProduct.save();

        // Optionally reset category offer if this product offer supersedes it
        if (findCategory.categoryOffer < percentage) {
            findCategory.categoryOffer = 0;
            await findCategory.save();
        }

        // Respond with success
        res.json({ status: true, message: 'Product offer updated successfully' });

    } catch (error) {
        console.error('Error adding product offer:', error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};


const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        // Find the product by ID
        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            return res.json({ status: false, message: 'Product not found' });
        }

        // Reset the sale price to the regular price
        findProduct.salePrice = findProduct.regularPrice;

        // Reset the product offer
        findProduct.productOffer = 0;

        // Save the changes
        await findProduct.save();

        // Respond with success
        res.json({ status: true, message: 'Product offer removed successfully' });
    } catch (error) {
        console.error('Error removing product offer:', error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
};

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/admin/pageerror')

    }
}
const unBlockProduct = async (req, res) => {
    try {
        let id = req.query.id
       

        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect('/admin/products')

    } catch (error) {
        console.error('Error unblocking product:', error);
        res.redirect('/admin/pageerror')

    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
        
        res.render('products-edit', {
            product: product,
            cat: category,
            brand: brand
        })
    } catch (error) {
        res.redirect('/admin/pageerror')

    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;


        const product = await Product.findOne({ _id: id });
        
        const data = req.body;
        console.log(req.body)
      

        let categoryId = null;
        if (data.category) {
            const category = await Category.findOne({ name: data.category }); // Find the category by name
            if (!category) {
                return res.status(400).json({ error: "Invalid category provided." });
            }
            categoryId = category._id; // Use the ObjectId from the category
        }



        // Check for product name conflict
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try another name." });
        }

        const images = [];

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }


        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            brand: data.brand,
            category: categoryId ,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            flavours: data.flavours,
            weights: data.weights,
        };

        // If new images are uploaded, push them into the productImage array
        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };

        }


        // Update the product in the database
        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        // Redirect to the products page
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        res.redirect('/admin/pageerror');
    }
};


const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } });
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);

        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath)
            console.log(`image ${imageNameToServer} deleted suesfuly`);
            
        }else{
            console.log(`image ${imageNameToServer} not found`);
            
        }
        res.send({status:true});


    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send({ status: false, message: 'Error deleting image' });
    }
};


module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage

}