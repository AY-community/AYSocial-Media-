const User = require("../Models/User");
const Notification = require("../Models/Notification");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const geoip = require("geoip-lite");
const countries = require("i18n-iso-countries");
const axios = require("axios");
const sendMail = require("../Config/EmailSend");
const { GetEmailTemplate } = require("../Templates/EmailTemplate");

const signUpController = async (req, res) => {
  try {
    let { userName, email, password } = req.body;
    userName = userName?.trim().toLowerCase();
    email = email?.trim();
    password = password?.trim();

    const isAlphaNumUnderscore = (user) =>
      /^(?=.*[a-zA-Z])[a-zA-Z0-9_]+$/.test(user);
    const isStrongPassword = (pass) =>
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\w\s]).+$/.test(pass);

    const existingUserByEmail = await User.findOne({ email });
    const existingUserByUsername = await User.findOne({ userName });

    if (!userName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    } else if (userName.length < 3 || userName.length > 20) {
      return res
        .status(400)
        .json({ error: "Username must be between 3 and 20 characters" });
    } else if (password.length < 6 || password.length > 20) {
      return res
        .status(400)
        .json({ error: "Password must be between 6 and 20 characters" });
    }

    if (!isAlphaNumUnderscore(userName)) {
      return res.status(400).json({
        error: "username must only contain letters, numbers, or underscores",
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must contain at least one letter, one number, and one special character",
      });
    }

    if (
      (existingUserByEmail &&
        existingUserByEmail.verificationTokenExpires > Date.now()) ||
      (existingUserByUsername &&
        existingUserByUsername.verificationTokenExpires > Date.now())
    ) {
      return res.status(400).json({
        error:
          "Email verification already sent, wait for 5 minutes and try again.",
      });
    }

    if (existingUserByUsername && existingUserByUsername.verification === true) {
      return res.status(400).json({ error: "Username already exists" });
    }

    if (existingUserByEmail && existingUserByEmail.verification === true) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (existingUserByEmail && existingUserByEmail.verification === false) {
      await User.deleteOne({ email });
    }

    if (
      existingUserByUsername &&
      existingUserByUsername.verification === false
    ) {
      await User.deleteOne({ userName });
    }

    // Get IP address from request
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    // Use a fallback IP for development/testing environment
    if (process.env.NODE_ENV !== "production") {
      ip = "8.8.8.8"; // Google's DNS - will resolve to USA
      console.log("Development mode: Using fallback IP for geolocation");
    }

    // Get country from IP
    const geo = geoip.lookup(ip);
    const country = geo?.country || "Unknown";

    countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
    const countryName = countries.getName(country, "en") || "Unknown";

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = {
      userName: userName,
      email: email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 5 * 60 * 1000),
      country: countryName,
    };

    await User.create(createUser);

    const html = GetEmailTemplate({
      username: userName,
      message:
        "Welcome to AY Social Media! Please verify your email address to complete your registration.",
      link: `${process.env.CLIENT_URL}/auth/verify/${verificationToken}`,
      topic: "Verify your email",
    });

    sendMail(email, "Verify your email", html);
    return res.status(201).json({
      message:
        "Account created successfully! Please check your email to verify your account before logging in.",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const verifyController = async (req, res) => {
  try {
    const { token } = req.params;

    const userFounded = await User.findOne({ verificationToken: token });

    if (!userFounded) {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (userFounded.verificationTokenExpires < Date.now()) {
      return res.status(400).json({ error: "Token expired" });
    }
    const profileToken = crypto.randomBytes(32).toString("hex");
    userFounded.verification = true;
    userFounded.verificationToken = undefined;
    userFounded.verificationTokenExpires = undefined;
    userFounded.profileToken = profileToken;
    await userFounded.save();

    return res
      .status(200)
      .json({ message: "Email verified successfully", token: profileToken });
  } catch (error) {
    console.error("Error during verification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const loginController = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email?.toLowerCase()?.trim();
    password = password?.trim();

    if (!password || !email) {
      return res.status(400).json({ error: "All fields are required" });
    } else if (password.length < 6 || password.length > 20) {
      return res
        .status(400)
        .json({ error: "Password must be between 6 and 20 characters" });
    }

    const userFound = await User.findOne({ email });

    if (!userFound) {
      return res
        .status(404)
        .json({ error: "Email or password is incorrect, please try again" });
    } else {
      const passwordMatch = await bcrypt.compare(password, userFound.password);
      if (!passwordMatch) {
        return res
          .status(400)
          .json({ error: "Email or password is incorrect, please try again" });
      } else {
        if (!userFound.verification) {
          return res.status(403).json({
            error: "Please verify your email before logging in.",
          });
        }
        if (!userFound.birthday) {
          return res.status(428).json({
            error: "Please add your birthday before logging in.",
            token: userFound.profileToken,
          });
        } else {
          const token = jwt.sign(
            { id: userFound._id, email: userFound.email },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
          );

          // Cookie configuration based on environment
          const cookieOptions = {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            secure: process.env.NODE_ENV === "production",
          };

          res.cookie("token", token, cookieOptions);

          return res.status(200).json({
            message: "User logged in successfully",
          });
        }
      }
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const otpSendController = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    email = email.toLowerCase().trim();
    const userFound = await User.findOne({ email });

    if (!userFound || userFound.verification === false) {
      return res
        .status(400)
        .json({ error: "Email is incorrect or doesn't exist, try again" });
    }

    if (userFound.otpExpires && userFound.otpExpires > Date.now()) {
      return res
        .status(429)
        .json({ error: "OTP already sent. Try again later." });
    } else {
      const generateOTP = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });

      const hashedOTP = await bcrypt.hash(generateOTP, 10);
      userFound.otp = hashedOTP;
      userFound.otpExpires = Date.now() + 300000;
      await userFound.save();

      const html = GetEmailTemplate({
        username: userFound.userName,
        message: `Your OTP code will expire in 5 minutes for your security.`,
        otp: generateOTP,
        topic: "OTP Code Confirm",
      });

      sendMail(email, "OTP Code Confirm", html);

      return res
        .status(200)
        .json({ message: "OTP has been sent to your email" });
    }
  } catch (err) {
    console.error("Error during OTP send:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const otpConfirmController = async (req, res) => {
  try {
    let { otp, email } = req.body;

    if (!otp || !email) {
      return res.status(400).json({ error: "Please fill all fields" });
    }

    otp = otp.trim();
    email = email.toLowerCase().trim();

    const userFound = await User.findOne({ email });

    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!userFound.otp || userFound.otpExpires < Date.now()) {
      return res
        .status(400)
        .json({ error: "Invalid or expired OTP. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, userFound.otp);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid OTP code, try again" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    userFound.resetToken = resetToken;
    userFound.resetTokenExpire = new Date(Date.now() + 10 * 60 * 1000);
    userFound.otp = undefined;
    userFound.otpExpires = undefined;

    await userFound.save();

    return res.status(200).json({ token: resetToken });
  } catch (err) {
    console.error("Error during OTP confirmation:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const resetPasswordController = async (req, res) => {
  try {
    let { newPassword, confirmNewPassword, token } = req.body;
    newPassword = newPassword?.trim();
    confirmNewPassword = confirmNewPassword?.trim();

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: "Please fill all the fields" });
    }

    const userFoundPerToken = await User.findOne({ resetToken: token });

    if (!userFoundPerToken) {
      return res.status(400).json({
        error: "Invalid or expired reset token. Please request a new one.",
      });
    }

    if (userFoundPerToken.resetTokenExpire < Date.now()) {
      return res.status(400).json({ error: "Reset token has expired." });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .json({ error: "The inputs below don't match, check and try again" });
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      return res
        .status(400)
        .json({ error: "Password must be between 6 and 20 characters" });
    }

    const isStrongPassword = (pass) =>
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^\w\s]).+$/.test(pass);
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error:
          "Password must contain at least one letter, one number, and one special character",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    userFoundPerToken.password = hashedPassword;
    userFoundPerToken.resetToken = undefined;
    userFoundPerToken.resetTokenExpire = undefined;

    await userFoundPerToken.save();

    return res
      .status(200)
      .json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("Error during password reset:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const addBirthdayController = async (req, res) => {
  try {
    let { birthDay, token } = req.body;

    if (!birthDay) {
      return res.status(400).json({ error: "Birthday is required." });
    }

    const birthdayDate = new Date(birthDay);

    if (!(birthdayDate instanceof Date) || isNaN(birthdayDate)) {
      return res.status(400).json({ error: "Invalid birthday format." });
    }

    const today = new Date();
    const age =
      today.getFullYear() -
      birthdayDate.getFullYear() -
      (today.getMonth() < birthdayDate.getMonth() ||
      (today.getMonth() === birthdayDate.getMonth() &&
        today.getDate() < birthdayDate.getDate())
        ? 1
        : 0);

    if (age < 13) {
      return res
        .status(400)
        .json({ error: "You must be at least 13 years old." });
    }

    const user = await User.findOneAndUpdate(
      { profileToken: token },
      { birthday: birthdayDate },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found or invalid token." });
    }

    const systemAccount = await User.findOne({ 
      userName: process.env.SYSTEM_ACCOUNT_USERNAME || 'true_adam' 
    });

    if (systemAccount) {
      await Notification.create({
        recipient: user._id,
        sender: systemAccount._id,
        type: "default",
        message: `Welcome ${user.userName}! to AYS, Start exploring and connecting with others`,
        read: false,
      });
    }

    return res.status(200).json({ message: "Birthday saved successfully." });
  } catch (err) {
    console.error("Error during adding birthday:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const checkAuthStatus = async (req, res) => {
  return res.status(200).json({ message: "Authentication checked" });
};

const logoutController = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  signUpController,
  verifyController,
  loginController,
  otpSendController,
  otpConfirmController,
  resetPasswordController,
  addBirthdayController,
  checkAuthStatus,
  logoutController,
};