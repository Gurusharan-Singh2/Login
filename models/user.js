import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import crypto from 'crypto';

const UserSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true
  },
  password:{
    type:String,
    required:true,
    minLength:[8,"Password should be at least 8 characters"],
    select:false
    
  },
  phone:String,
  accountVerified:{
    type:Boolean,
    default:false
  },
  verificationCode:Number,
  verificationCodeExpiry:Date,
  resetPasswordToken:String,
  resetPasswordExpiry:Date,
  role:{
    type:String,
    enum:["user","admin"],
    default:"user"
  },
  unverifiedAt: {
    type: Date,
    default: Date.now,    
    expires: 900           
  },
  createdAt:{
    type:Date,
    default:Date.now
  },
},{timestamps:true}); 

UserSchema.pre("save",async function(next){
  if(!this.isModified("password")) return next();
  this.password=await bcrypt.hash(this.password,10);
  next();
});


UserSchema.methods.comparePassword=async function (enterdPassword) {
  return await bcrypt.compare(enterdPassword,this.password);
}

UserSchema.methods.generateVerificationCode=function () {
  function randomFiveDigit() {
    return Math.floor(10000 + Math.random() * 90000);
  }
let verificationCode=randomFiveDigit();
this.verificationCode=verificationCode; 
this.   verificationCodeExpiry=Date.now()+10*60*1000;
return verificationCode;
}

UserSchema.methods.generateToken= async function () {
   return  jwt.sign({id:this._id},process.env.JWT_SECRET,{
    expiresIn:process.env.JWT_EXPIRE
   })
}


UserSchema.methods.generateResetToken= async function(){
  const resetToken= crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken= await crypto.createHash("sha256").update(resetToken).digest("hex");
  
  this.resetPasswordExpiry=Date.now()+15*60*1000;
  return resetToken;
}


export const User=mongoose.models.User || mongoose.model("User",UserSchema);