const { Ratelimit } = require("@upstash/ratelimit");
const redis = require("../Config/Redis");

// 5 requests per 15 minutes per IP
const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "yas:ratelimit:auth",
});

// 3 requests per hour for OTP sending
const otpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "yas:ratelimit:otp",
});

const createRateLimitMiddleware = (limiter, label) => {
  return async (req, res, next) => {
    try {
      // req.ip is safe now because we set 'trust proxy' in server.js
      const ip = req.ip || "anonymous";
      const { success, remaining, reset } = await limiter.limit(ip);

      // Always send back rate limit headers so the frontend can react
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", new Date(reset).toISOString());

      if (!success) {
        const resetDate = new Date(reset);
        const minutesLeft = Math.ceil((resetDate - Date.now()) / 1000 / 60);

        return res.status(429).json({
          error: `Too many ${label} attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`,
          retryAfter: resetDate.toISOString(),
        });
      }

      next();
    } catch (err) {
      // If Redis is down, fail open (don't block users) but log the issue
      console.error("Rate limiter error:", err.message);
      next();
    }
  };
};

const loginLimiter = createRateLimitMiddleware(authRatelimit, "login");
const signupLimiter = createRateLimitMiddleware(authRatelimit, "signup");
const otpLimiter = createRateLimitMiddleware(otpRatelimit, "OTP");

module.exports = { loginLimiter, signupLimiter, otpLimiter };
