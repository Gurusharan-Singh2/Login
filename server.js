import express from 'express'
import cors from 'cors';

import cookieParser from 'cookie-parser'
import { config } from 'dotenv';
import DBconnect from './database/dbConnect.js';
import { errorMiddleware } from './middlewares/error.js';
import Userrouter from './routes/userRouter.js';

config();
export const app=express();
DBconnect();
app.use(cors())

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.get('/',(req,res)=>{
  res.send("Hii  baby");
})

app.use('/api/v1/user',Userrouter);


app.use(errorMiddleware);



app.listen(process.env.PORT,()=>{
  console.log("Server Started");
  
})

