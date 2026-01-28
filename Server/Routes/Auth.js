const router = require("express").Router();
const isLogout = require("../Middlewares/IsLougout");
const passport = require('passport');
const jwt = require('jsonwebtoken');

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
router.post("/signup", signUpController);
router.get("/verify/:token", verifyController);
router.post("/login", loginController);
router.post("/logout", logoutController);

// Password Reset flow
router.post("/send-otp", otpSendController);
router.post("/confirm-otp", otpConfirmController);
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

      const token = jwt.sign(
        { id: user._id, email: user.email },
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