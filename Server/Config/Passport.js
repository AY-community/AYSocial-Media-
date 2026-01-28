const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../Models/User');
const crypto = require('crypto'); // Add this import

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google Profile:', profile);
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log('User found by googleId:', user);
          return done(null, user);
        }

        // Check if email already exists
        const existingEmailUser = await User.findOne({ 
          email: profile.emails[0].value 
        });

        if (existingEmailUser) {
          console.log('User found by email, linking account:', existingEmailUser);
          // Link Google account to existing user
          existingEmailUser.googleId = profile.id;
          existingEmailUser.verification = true;
          if (!existingEmailUser.profilePic && profile.photos?.[0]?.value) {
            existingEmailUser.profilePic = profile.photos[0].value;
          }
          await existingEmailUser.save();
          return done(null, existingEmailUser);
        }

        // Create new user with profileToken
        const newUserToCreate = {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          userName: `${profile.emails[0].value.split('@')[0]}_${Date.now()}`,
          profilePic: null,
          verification: true,
          profileToken: crypto.randomBytes(32).toString("hex"), // ✅ This generates the token
        };
        console.log('Creating new user with:', newUserToCreate);
        const newUser = await User.create(newUserToCreate);
        console.log('New user created:', newUser);

        done(null, newUser);
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;