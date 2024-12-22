import { Router } from "express";
import { loginUser, registerUser,logoutUser } from "../controllers/user.controller.js"
import {upload } from "../middlewares/multer.middlewares.js"


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },
        { 
            name : "coverimage",
            maxCount : 1

        }
    ]),
    
    
    registerUser
)
router.route("/login").post(loginUser)



router.route("/logout").post(verifyJWT, logoutUser)


export default router