import { User } from "../models/user.js";
import { catchAsyncError } from "./catchAsyncError.js";
import jwt from 'jsonwebtoken';
import ErrorHandler from "./error.js";



export const isAuthenticated=catchAsyncError(async(req,res,next)=>{
  const {token}=req.cookies;
  
  
  if(!token){
    return next(new ErrorHandler("Authentication Failed"),400);
  }

  const decode= jwt.verify(token,process.env.JWT_SECRET);

  const x=await User.findById(decode.id);
  if(!x){
    return next(new ErrorHandler("Authentication Failed"),400);
  }
  req.user=x;
  next();
})

