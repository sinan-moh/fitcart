const express = require('express')
const router = express.Router()
const userController = require("../controllers/user/userController")
const profileController = require('../controllers/user/profileController')
const cartController = require("../controllers/user/cartControllers")
const productController = require('../controllers/user/productController')
const checkoutController = require('../controllers/user/checkoutController')
const OrderController = require('../controllers/user/orderController')
const wishlistController = require('../controllers/user/wishlistController')
const paymentController = require('../controllers/user/paymentController')
const walletController = require('../controllers/user/walletController')
const couponController = require('../controllers/user/couponController')


const passport = require('passport')
const { loginAuth, userAuth } = require("../middlewares/auth")
router.get('/pageNotFound', userController.pageNotFound)
router.get("/", userController.loadHomepage)
router.get('/shop', userAuth, userController.loadShoppingPage);
router.get('/filter', userAuth, userController.filterProducts)

router.get('/search', userAuth, userController.searchproduct)
router.get("/login", loginAuth, userController.loadLogin)
router.post("/login", userController.login)
router.get("/logout", userController.logout);
router.get("/signup", loginAuth, userController.loadSignup)
router.post("/signup", userController.signup)
router.post("/verify-otp", userController.verifyOtp)
router.post("/resend-otp", userController.resendOtp);


router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/signup" }), (req, res) => {
    req.session.googleProfile = req.user;
    res.redirect('/');
});



//WISHLIST  CONTROLLER
router.get("/wishlist", userAuth, wishlistController.loadWishlist)
router.post('/addToWishlist', userAuth, wishlistController.addToWishlist)
router.delete('/wishlist/removewishlist/:id', userAuth, wishlistController.removeFromWishlist);



//CART CONTROLLER
router.get('/cart', userAuth, cartController.getCartPage);
router.post('/addCart', userAuth, cartController.addCart);
router.post('/updateQuantity', userAuth, cartController.updateQuantity);
router.post('/removeCartItem', userAuth, cartController.removeItem);

//CHECKOUT CONTROLLER
router.get('/check-out', userAuth, checkoutController.getCheckOutPage)
router.post('/add-address', userAuth, checkoutController.addAddress);
router.put('/edit-address/:id', userAuth, checkoutController.editAddress);
router.post('/place-order', userAuth, checkoutController.placeOrder)
router.get('/order-confirmation', checkoutController.orderConformation)
//PAYMENT CONTROLLER
router.post('/verify-payment', paymentController.verifyRazorpayPayment);



//order controller
router.get('/myOrder', userAuth, OrderController.getOrdersPage)
router.post('/cancel-order/:orderId', userAuth, OrderController.cancelOrder)
router.post('/remove-product/:orderId/:productId', userAuth, OrderController.removeProduct)
router.get('/order-details/:id', userAuth, OrderController.orderDetails)
router.post('/return-order/:orderId',userAuth,OrderController.returnOrder)
router.post("/retry-payment/:orderId",userAuth,OrderController.retryPayment);
router.get("/orders/invoice/:orderId",userAuth,OrderController.invoiceDownload);




//profile Controller
router.get("/forgot-password", profileController.getforgotpassPage)
router.post("/forgot-email-valid", profileController.forgotEmailValid)
router.post('/verify-passforgot-otp', profileController.verifyForgotPassOtp)
router.get('/reset-password', profileController.getResetPassPage)
router.post('/resend-forgot-otp', profileController.resendOtp)
router.post('/reset-password', profileController.postNewPassword)
router.get('/userProfile', userAuth, profileController.userProfile)
router.get('/change-email', userAuth, profileController.changeEmail)
router.post('/change-email', userAuth, profileController.changeEmailValid)
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp)
router.post('/update-email', userAuth, profileController.updateEmail)
router.get('/change-password', userAuth, profileController.changePassword)
router.post('/change-password', userAuth, profileController.changePasswordValid)
router.get('/editAddress', userAuth, profileController.editAddress)
router.post('/editAddress', userAuth, profileController.posteditAddress)
router.post('/deleteAddress', userAuth, profileController.deleteAddress)
router.get('/userAdderss', userAuth, profileController.userAddress)
router.get('/addAddress', userAuth, profileController.addAddress)
router.post('/addAddress', userAuth, profileController.postAddAddres)
router.get('/productDetails', userAuth, productController.productDetails)


// wallet
router.get('/wallet', userAuth, walletController.getWallet)

//
router.get('/apply-coupon',userAuth,couponController.applyCoupon )
router.post('/remove-coupon',userAuth,couponController.removeCoupon)


module.exports = router


