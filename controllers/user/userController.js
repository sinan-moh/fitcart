const User = require("../../models/userSchema");
const nodemailer = require("nodemailer")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner = require('../../models/bannerSchema')
const Brand = require('../../models/brandSchema')
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
// const req = require("express/lib/request");
const { transformAuthInfo } = require("passport");
// const { search } = require("../../routes/userRouter");

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) }
        })
        const user = req.session.user;

        // Fetch categories that are listed
        const Categories = await Category.find({ isListed: true });


        if (Categories.length === 0) {
            console.log("No categories found with isListed: true");
        }

        // Fetch products that match the categories and have quantity > 0
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: Categories.map(category => category._id) },
            quantity: { $gt: 0 }
        });



        // If no products are found, log it
        if (productData.length === 0) {
            console.log("No products found matching the criteria");
        }

        // Sort products by createdAt or createdOn (if present)
        productData.sort((a, b) => {
            const dateA = new Date(a.createdOn || a.createdAt); // fallback to createdAt if createdOn is missing
            const dateB = new Date(b.createdOn || b.createdAt);
            return dateB - dateA;
        });

        // Slice to get only the top 4 latest products
        productData = productData.slice(0, 4);

        if (user) {
            const userData = await User.findById(user._id);
            return res.render("home", { user: userData, products: productData, banner: findBanner || [] });
        } else {
            return res.render("home", { products: productData, banner: findBanner || [] });
        }
    } catch (error) {
        console.log("Homepage not found");
        console.error(error); // Log the actual error for debugging
        res.status(500).send("Server error");
    }
};



const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const loadSignup = async (req, res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("signup page not found");
        res.status(500).send('Server Error')
    }
}

const loadshopping = async (req, res) => {
    try {
        return res.render("shop");
    } catch (error) {
        console.log("shopping page not found");
        res.status(500).send('Server Error')
    }
}
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();

}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD

            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "varfy your account",
            text: `your OTP is ${otp}`,
            html: `<b>your OTP:${otp} </b>`
        })
        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending email", error);
        return false


    }

}

const signup = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body
        const cPassword = req.body['c password'];
        if (password !== cPassword) {
            return res.render("signup", { message: "passwod not match" })

        }

        const findUser = await User.findOne({ email });
        if (findUser) {

            return res.render("signup", { message: "User with this email already exists" })
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.json("email.error")
        }

        req.session.userOtp = otp
        req.session.userData = { name, phone, email, password };


        res.render("verify-otp");
        console.log("Otp Sent", otp);
    } catch (error) {
        console.error("sign eror", error);
        res.redirect("/pageNotFound")
    }
}
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Password hashing failed");
    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body

        console.log(otp);

        // Ensure OTP is stored in the session
        if (!req.session.userOtp) {
            return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
        }

        // Compare OTPs
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            })
            await saveUserData.save()
            req.session.user = { _id: saveUserData._id, name: saveUserData.name }
            res.json({ success: true, redirectUrl: "/login" })
        } else {
            res.status(400).json({ success: false, message: "Invaled OTP , please try again" });
        }

    } catch (error) {
        console.error("Error verify OTP", error);
        res.status(500).json({ success: false, message: "An error occured" })

    }
}

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }
        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfuly" })

        } else {
            res.status(500).json({ success: false, message: "faild to resend OTP,please try again" })
        }

    } catch (error) {
        console.error("Error resend OTP", error);
        res.status(500).json({ success: false, message: "Internal server error,please try again" })
    }
}


const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login")
        } else {
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email });
        if (!findUser) {
            return res.render("login", { message: "user not found" })

        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" })

        }

        const passwodMatch = await bcrypt.compare(password, findUser.password);
        if (!passwodMatch) {
            return res.render("login", { message: "Incorrect Password" })
        }
        req.session.user = { _id: findUser._id, name: findUser.name };
        res.redirect("/")
    } catch (error) {
        console.error("login error", error);
        res.render("login", { message: "login faild. please try again later" })


    }
}
const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error", err.message);
                return res.redirect("/pageNotFound")

            }
            return res.redirect("/")
        })
    } catch (error) {
        console.log("logout error", error)
        res.redirect("/pageNotFound")

    }
}
const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user || req.session.passport?.user;
        const userData = await User.findOne({ _id: user })
        const categories = await Category.find({ isListed: true })
        const categoryIds = categories.map((category) => category._id.toString())
        const page = parseInt(req.query.page) || 1
        const limit = 9
        const skip = (page - 1) * limit;
        const products = await Product.find({
            isBlocked: false, category: { $in: categoryIds },
            quantity: { $gt: 0 }
        }).sort({ createdOn: -1 }).skip(skip).limit(limit)

        const totalProducts = await Product.countDocuments({
            isBlocked: false, category: { $in: categoryIds },
            quantity: { $gt: 0 }
        });
        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Brand.find({ isBlocked: false });
        const categoriesWithIds = categories.map(category => ({ _id: category._id, name: category.name }))

        res.render('shop', {
            user: userData,
            products: products,
            category: categoriesWithIds,
            brand: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages
        })
    } catch (error) {
        res.redirect('/pageNotFound')
        console.log(error);


    }

}

const searchproduct=async (req, res) => {
    try {
        const { query, page = 1 } = req.query;  // Get the search query and page number from URL
        const user = req.session.user ||req.session.passport?.user;  // Get the user session from req.session

        const userData = user ? await User.findOne({ _id: user }) : null;  // Fetch user data if logged in
        const categories = await Category.find({ isListed: true }).lean();  // Fetch categories that are listed
        const brands = await Brand.find({}).lean();  // Fetch all brands

        // Search query for products
        const searchQuery = {
            productName: { $regex: query, $options: 'i' },  // Case-insensitive search on productName
            isBlocked: false,  // Ensure the product is not blocked
            quantity: { $gt: 0 },  // Ensure the product is in stock
        };

        // Find products based on search query
        let findProducts = await Product.find(searchQuery).lean();

        // Pagination logic
        const itemsPerPage = 6;  // Number of items per page
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);  // Total pages based on number of items
        const startIndex = (page - 1) * itemsPerPage;  // Starting index for pagination
        const endIndex = startIndex + itemsPerPage;  // Ending index for pagination
        const currentProducts = findProducts.slice(startIndex, endIndex);  // Get the products for the current page

        // Save search entry for user (if logged in)
        if (userData) {
            const searchEntry = {
                searchedTerm: query,  // Store the searched term
                searchedOn: new Date(),  // Store the search timestamp
            };
            userData.searchHistory.push(searchEntry);  // Add to search history
            await userData.save(); // Save the user data
        }

        // Render the shop page with search results
        res.render('shop', {
            user: userData,  // Pass user data (if logged in)
            products: currentProducts,  // Pass the current products to display
            category:categories,  // Pass categories for the sidebar
            brand:brands,  
            totalPages,  
            currentPage: page,  
            selectedBrand: null, 
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');  // Redirect to a 404 page if there's an error
    }
};

const filterProducts = async (req, res) => {
    try {
        const user = req.session.user || req.session.passport?.user;
        const categoryId = req.query.category;
        const brandId = req.query.brand;

        // Fetch categories and brands for filters
        const findCategory = categoryId ? await Category.findOne({ _id: categoryId }) : null;
        const findBrand = brandId ? await Brand.findOne({ _id: brandId }) : null;
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        // Build the query for products
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        if (findCategory) query.category = findCategory._id;
        if (findBrand) query.brand = findBrand.brandName;

        // Fetch and sort products
        const findProducts = await Product.find(query).lean();
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        // Pagination logic
        const itemsPerPage = 10; // Define the number of products per page
        const currentPage = parseInt(req.query.page) || 1;
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = findProducts.slice(startIndex, endIndex);

        // User search history (if user is logged in)
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand.brandName : null,
                    searchedOn: new Date(),
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        // Store filtered products in the session and render the shop page
        req.session.filterProducts = currentProducts;
        res.render('shop', {
            user: userData,
            products: currentProducts,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
            selectedCategory: categoryId || null,
            selectedBrand: brandId || null,
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};
const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;

        // Fetch user data if the user is logged in
        const userData = user ? await User.findOne({ _id: user }).lean() : null;

        // Fetch brands and categories for filters
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        // Validate and set price range
        const minPrice = parseInt(req.query.gt) || 0; // Default to 0 if not provided
        const maxPrice = parseInt(req.query.lt) || Number.MAX_SAFE_INTEGER; // Default to max value if not provided
        console.log(minPrice,maxPrice);
        
        // Fetch products within the price range
        let findProducts = await Product.find({
            salePrice: { $gte: minPrice, $lte: maxPrice },
            isBlocked: false,
            quantity: { $gt: 0 },
        }).lean();

        // Sort products by creation date (descending)
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        // Pagination logic
        const itemsPerPage = 6; // Number of products per page
        const currentPage = parseInt(req.query.page) || 1; // Current page from query params
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = findProducts.slice(startIndex, endIndex);

        // Render the shop page with filtered products
        res.render('shop', {
            user: userData,
            products: currentProducts,
            category: categories,
            brand: brands,
            totalPages,
            currentPage,
        });
    } catch (error) {
        console.error('Error in filterByPrice:', error);
        res.redirect('/pageNotFound');
    }
};

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadshopping,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    filterProducts,
    filterByPrice,
    searchproduct
}