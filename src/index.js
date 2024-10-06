// require('dotenv').config({path : '/.env'})
import dotenv from "dotenv";

import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT|| 8000, ()=>{
        console.log(`server is running at port ${process.env.PORT}`);
        
    })// to start the server and listen .
})
.catch((err)=>  {
    console.log("mongo db connetion failed ",err);
    
})

// import express from "express"
// const app = express()
// ;( async ()=>{
//  try{
//  await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//  app.on('error',(error)=>{
//     console.log("err",error);
//     throw error
//  })
 
 
//  app.listen (process.env.PORT,()=>{
//     console.log(`app is listening on port ${process.env.PORT}}`);
//  })
 
// }
 
//  catch(error){
//       console.error('ERROR',error )
//       throw err
//  }

// })()