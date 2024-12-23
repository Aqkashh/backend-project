//  verify if user exists or not => work of auth middlewarre 
import {asyncHandler} from "../utils/asyncHAndler.js";
import {ApiError} from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, _ , next) => {

   try {
     // generation token using cookies and we taken access token from cookies and header and we are checking if token is present or not if not present then we are throwing error of 401 unauthorised request,Header is for mobile application and cookies is for web application
    //  Header: Used for mobile applications, where the token is passed in the Authorization header and bearer is used to pass the token.
 const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "").trim();
 
 if (!token ){
     throw new ApiError(401,"unauthorised request ")
 }
 
 console.log("token:",token);
  // here we are verifying the token by using jwt.verify methodand passing token and secret key so that we can get the user id and other details the flow of code is like this it takes token and secret key and then it decodes the token and then we get the user id and other details in decoded token.we used secret key because the the token is in encrypted form so we need to decrypt it to get the user id and other details. and the token is accesstoken
  const decodedTOken = jwt.verify(token ,process.env.ACCESS_TOKEN_SECRET)
 console.log("decoded token:",decodedTOken);
 
//  here we are finding the user by using the user id which we got from the decoded token 
  const user = await User.findById(decodedTOken?._id).select("-password -refreshtoken")
 if (!user){
     throw new ApiError(401,"invalid access token ");
 }
//  here we are storing the user in req.user so that we can use it in other routes we can done this because req is a object and we can store anything in it and we can use it in other routes
     req.user = user;
    
     next()
   } catch (error) {
    throw new ApiError(401,error?.message || "inavalid access token")
    
   }
    
});