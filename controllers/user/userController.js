const User = require("../../models/userSchema");
const nodemailer = require("nodemailer")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Banner = require('../../models/bannerSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require('uuid');


const { transformAuthInfo } = require("passport");
const Wishlist = require("../../models/wishlistSchema");
const walletController = require('../../controllers/user/walletController');

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();

        // Find banners that are active for today
        const findBanner = await Banner.find({
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) },
        });

        // Fetch categories that are listed
        let Categories = await Category.find({ isListed: true });

        // Fetch brands that are active
        const Brands = await Brand.find({ isBlocked: false });

        // Fetch products that match the categories and have quantity > 0
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: Categories.map((category) => category._id) },
            quantity: { $gt: 0 },
        });

        //  Sort products by createdOn or createdAt (if present)
        productData.sort((a, b) => {
            const dateA = new Date(a.createdOn || a.createdAt);
            const dateB = new Date(b.createdOn || b.createdAt);
            return dateB - dateA;
        });



        // Slice to get only the top 7 latest products
        productData = productData.slice(0, 7);


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
        ]);

        // Calculate product count for each category and attach it
        const categoryCounts = await Promise.all(
            Categories.map(async (category) => {
                const count = await Product.countDocuments({
                    category: category._id,
                    isBlocked: false,
                    quantity: { $gt: 0 },
                });
                return { ...category.toObject(), productCount: count };
            })
        );

        // Check if user is present in the session
        if (req.session.user) {
            const user = req.session.user;
            const userData = await User.findById(user._id);

            // Fetch wishlist for the user
            const wishlist = await Wishlist.findOne({ userId: user._id }) || [];

            return res.render("home", {
                user: userData,
                products: productData,
                wishlist: wishlist,
                banner: findBanner || [],
                Categories: categoryCounts, // Categories now include productCount
                Brands: Brands || [],
                bestSellingProducts,
            });
        } else {
            // Render homepage for non-logged-in users
            return res.render("home", {
                products: productData,
                wishlist: [],
                banner: findBanner || [],
                Categories: categoryCounts, // Categories now include productCount
                Brands: Brands || [],
                bestSellingProducts,
            });
        }
    } catch (error) {
        console.error("Error loading homepage:", error);
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
        const { name, phone, email, password, referralCode } = req.body;
        const cPassword = req.body['c password'];

        if (password !== cPassword) {
            return res.render("signup", { message: "Password does not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email.error");
        }

        // Generate a unique referral code
        let uniqueReferralCode;
        let isUnique = false;

        while (!isUnique) {
            uniqueReferralCode = uuidv4().substring(0, 8).replace('-', '').toUpperCase();
            const existingUser = await User.findOne({ referalcode: uniqueReferralCode });

            if (!existingUser) isUnique = true;
        }

        // Store user data in session
        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password, referalcode: uniqueReferralCode };

        let referredBy = null;

        // Check if a valid referral code was provided
        if (referralCode) {
            const referrer = await User.findOne({ referalcode: referralCode });

            if (referrer) {
                req.session.userData.referredBy = referrer._id;
                referredBy = referrer._id;

                // Give cashback to the referrer
                await walletController.updateWallet(100, "credit", referrer._id, "cashBack");
            }
        }

        res.render("verify-otp");
        console.log("OTP Sent", otp);
    } catch (error) {
        console.error("Signup Error", error);
        res.redirect("/pageNotFound");
    }
};


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
        const wishlist = await Wishlist.findOne({ userId: user._id }) || [];
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
            wishlist: wishlist,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            searchCategory: '',
            query: '',
            selectedPrice: '',
            searchBrand: '',

        })
    } catch (error) {
        res.redirect('/pageNotFound')
        console.log(error);


    }

}

const searchproduct = async (req, res) => {
    try {
        let { query, page = 1, searchCategory, searchBrand, selectedPrice } = req.query;

        searchBrand = searchBrand || '';
        searchCategory = searchCategory || '';
        selectedPrice = selectedPrice || '';

        const user = req.session.user || req.session.passport?.user;
        const userData = user ? await User.findOne({ _id: user }) : null;
        const categories = await Category.find({ isListed: true }).lean();
        const brands = await Brand.find({}).lean();
        const wishlist = await Wishlist.findOne({ userId: user._id }) || [];

        // Searching product using query
        let findProducts = await Product.find({
            status: 'Available',
            $or: [
                { productName: { $regex: '.*' + query + '.*', $options: 'i' } },
            ],
        });

        if (searchCategory) {
            findProducts = findProducts.filter((ele) => {
                return ele.category.toString() === searchCategory;
            });
        }

        if (searchBrand) {
            findProducts = findProducts.filter((ele) => {
                return ele.brand === searchBrand;
            });
        }

        if (selectedPrice) {
            const priceRange = selectedPrice.split('-');
            if (priceRange.length === 2) {
                const minPrice = parseInt(priceRange[0]);
                const maxPrice = parseInt(priceRange[1]);
                findProducts = findProducts.filter((ele) => {
                    return ele.salePrice >= minPrice && ele.salePrice <= maxPrice;
                });
            } else if (selectedPrice === '2000+') {
                findProducts = findProducts.filter((ele) => {
                    return ele.salePrice > 2000;
                });
            }
        }

        // Pagination logic
        const itemsPerPage = 6;  // Number of items per page
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentProducts = findProducts.slice(startIndex, endIndex);

        // Save search entry for user (if logged in)
        if (userData) {
            const searchEntry = {
                searchedTerm: query,
                searchedOn: new Date(),
            };
            userData.searchHistory.push(searchEntry);
            await userData.save();
        }

        // Render the shop page with search results
        res.render('shop', {
            user: userData,
            products: currentProducts,
            category: categories,
            brand: brands,
            wishlist: wishlist,
            totalPages,
            currentPage: page,
            searchBrand,
            searchCategory,
            query,
            selectedPrice
        });

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
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
    searchproduct
}