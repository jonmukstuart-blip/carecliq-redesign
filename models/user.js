import mongoose from "mongoose";


const userSchema = new mongoose.Schema({

    fullName: {
        type:String,
        required:true
    },

    organisation:{
        type:String,
        required:true
    },

    role:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },

    phone:{
        type:String
    },

    password:{
        type:String,
        required:true
    },


    isVerified:{
        type:Boolean,
        default:false
    },


    verificationToken:{
        type:String
    },


    resetPasswordToken:{
        type:String
    },


    resetPasswordExpires:{
        type:Date
    },


    lastLogin:{
        type:Date
    }


},
{
    timestamps:true
});


export default mongoose.model(
    "User",
    userSchema
);