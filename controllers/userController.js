
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/user.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import crypto from 'crypto';

// UserRegister
export const register=catchAsyncError(async(req,res,next)=>{
  try {
    const name = req.body.name?.trim();
const email = req.body.email?.trim().toLowerCase();
const phone = req.body.phone?.trim();
const password = req.body.password;
    if(!name || !email || !phone|| !password ){
      return next(new ErrorHandler('All fields are  required', 400));
    }

    function validatePhoneNumber(phone){
      const phoneregex=/^\+91\d{10}$/;
      return phoneregex.test(phone);
    }
    if(!validatePhoneNumber(phone)){
      return next(new ErrorHandler('Invalid phone number', 400));
    }

    const existingUser=await User.findOne({
      $or:[{
        email,
        accountVerified:true
      },{
        phone,
        accountVerified:true
      }]
    });

    if(existingUser){
      return next(new ErrorHandler('Phone or email already use', 400));
    }

    const registrationAttemptByUser=await User.find({
      $or:[{
        email,
        accountVerified:false
      },{
        phone,
        accountVerified:false
      }]
    });

    if(registrationAttemptByUser.length>3){
      return next(new ErrorHandler('You have exceed the maximum number of attempts(3).Please try after an hour', 400));
    }

    const Userdata={
      name,phone,email,password
    }

    const user= await User.create(Userdata);
    const verificationCode= await user.generateVerificationCode();
 
    await sendVerificationCode(verificationCode,email);
    await user.save();
    res.status(200).json({
      success:true,
      
    });
    
  } catch (error) {
    next(error)
  }
})

// email Template generate
const generateEmailTemplate=(verificationCode)=>{
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your OTP Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 480px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #4f46e5;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
      text-align: center;
    }
    .otp {
      font-size: 36px;
      font-weight: bold;
      margin: 20px 0;
      letter-spacing: 5px;
      color: #4f46e5;
    }
    .footer {
      font-size: 13px;
      color: #888;
      text-align: center;
      padding: 15px 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Verify Your Email</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your One-Time Password (OTP) for verification is:</p>
      <div class="otp">${verificationCode}</div>
      <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
    </div>
    <div class="footer">
      &copy; {{2025}} QuickNotesHub. All rights reserved.
    </div>
  </div>
</body>
</html>
`
}

// verification Send
const sendVerificationCode=async(verificationCode,email)=>{
  try {
    const message = generateEmailTemplate(verificationCode);
  await sendEmail({email,subject:"Your Verification Code",message})
    
  } catch (error) {
    throw new ErrorHandler(`Failed to send verification code: ${error.message}`, 500);
  }
  

}

// verification Start
export const verifyOTP=catchAsyncError(async(req,res,next)=>{
  const {email,otp}=req.body;
  console.log(email,otp);
  
  try {
    const userAllEntries=await User.find({
      email,
      accountVerified:false
    }).sort({createdAt:-1});
    if(!userAllEntries){
      return next(new ErrorHandler('User not found', 400))
    }
    let user=userAllEntries[0];
   
    
    if(user.verificationCode !==Number(otp)){
      return next(new ErrorHandler('Invalid OTP', 400))
    }

    const currentTime=Date.now();
    const verificationCodeExpiry=new Date(user.verificationCodeExpiry).getTime();
    
    if(currentTime>verificationCodeExpiry){
      return next(new ErrorHandler('OTP Expired', 400));
    }
    let token;
    try {
      token = await user.generateToken();
    } catch (err) {
      return next(new ErrorHandler("Token generation failed", 500));
    }
    user.accountVerified=true;
    user.unverifiedAt=null;
    user.verificationCodeExpiry=null,
    user.verificationCode=null;
    await user.save({validateModifiedOnly:true})
   
    sendToken(token,user,200,"Account verified",res);
    
  } catch (error) {
    return next(new ErrorHandler("Internal Server Error",500));
  }
})

// Login
export const login=catchAsyncError(async(req,res,next)=>{
  const {email,password}=req.body;
  
  if(!email || !password){
    return(new ErrorHandler("Email password required",400));
  }
  const user=await User.findOne({
    email,
    accountVerified:true
  }).select("+password");

  if(!user){
   return(new ErrorHandler("User not found",400));
  }
  const cmp=await user.comparePassword(password);
  if(!cmp){
    return(new ErrorHandler("Passworrd is wrong",400));
  }
  let token =await user.generateToken();

  sendToken(token,user,200,"Login susseccfully",res);

})

// logout

export const logout=catchAsyncError(async(req,res,next)=>{
  res.status(200).cookie('token',null,{
    expires:new Date(Date.now()),
    httpOnly:true
  }).json({
    success:true,
    messaage:"User Logout Successfully"
  })
})

// get user
export const getMe=(req,res)=>{
  res.status(200).json({
    success:true,
    user:req.user
  })
}

export const forgotPassword=catchAsyncError(async(req,res,next)=>{
const user=await User.findOne({
  email:req.body.email,
  accountVerified:true
});

if(!user) {
  return next(new ErrorHandler("User not found",400));
}

try {
  const restToken=await user.generateResetToken();
  console.log(restToken);

  await user.save({ validateBeforeSave: false });
  
const message=`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f6f6f6;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .button {
        display: inline-block;
        padding: 12px 20px;
        margin-top: 20px;
        background-color: #007bff;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #777777;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Forgot Your Password?</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <a href=${process.env.FRONTED_URL}/forgot/${restToken} class="button">Reset Password</a>
      <p>If you didn’t request a password reset, you can safely ignore this email.</p>
      <div class="footer">
        <p>Thanks,<br>The YourApp Team</p>
      </div>
    </div>
  </body>
</html>
`
const response=await sendEmail({email:user.email,subject:"Forgot Password",message});

if(response){

  res.status(200).json({
    success:true,
    message:"Reset Password Mail Sent"
  })

}
} catch (error) {
  user.resetPasswordToken=undefined;
  user.resetPasswordExpiry=undefined;

  await user.save({validateBeforeSave: false });
  return next(new ErrorHandler("Something went wrong"+error,400));
  
}

})


// reset password

export const resetPassword=catchAsyncError(async(req,res,next)=>{
  const {token}=req.params;
  const {password,Cpassword}=req.body;

  const a=crypto.createHash("sha256").update(token).digest("hex");

  console.log(a);
  
 

  if(!password ||!Cpassword){
    return next(new ErrorHandler("Password and Confirm Password required ",400));
  }
  const user=await User.findOne({
    resetPasswordToken:a,
    resetPasswordExpiry:{$gt:Date.now()},
  })

  if(!user){
    return next(new ErrorHandler("User not found ",400));
  }
  if(password!==Cpassword){
    return next(new ErrorHandler("Password and Confirm Password not match",400));
  }
  user.password=password;
  user.resetPasswordToken=undefined;
  user.resetPasswordExpiry=undefined;

  let x=await user.save({validateBeforeSave: false });
  
  if(x){
    let token =await user.generateToken();

    sendToken(token,user,200,"Password Updated Successfully",res);
  }


})

