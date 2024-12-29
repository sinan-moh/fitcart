const express= require('express')
const router=express.Router()
const multer=require("multer")
const adminController= require("../controllers/admin/adminController")
const customerController= require("../controllers/admin/customerControler")
const categoryController= require("../controllers/admin/categoryController")
const {userAuth,adminAuth}=require("../middlewares/auth") 
const brandController=require("../controllers/admin/brandController")
const productController=require("../controllers/admin/productController")
const bannerController=require("../controllers/admin/bannerController")
const couponController =require('../controllers/admin/couponController')
const orderController=require("../controllers/admin/orderController")
const storage=require("../helpers/multer");
const uploads= multer({storage:storage})
router.get("/pageerror",adminController.pageerror)
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/",adminAuth,adminController.loadDashbord);
router.get("/logout",adminController.logout)

router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnListCategory)
router.get("/editCategory",adminAuth,categoryController.getEditcategory)
router.post("/editcategory/:id",adminAuth,categoryController.editCategory)
// BRAND MANAGMENT
router.get("/brands",adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand)
router.get("/deleteBrand",adminAuth,brandController.deleteBrand)
//PRODUCT MANAGMNET
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addproducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer)
router.get('/blockProduct',adminAuth,productController.blockProduct)
router.get('/unBlockProduct',adminAuth,productController.unBlockProduct)
router.get('/editProduct',adminAuth,productController.getEditProduct)
router.post('/editProduct/:id', adminAuth, uploads.array("images", 4), productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)

router.get('/banner',adminAuth,bannerController.getBannerPage)
router.get('/addBanner',adminAuth,bannerController.getAddBanner)
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner)
router.get('/deleteBanner',adminAuth,bannerController.deleteBanner)

router.get('/orderList',adminAuth,orderController.getOrderlist)
router.post('/updateOrderStatus',adminAuth,orderController.updateOrderStatus)

router.get('/coupon',adminAuth,couponController.loadCoupon)
router.post('/createCoupon',adminAuth,couponController.createCoupon)
router.get('/editCoupon',adminAuth,couponController.editCoupon)
router.post('/updatecoupon',adminAuth,couponController.updateCoupon)
router.post('/deletecoupon',adminAuth,couponController.deleteCoupon)
module.exports=router;
