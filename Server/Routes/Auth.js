const router = require("express").Router();
const isLogout = require("../Middlewares/IsLougout");
const passport = require('passport');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { loginLimiter, signupLimiter, otpLimiter } = require("../Middlewares/RateLimiter");
const { getCountryFromRequest } = require("../Utils/getCountryFromRequest");

const {
  signUpController,
  verifyController,
  loginController,
  otpSendController,
  otpConfirmController,
  resetPasswordController,
  addBirthdayController,
  checkAuthStatus,
  logoutController
} = require("../Controllers/AuthControllers");

// Auth flow
router.post("/signup", signupLimiter, signUpController);
router.get("/verify/:token", verifyController);
router.post("/login", loginLimiter, loginController);
router.post("/logout", logoutController);

// Password Reset flow
router.post("/send-otp", otpLimiter, otpSendController);
router.post("/confirm-otp", otpLimiter, otpConfirmController);
router.post("/reset-password", resetPasswordController);

// Additional onboarding
router.post("/add-birthday", addBirthdayController);

// Auth Check
router.get("/auth-check", isLogout, checkAuthStatus);

// Google OAuth Routes

// Google OAuth - Start login
router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// Google OAuth - Callback after login
router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Set country if not already set (server-side lookup from actual request IP)
      if (!user.country || user.country === "Unknown") {
        try {
          const detectedCountry = getCountryFromRequest(req);
          if (detectedCountry) {
            user.country = detectedCountry;
            await user.save();
          }
        } catch (geoErr) {
          console.warn("OAuth geolocation failed:", geoErr.message);
        }
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, tokenVersion: user.tokenVersion || 0 },
        process.env.JWT_SECRET,
        { expiresIn: '2d' }
      );

      // Cookie configuration based on environment
      const cookieOptions = {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        secure: process.env.NODE_ENV === "production",
      };

      res.cookie('token', token, cookieOptions);

      // Redirect to frontend home
      res.redirect(`${process.env.CLIENT_URL}/`);
    } catch (error) {
      console.error("Error during Google OAuth callback:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
  }
);

module.exports = router;