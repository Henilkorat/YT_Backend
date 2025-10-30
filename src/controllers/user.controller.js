import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    const { userName, email, password, fullName } = req.body;

    if (
        [fullName, email, userName, password].some((field) =>
         field?.trim()=== "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    
    const existingUser =await User.findOne({
        $or : [{email}, {userName}]
    })

    if(existingUser){
        throw new ApiError(409, "User already exists with this email or username");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPaths;
    if (
        req.files && Array.isArray(req.files.coverImage) 
        && req.files.coverImage.length > 0 
    ) {
            const coverImageLocalPaths = req.files.coverImage[0].path

    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPaths);

    if(!avatar){
        throw new ApiError(400, "avatar file is required");

    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        userName: userName.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "User registration failed");
    }

    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    );
})



export { registerUser };