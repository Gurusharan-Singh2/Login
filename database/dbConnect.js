import mongoose from "mongoose";

const DBconnect=async()=>{
 await mongoose.connect(process.env.DB_URL).then(()=>console.log("DB connected")
  ).catch((e)=>console.log(e)
  )
}

export  default DBconnect
