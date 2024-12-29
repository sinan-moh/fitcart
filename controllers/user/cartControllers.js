const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

// Get Cart Page
const getCartPage = async (req, res) => {
  const userId = req.session.user || req.session.passport?.user;

  try {
    // Fetch the user data
    const userData = await User.findById(userId);
    if (!userData) {
      return res.redirect('/login');  // Redirect to login if user is not found
    }

    // Fetch the user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.render('cart', {
        user: userData,
        cart: [],  // Empty cart array
        totalItems: 0,
        totalPrice: 0
      });
    }

    // Calculate total items and total price
    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Pass the data to the view
    res.render('cart', {
      user: userData,
      cart: cart.items,
      totalItems: totalItems,
      totalPrice: totalPrice
    });

  } catch (error) {
    console.error(error);
    res.redirect('/pageNotFound');  // Handle errors by redirecting to a page not found
  }
};
const addCart = async (req, res) => {
  const { productId, quantity, flavours, weights, productName, productImage, regularPrice, salePrice, discount } = req.body;
  const userId = req.session.user || req.session.passport?.user;

  // Log the request body for debugging
  console.log(req.body);
  console.log('UserId from session:', userId);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found:', productId);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const MAX_QUANTITY = 5;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // If no cart exists, create a new one
      const newCart = new Cart({
        userId,
        items: [{
          productId,
          productName,
          productImage,
          quantity,
          flavours,
          weights,
          price: salePrice || regularPrice,
          totalPrice: (salePrice || regularPrice) * quantity
        }]
      });
      await newCart.save();
      return res.status(200).json({ success: true, message: 'Product added to cart', cart: newCart });
    } else {
      // If cart exists, check if the product is already in the cart
      const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (existingItemIndex !== -1) {
        const existingItem = cart.items[existingItemIndex];
        const newQuantity = existingItem.quantity + parseInt(quantity);

        // Check if the new quantity exceeds the maximum allowed
        if (newQuantity > MAX_QUANTITY) {
          return res.status(400).json({ success: false, message: `You can only buy a maximum of ${MAX_QUANTITY} units of this product.` });
        }

        // Update quantity and total price
        existingItem.quantity = newQuantity;
        existingItem.totalPrice = existingItem.quantity * (salePrice || regularPrice);

        await cart.save();
        return res.status(200).json({ success: true, message: 'Quantity updated in the cart', cart });
      } else {
        // If product is not in the cart, add it
        cart.items.push({
          productId,
          productName,
          productImage,
          quantity,
          flavours,
          weights,
          price: salePrice || regularPrice,
          totalPrice: (salePrice || regularPrice) * quantity
        });

        await cart.save();
        return res.status(200).json({ success: true, message: 'Product added to the cart', cart });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred, please try again later' });
  }
};


const updateQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user || req.session.passport?.user;

  try {
    const cart = await Cart.findOne({ userId });
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Ensure the quantity does not exceed stock
    if (quantity > product.quantity) {
      return res.status(400).json({ message: `Cannot add more than ${product.quantity} items to the cart.` });
    }

    // Find the item in the cart
    const item = cart.items.find(i => i.productId.toString() === productId);

    if (!item) return res.status(404).send('Item not found in cart');

    // Update the quantity and calculate total price
    item.quantity = quantity;
    item.totalPrice = item.quantity * product.salePrice;

    await cart.save();

    // Recalculate total cart values
    const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Send back the updated values
    res.json({
      itemTotalPrice: item.totalPrice,
      totalItems,
      totalPrice,
      message: 'Cart updated successfully!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};





// Remove Item from Cart
const removeItem = async (req, res) => {
  const { productId } = req.body;
  const userId = req.session.user || req.session.passport?.user;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const initialItemCount = cart.items.length;

    // Remove the item from the cart
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    // Check if the item was actually removed
    if (cart.items.length === initialItemCount) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    await cart.save();

    // Return a success message as JSON
    res.status(200).json({ message: 'Item successfully removed from the cart!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error occurred' });
  }
};



module.exports = {
  getCartPage,
  addCart,
  updateQuantity,
  removeItem,

};


