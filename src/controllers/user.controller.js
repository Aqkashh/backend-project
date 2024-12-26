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
// REFRESH TOKEN => if access token is expired then we can use refresh token to get new access token.

 const refreshAccessToken = asyncHandler(async(req,res)=>{
 // getting cookies from req and body(req for web and body for mobile)
 const incomingrefreshToken = req.cookies.refreshToken|| req.body.refreshToken
 
 if(!incomingrefreshToken){
   throw new ApiError(400,"Unauthorized request")
 }
 
 
 //checks the incomingrefreshToken is valid or not,if valid , decoded token will hold the decoded payload(user info , token expiry)
try {
  const decodedToken= jwt.verify(incomingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
  
  
  const user = await User.findById(decodedToken?._id)
  if (!user){
    throw new ApiError(401,"invalid refresh token")
  }

  //checks the incomingrefreshToken which is we get from req.cookies.refreshToken is same as user.refreshToken which is stored in db.
  if (incomingrefreshToken !== user?.refreshToken){
    throw new ApiError(401,"invalid refresh token")
   }
  const options = {
  httpOnly:true,
  secure:true
  
  }
  //It automatically creates variables named accessToken and newrefreshToken and stores the respective values from the returned object.
  const {accessToken,newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
  return res //sending respose back to use r
  .status(200)
  .clearCookie('accessToken',accessToken,options)
  .clearCookie('refreshToken',newrefreshToken,options)
  .json(
    new ApiResponse
    (200,
      {accessToken,newrefreshToken},
      "tokens refreshed successfully"))
} catch (error) 
  {
  console.error("Error refreshing tokens:", error);
  throw new ApiError(401, "Something went wrong refreshing tokens");
  }
 })

const changeCurrentPassword= asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}= req.body


  const user =  await User.findById( req.user._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)


   if (!isPasswordCorrect){
     throw new ApiError(401,"invalid old password")
   }
  user.password = newPassword

   await user.save({validateBeforeSave:false})
 
  return res
  .status(200)
  .json(new ApiResponse(200,{},"password updated successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
return res.status(200).json(new ApiResponse(200,req.user,"user found"))
// here we are sending the response to user that user is found successfully,we found user becau 
})

const updateAccountdetails = asyncHandler(async(req,res)=>{
const {fullname, email}= req.body 

if (!fullname|| !email ){
  throw new ApiError(400,"fullname and email is required")
}

const user = User.findByIdAndUpdate(
  req.user._id,
  {
      $set: {
          fullname,
          email
      }
   }
,{new:true}

).select("-password ")
return res
.status(200)
.json(new ApiResponse(200,user,"account updated successfully"))


})

const updateUserAvatar = asyncHandler(async(req,res)=>{
   
const avatarLocalPath = req.file?.path;
if (!avatarLocalPath){
  throw new ApiError(400,"avatar file is required")
 }

 const avatar = await uploadOnCloudinary(avatarLocalPath)

 if (!avatar.url){
  throw new ApiError(500,"something went wrong while uploading avatar")
 }  
 const user = await User.findByIdAndUpdate(
  req.user._id,
  {
      $set: {
          avatar: avatar.url
      }
   })
return res.status(200).json(new ApiResponse(200,user,"avatar updated successfully"))
})

const updateUserCoverimage = asyncHandler(async(req,res)=>{
   
  const coverimageLocalPath = req.file?.path;
  if (coverimageLocalPath){
    throw new ApiError(400,"coverimage file is required")
   }
  
   coverimage = await uploadOnCloudinary(coverimageLocalPath)
  
   if (!coverimage.url){
    throw new ApiError(500,"something went wrong while uploading avatar")
   }  
   const user = await User.findByIdAndUpdate(
    req.user._id,
    {
        $set: {
            coverimage: coverimage.url
        }
     })
  return res .status(200).json(new ApiResponse(200,user,"coverimage updated successfully"))
  })

const getUserChannelProfile = asyncHandler(async(req,res)=>{

 const {username }=req.params // to get username from url
if (!username?.trim()){
  throw new ApiError(400,"username is missing")
}

const channel = await User.aggregate([
{
  $match:{   // match is used for filtering the data , here the username which we have is from url and  matched with username in db .
      username : username?.toLowerCase() 
    }
},
{
  $lookup:{ // lookup is used to join the data from other collection , here we are joining the data from subscription collection
     from :"subscriptions", // from where we want to join the data 
     localField:"_id",//field of user collection which we want to match with foreign field    
     foreignField:"channel",//field of subscription collection which we want to match with local field  
     as:"subscribers"
    } 
},
{
 $lookup :{
      from:"subscriptions",
      localField:"_id",
      foreignField:"subscriber",
      as:"subscribedTo"


  }
},
{
  $addFields:{ // addfields is used to add new field in the data which we have got from db
    subscribersCount:{$size:"$subscribers"}, 
  channelSubscribedTocount:{$size:"subscribedTo"} ,
  isSubscribed:{
    $cond:{
      if:{$in:[req.user?._id,"$subscribers.subscriber"]},
      then :true,
      else:false
    }
  }
  }
},
{
  $project:{ // project is used to show the field which we want to show to user
    fullname:1,
    username:1,
    email:1,
    avatar:1,
    coverimage:1,
    subscribersCount:1,
    channelSubscribedTocount:1,
    isSubscribed:1
  }
}

])

if (!channel?.length){//we used this logic because .length will check if the channel is empty or not
  throw new ApiError(404,"channel not found")
}
return res
.status(200)
.json(
  new ApiResponse(200,channel[0],"user channel fetched successfully"))
})

const getwatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
{
  $match:{
    _id:mongoose.Types.ObjectId(req.user._id) // in mongodb user id is stored in object id format so we have to convert it to object . req.user._id is in string format
  },
  
},
{
  $lookup:{
    from:"videos",
    localField:"watchHistory",
    foreignField:"_id",
    as:"watchHistory",
    pipeline:[{
      $lookup:{
        from:"users",
        localField:"channel",
        foreignField:"_id",
        as:"owner",
        pipeline:
        [
          {
          $project:{
            fullname:1,
            username:1,
            avatar:1
          }
        }]
      },
    },
    {
     $addFields:{
       owner:{
        $arrayElemAt:["$owner",0]}

      }
    }

    ]
  }       
}
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))

})
  
export  {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountdetails,
    updateUserAvatar,
    updateUserCoverimage,
    getUserChannelProfile,
    getwatchHistory
} 