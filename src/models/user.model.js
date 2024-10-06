import mongoose  from "mongoose";
import jwt  from "jsonwebtoken";
import bcrypt from "bcrypt"
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

userSchema.pre("save",async function (next) {
  if (!this.isModified("password")) return next();
  this.password=bcrypt.hash(this.password,10)
  next()
})

userSchema.methods.isPasswordCorrect = async function (password){

 return await bcrypt.compare(password, this.password)

}

userSchema.methods.generateAccessToken = function(){
   return jwt.sign(
    {
    _id: this.id,
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
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
    _id: this.id,
    email: this.email,
    fullname: this.fullname,
    username: this.username,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_SECRET
    }
  )
}



export const User = mongoose.model("User",userSchema)