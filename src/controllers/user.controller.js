import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { userName, email, password, fullName } = req.body;

    if (
        [fullName, email, userName, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existingUser) {
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

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPaths);

    if (!avatar) {
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

const loginUser = asyncHandler(async (req, res) => {
    // Login user logic here

    const { userName, email, password } = req.body;

    if (!userName && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { userName }]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await
        generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken");

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
                "User logged in successfully",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        );

})

const logoutUser = asyncHandler(async (req, res) => {
    // Logout user logic here
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, "User logged out successfully", {})
        );

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request"
        );
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await
            generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    "Access token refreshed successfully",
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    }
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
}
)

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully", {})
    );
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, "Current user fetched successfully", req.user);
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError('400', "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName, //both works same
                email
            }
        },
        { new: true }
    ).select("-password ");

    return res
        .status(200)
        .json(
            new ApiResponse(200, "User details updated successfully", user)
        );
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError("400", "Avatar file is missing")    
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if (!avatar.url) {
        throw new ApiError("400", "Error uploading avatar file")        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
          avatar:avatar.url
        },
        {
            new:true
        }
    ).select("-password")

    return res
     .status(200)
     .json(
         new ApiResponse(200, "Avatar updated successfully", user)
     );
}) 
const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError("400", "Cover Image file is missing")    
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!coverImage.url) {
        throw new ApiError("400", "Error uploading coverImage file")        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
          coverImage:coverImage.url
        },
        {
            new:true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, "CoverImage updated successfully", user)
        );
}) 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}; 