const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema');

// Load Wishlist with Pagination
const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 5; // Items per page
        const skip = (page - 1) * limit;
        if (!userId) {
            return res.status(401).json({ status: false, message: 'User not authenticated. Redirecting to login.' });
        }

        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'products.productId',
                options: { skip, limit }
            });

        if (!wishlist) {
            return res.status(404).render('error', { message: 'Wishlist not found.' });
        }

        const totalItems = wishlist.products.length;
        const totalPages = Math.ceil(totalItems / limit);

        res.render('wishlist', {
            user:userId,
            wishlist: wishlist.products.slice(skip, skip + limit), // Paginated products
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Unable to load wishlist.' });
    }
};

// Add to Wishlist
const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;
        if (!userId) {
            return res.status(200).json({ status: false, message: 'User not authenticated. Redirecting to login.' });
        }
        

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                products: [{ productId }],
            });
            await wishlist.save();
            return res.status(200).json({ status: true, message: 'Product added to wishlist.' });
        }

        const exists = wishlist.products.some(item => item.productId.toString() === productId);
        if (exists) {
            return res.status(200).json({ status: false, message: 'Product already in wishlist.' });
        }

        wishlist.products.push({ productId });
        await wishlist.save();
        return res.status(200).json({ status: true, message: 'Product added to wishlist.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error.' });
    }
};

// Remove from Wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.id;

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ status: false, message: 'Wishlist not found.' });
        }

        wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId);
        await wishlist.save();

        res.status(200).json({ status: true, message: 'Product removed from wishlist.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error.' });
    }
};

module.exports = { loadWishlist, addToWishlist, removeFromWishlist };
