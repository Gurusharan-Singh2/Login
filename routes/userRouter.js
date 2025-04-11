import express from 'express';
import crypto from 'crypto';
import { forgotPassword, getMe, login, logout, register, resetPassword, verifyOTP } from '../controllers/userController.js';
import {isAuthenticated} from '../middlewares/isAuthenticated.js';
const Userrouter=express.Router();

Userrouter.post('/register',register);
Userrouter.post('/otp-verification',verifyOTP);
Userrouter.post('/login',login);
Userrouter.get('/logout',isAuthenticated,logout);
Userrouter.get('/x',isAuthenticated,getMe);
Userrouter.get('/forgotPassword',forgotPassword);
Userrouter.put('/forgot/:token',resetPassword);


export default Userrouter;