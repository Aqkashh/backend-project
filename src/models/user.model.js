import mongoose  from "mongoose";
import jwt  from "jsonwebtoken";
import bcrypt from "bcrypt"
const {Schema}=mongoose;
const userSchema = new mongoose.Schema(
    {
      username:
      {
        type: String,
        required: true,
        unique: true,
        lowercase: true ,
        trim: true,
        index: true 
      },
        email:
        {
        type: String,
        required: true,
        unique: true,
        lowercase: true ,
        trim: true,
       },
       fullname:
       {
        type: String,
        required: true,
        trim: true,
        index:true 
       },
       avatar :
       {
        type: String,
        required: true,
        
       },
       coverimage:
       {
        type : String
       },
       watchHistory:
       {
        type: Schema.Types.ObjectId,
        ref:"Video"
       },
       password:{
        type: String ,
        required: [true,'Password is required']
       },
       refreshTokens:{
        type:String
       }

        
    },{
        timestamps:true 
    }

)
// this is pre hook , used to encrypt the password.
userSchema.pre("save",async function (next) {
  if (!this.isModified("password")) return next();
  this.password=await bcrypt.hash(this.password,10)
  next()
})

// in method we made our own isPasswordCorrect to Compare  encrypted and saved password in DB
userSchema.methods.isPasswordCorrect = async function (password){

 return await bcrypt.compare(password, this.password)

}

//Access token generation .
userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
    {
    _id: this._id,
    email: this.email,
    fullname: this.fullname,
    username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

// refresh token generation
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
    _id: this._id,
    // email: this.email,
    // fullname: this.fullname,
    // username: this.username,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}



export const User = mongoose.model("User",userSchema)