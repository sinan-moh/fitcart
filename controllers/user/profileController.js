
const User =require('../../models/userSchema')
const nodemailer=require('nodemailer');
const bcrypt =require('bcrypt');
const env =require('dotenv').config();
const session=require('express-session');
const Address=require('../../models/addressSchema');
const { pageNotFound } = require('./userController');



function generateOtp() {
    const digits ='1234567890';
    let otp='';
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp
    
}
const sendVerificationEmail=async(email,otp)=>{
    try {

        const transporter =nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,

            }
        })
        const mailOption={
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP:${otp}</h4><br></b>`

        }
        const info =await transporter.sendMail(mailOption)
        console.log("Email sent :",info.messageId);
        return true
        
        
    } catch (error) {
        console.error('Error sending email'.error);
        return false;
        
    }
}

const securePassword=async (password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }
}

const getforgotpassPage =async(req,res)=>{
    try {
        res.render("forgot-password")
    } catch (error) {
        res.redirect('/pageNotFount')
        
    }
}
 const forgotEmailValid=async(req,res)=>{
    try {
        
  const {email} = req.body;
  console.log(email);
  
  const findUser = await User.findOne({email:email});
  if(findUser){
    const otp = generateOtp()
    const emailSent= await sendVerificationEmail(email,otp)
    if(emailSent){
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotpass-otp")
        console.log("OTP",otp);
        
    }else{
        res.json({success:false, message:"falied to send OTP , Please try again"})
    }
  }else{
    res.render("forgot-password",{
        message:"User with this email does not exist"
    })
  }
 
    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound")
        
    }
 }
 const verifyForgotPassOtp=async(req,res)=>{
    try {
        const enterdOtp=req.body.otp;
        console.log(enterdOtp);
        console.log(req.session.userOtp);
        
        
        if(enterdOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:'/reset-password'});
        }else{
            res.json({success:false,message:'otp not matching'})
        }
    } catch (error) {
        res.status(500).json({success:false,message:'An error occured ,please try again'})
        
    }

 }

 const getResetPassPage= async (req,res)=>{
    try {
        res.render('reset-password')
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}


const resendOtp=async(req,res)=>{
    try {
        const otp=generateOtp();
        req.session.userOtp=otp;
        const email = req.session.email;
        console.log('resending ot to email:',email);
        const emailSent=await sendVerificationEmail(email,otp)
            if(emailSent){
                console.log('resend OTP',otp);
                res.status(200).json({success:true,message:'resend OTP susscesfully'})
                

            }
        
    } catch (error) {
        console.log('error in resend otp',error);
        res.status(500).json({success:false,message:'Internal server Error'})
        
        
    }
}
const postNewPassword=async (req,res)=>{
    try {
        const {newPass1,newPass2}=req.body;
        const email =req.session.email;
        if(newPass1 ===newPass2){
            const passwordHash=await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect('/login');
        }else{
            res.render('reset-password',{message:'password do not match'})
        }
        
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }


}
const userProfile=async (req,res)=>{
    try {
        const userId=req.session.user|| req.session.passport?.user;
        const addressData = await Address.findOne({userId:userId})
        const userData =await User.findById(userId);
        res.render('profile',{
            user:userData,
            userAddress:addressData
        })
    } catch (error) {
        console.error("Error for retrivev profile data",error);
        res.redirect('/pageNotFound')
        
    }

}
const changeEmail=async(req,res)=>{
    try {
        const userid=req.session.user._id ;
        const userData =await User.findById(userid);
        res.render('change-email', { 
            user: userData, // Pass the current user data
            message: null 
    })
    } catch (error) {
        console.error(error)
        
    }
}
const changeEmailValid= async (req,res)=>{
    try{
    const {email}=req.body;
    console.log(email);
    
    const userExists =await User.findOne({email});

    if(userExists){
        const otp=generateOtp()
        const emailSend=await sendVerificationEmail(email,otp);
        if(emailSend){
            req.session.userOtp=otp;
            req.session.userData=req.body;
            req.session.email=email;
            res.render('change-email-otp',{message:null})

            console.log(req.session.userOtp);
            
        }else{
            res.json('email-error')
        }

    }else{
        res.render('change-email',{message:'user vith this email not exist'})
    }
}catch(error){
    res.redirect('/pageNotFound')
}
}

const verifyEmailOtp=async(req,res)=>{
    try {
        const enterdOtp=req.body.otp
        if(enterdOtp === req.session.userOtp){
            res.render('new-email',{
                userData:req.session.userData,
                message:null
            })
        }else{
      
        res.render('change-email-otp',{message:'otp not matching'})
        }
    } catch (error) {
        res.redirect('/pageNotfound')
        
    }
}
const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.newEmail;
        const userId = req.session.user;

        // Validate the new email format (basic regex for demonstration)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).send("Invalid email format.");
        }
        
        // Check if the email is already in use
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).send("Email is already in use. Please choose another.");
        }

        // Update the user's email
        await User.findByIdAndUpdate(userId, { email: newEmail }, { new: true, runValidators: true });
        res.redirect('/userProfile');
    } catch (error) {
        console.error("Error updating email:", error);

        // Handle specific errors like duplicate key
        if (error.code === 11000) {
            res.status(400).send("Duplicate email error. This email is already taken.");
        } else {
            res.redirect('/pageNotFound');
        }
    }
};
 const changePassword=async (req,res)=>{
    try {
        res.render('change-password',{message:null})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
 }
 const changePasswordValid=async (req, res) => {
    try {
        const {email}=req.body
        const userExists = await User.findOne({email});
        if(userExists){
        const otp = generateOtp()
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            req.session.userOtp =otp;
            req.session.userData=req.body;
            req.session.email =email
            res.render('chage-password-otp')
            console.log('OTP',otp);
        }else{
           res.json({success:false,message:"Failed to send OTP ,please try again"}) 
        }
    }else{
        res.render('change-password',{
            message:'User with thiss email does not exist '
        })
    }
    } catch (error) {
        console.log('Error in change password validation',error)
     res.redirect('/pageNotFound')
    }
 }
 const userAddress = async (req, res) => {
    try {
        // Check if the user is logged in
        const userId = req.session.user  || req.session.passport?.user;;
        if (!userId) {
            return res.redirect('/login'); // Redirect to login if the user is not logged in
        }

        // Fetch user's addresses and user details
        const addressData = await Address.find({ userId }); // Fetch all addresses for the user
        const userData = await User.findById(userId); // Fetch user details

        // If user data is not found
        if (!userData) {
            return res.redirect('/pageNotFound'); // Redirect if the user doesn't exist
        }

        // If no addresses are found for the user, pass a default message
        if (!addressData.length) {
            addressData.push({ message: 'No addresses found for this user.' });
        }
        console.log(addressData);
        
        // Render the 'address' page with the necessary data
        res.render('address', {
            user: userData, // Pass user details
            userAddress: addressData
            
             // Pass user's address details
        });
    } catch (error) {
        // Log the error for debugging
        console.error("Error retrieving user address data:", error);

        // Optionally, log the user ID to trace the error better
        console.error("User ID causing the issue:", req.session.user);

        res.redirect('/pageNotFound'); // Redirect to the error page
    }
};

const addAddress=async(req,res)=>{
    try {
        const user = req.session.user;
        res.render('add-address',{
            user:user
        })

    } catch (error) {
        res.redirect('/pageNotFound');
        
    }
}
const postAddAddres = async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) {
        console.error('No userId in session');
        return res.redirect('/login'); // Redirect to login if no user is logged in
      }
  
      const userData = await User.findOne({ _id: userId });
      if (!userData) {
        console.error('User not found');
        return res.redirect('/pageNotFound'); // Redirect if user is not found
      }
  
      // Destructure the address data from the request body
      const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
      
      // Validate the inputs
      if (!addressType || !name || !city || !landMark || !state || !pincode || !phone) {
        console.error('Missing required fields');
        return res.redirect('/userAddress?error=missing_fields'); // Redirect with error if validation fails
      }
  
      // Validate pincode (6 digits) and phone number (10 digits)
      const pincodeRegex = /^[0-9]{6}$/;
      const phoneRegex = /^[0-9]{10}$/;
  
      if (!pincode.match(pincodeRegex)) {
        console.error('Invalid pincode format');
        return res.redirect('/userAddress?error=invalid_pincode');
      }
  
      if (!phone.match(phoneRegex)) {
        console.error('Invalid phone number format');
        return res.redirect('/userAddress?error=invalid_phone');
      }
  
      // Log the address data for debugging
      console.log('Address Data:', req.body);
  
      const userAddress = await Address.findOne({ userId: userData._id });
  
      if (!userAddress) {
        // If no address exists, create a new address record
        const newAddress = new Address({
          userId: userData._id,
          address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
        });
        await newAddress.save();
        console.log('New address saved:', newAddress);
      } else {
        // If address exists, push the new address to the existing array
        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
        await userAddress.save();
        console.log('Address added to existing record:', userAddress);
      }
  
      res.redirect('/userAddress'); // Redirect to the address page after success
    } catch (error) {
      console.error('Error adding address:', error);
      res.redirect('/pageNotFound'); // Handle any errors and redirect to page not found
    }
  };
  
  const editAddress= async (req,res)=>{
    try {
        const addressId= req.query.id;
        const user =req.session.user
        const currentAddress =await Address.findOne({
            'address._id':addressId
        })
        if(!currentAddress){
            return res.redirect('/pageNotFound')
        }
        const addressData =currentAddress.address.find((item)=>{
            return item._id.toString()===addressId.toString();

        })
        if(!addressData){
            return res.redirect('/pageNotFound')
        }
        res.render('edit address',{
            address:addressData,
            user:user
        })

    } catch (error) {
        console.log('Error in editing address')
        res.render('/pageNotFound')
        
    }

  }
  const posteditAddress = async (req, res) => {
    try {
        const { id: addressId } = req.query; // Address ID from query parameters
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body; // Data sent from the client
        const user = req.session.user; // User from session

        // Check if the user session exists
        if (!user) {
            return res.redirect("/login");
        }

        // Find the address by its ID within the user's addresses
        const findAddress = await Address.findOne({ "address._id": addressId, userId: user });
        if (!findAddress) {
            return res.redirect("/pageNotFound");
        }

        // Update the specific address with only provided fields
        await Address.updateOne(
            { "address._id": addressId },
            {
                $set: {
                    "address.$": {
                        _id: addressId,
                        ...(addressType && { addressType }),
                        ...(name && { name }),
                        ...(city && { city }),
                        ...(landMark && { landMark }),
                        ...(state && { state }),
                        ...(pincode && { pincode }),
                        ...(phone && { phone }),
                        ...(altPhone && { altPhone }),
                    },
                },
            }
        );

        // Redirect to the user's address page after successful update
        res.redirect("/userAddress");
    } catch (error) {
        console.error("Error in editing address:", error);
        res.redirect("/pageNotFound");
    }
};

const deleteAddress=async (req,res)=>{
    try {
        const addressId=req.query.id;
        const findAddress=await Address.findOne({'address._id':addressId})
        if(!findAddress){
            return res.status(404).json({message:'adress not found'})
        }
        await Address.updateOne({
            'address._id':addressId
        },
    {
        $pull:{
            address:{
                _id:addressId,

            }
        }
    })
res.redirect("/userAdderss")
        
    } catch (error) {
        console.error('Error in edited address')
        res.redirect("/pageNotFound")
        
    }
}


module.exports={
    getforgotpassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage ,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    userAddress,
    changePasswordValid,
    addAddress,
    postAddAddres,
    editAddress,
    posteditAddress,
    deleteAddress

}