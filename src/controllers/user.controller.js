import { asyncHandler } from "../utils/asyncHAndler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiRespomse.js";
import mongoose from "mongoose"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId)=>{
 try 
  // making user which is distinguish by userid 
  { const user = await User.findById(userId)
    if (!user) throw new ApiError(404, "User not found");

    // now access and refresh token of user is created
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  // saving refresh token in DB

   user.refreshToken= refreshToken
   await user.save({validateBeforeSave:false})

   return {accessToken,refreshToken}
    
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new ApiError(500,"something went wrong genereting token");
    
     }
}

const registerUser = asyncHandler (async (req,res)=>
    {

        // get details from user 

        const {fullname, email, username , password }= req.body 
        console.log("email:" ,email );
        
        if (fullname ===""){
            throw new ApiError(400,"fullname is required ")
        }
        if (email ===""){
            throw new ApiError(400,"email is required ")
        }
        if (username ===""){
            throw new ApiError(400,"username is required ")
        }
        if (password ===""){
            throw new ApiError(400,"password is required ")
        }

  const existedUser = await User.findOne({
    $or: [{username}, { email }]
  })
      if (existedUser){
        throw new ApiError(409," user with email and username is existed ")
      }

// yha se cloudinary wala kaam => phle localpath liye=> phir us local path ko cloudinary pe daal diye , most importnat is to use if statement ki local path hai bhi ya nhi .
console.log("Files received:", req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverimageLocalPath = req.files?.coverimage?.[0]?.path;
    if (!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
       }

   const avatar = await  uploadOnCloudinary(avatarLocalPath);
   const coverimage = await uploadOnCloudinary(coverimageLocalPath);
   if (!avatar){
    throw new ApiError(400,"avatar file is required")
   }


//    all work done => upload the registered data to DB 
// with the help of user.
 
const user = await User.create({// to save new user in db
  fullname,
  avatar:avatar.url,
  coverimage:coverimage?.url||" ",
  email,
  password,
  username: username.toLowerCase()
})

  // ._id us given by mongo db to user which is unique and used to identify user so that we can use it to find user
  // .select is used to select the field which we want to show to user but here we are not showing password and refresh token to user by using - sign

const createdUser = await User.findById(user._id).select(
    "-password -refreshTokens"
)
 if (!createdUser){
    throw new ApiError(500,"something went wrong while registering the user `")
 }
// here we are sending the response to user that user is registered successfully
 return res.status(201).json(
    new ApiResponse(200,createdUser,"user registered successfully")
 )
})

// login
const loginUser = asyncHandler (async (req,res)=>{
  //req body=> data
  //username or email,
  //find the user 
  // password check 
  // access or refresh token 
  // send cookie 
  



  // email ,username , password taken here
  const { email ,username,password}= req.body
 

  // checking if usernmane and email field is filled 
  if (!username && !email){
    throw new ApiError(400," username and email is required ")
  }


  // finding one of the field in db  using mongoose operator $or (here use User.findone ) and store it in user 
 const user = await User.findOne({
    $or:[{username },{ email}]
  })


// check if user is existed if not => error 
 if (!user){
throw new ApiError ( 404 , "user does not exist ")}


// check for password pass the password from req.body to our function  tthis will return true or false 
const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid){
    throw new ApiError(401,"invalid credentials")
}


// generation of access and refresh token 

const {   accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)


// now we have to send cokies => made a loggedinuser which have access to all field except password or refresh token 

const loggedInUser= await User.findById(user._id).select("-password -refreshToken")


// makking cookies => use option => by default anyone can modify cookies => by using httponly true and secure true it can only modified ffrom server 
const options = {
  httpOnly: true,
  secure: true
}

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
  new ApiResponse(
      200, 
      {
          user: loggedInUser, accessToken, refreshToken
      },
      "User logged In Successfully"
  )
)

})
//  LOGOUT USER=> remove cookies and reset refresh token 
const logoutUser= asyncHandler(async(req,res)=>{
  // find user by id and set refresh token to undefined
  // findByIDAndUpdate is function of mongoose which is used to find user by id and update the field which we want to update can be used usin User only.
User.findByIdAndUpdate(
  req.user._id,
  {
        $set :{
         refreshTokens: undefined 
             }
 },
  // {new:true} is used to return the updated user
  {
    new:true
  }
)// here we are clearing the cookies by using clearcookies method and passing the name of cookies and options which we have used while creating the cookies
  const options= {
    httpOnly: true ,
    secure:true

  }
  return res 
  .status(200)
  .clearCookie('accessToken',options)
  .clearCookie('refreshToken',options)
  .json (new ApiResponse(200,{},"user logged out "))

 })


 const refreshAccessToken = asyncHandler(async(req,res)=>{
 // getting cookies from req and body(req for web and body for mobile)
 const incomingrefreshToken = req.cookies.refreshToken|| req.body.refreshToken
 
 if(!incomingrefreshToken){
   throw new ApiError(400,"Unauthorized request")
 }

try {
  const decodedToken= jwt.verify(incomingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
  
  const user = await User.findById(decodedToken?.userId)
  if (!user){
    throw new ApiError(401,"invalid refresh token")
  }
  if (incomingrefreshToken !== user?.refreshToken){
    throw new ApiError(401,"invalid refresh token")
  
  }
  const options = {
  httpOnly:true,
  secure:true
  
  }
  const {accessToken,newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
  return res 
  .status(200)
  .clearCookie('accessToken',accessToken,options)
  .clearCookie('refreshToken',newrefreshToken,options)
  .json(new ApiResponse(200,{accessToken,newrefreshToken},"tokens refreshed successfully"))
} catch (error) 
  {
  console.error("Error refreshing tokens:", error);
  throw new ApiError(401, "Something went wrong refreshing tokens");
  }
 })

export  {
    registerUser,
    loginUser,
    logoutUser
} 