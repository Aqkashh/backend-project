//  verify if user exists or not => work of auth middlewarre 
import {asyncHandler} from "../utils/asyncHAndler";
import {ApiError} from "../utils/ApiError";
import jwt from "jasonwebtoken";
import {User} from "..models/user.model";

export const verifyJWT = asyncHandler(asyn (req, _,next)=>{

   try {
     // generation token using cookies 
 const token = req.cokies?.accessToken || req.header("Authorization")?.replace("bearer", "")
 
 if (!token ){
     throw new ApiError(401,"unauthorised request ")
 }
 
 
 //  verify token and access token
  const decodedTOken = jwt.verify(token ,process.env.ACCESS_TOKEN_SECRET)
 
 
 
  const user = await User.findById(decodedTOken?._id).select("-password -refreshtoken")
 if (!user){
     throw new ApiError(401,"invalid access token ");
 
 
     req.user = user;
     next()
   } catch (error) {
    throw new ApiError(401,error?.message || "inavalid access token")
    
   }
    
}
})