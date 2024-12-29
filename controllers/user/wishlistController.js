const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

// Load Wishlist
const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (!user) return res.status(404).render('error', { message: 'User not found.' });

        const products = await Product.find({ _id: { $in: user.wishlist } }).populate('category');
        res.render('wishlist', { user, wishlist: products });
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
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ status: false, message: 'User not found.' });

        if (user.wishlist.includes(productId)) {
            return res.status(200).json({ status: false, message: 'Product already in wishlist' });
        }

        user.wishlist.push(productId);
        await user.save();
        return res.status(200).json({ status: true, message: 'Product added to wishlist' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error' });
    }
};

// Remove from Wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ status: false, message: 'User not found.' });

        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        res.status(200).json({ status: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
};

module.exports = { loadWishlist, addToWishlist, removeFromWishlist };
