const mongoose= require("mongoose");
const { create } = require("./wishlistSchema");

const {Schema}=mongoose

const couponSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        uniqUe:true

    },
    createOn:{
        type:Date,
        default:Date.now,
        require:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumprice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]
})
const Coupon= mongoose.model("Coupon",couponSchema)

module.exports=Coupon;