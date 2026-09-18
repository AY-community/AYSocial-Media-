# YAS Authentication & Authorization Deep Audit Report

## VERY IMPORTANT NOTE

As requested, this is a **read-only audit**. No code has been modified, refactored, or patched. The findings below are strictly theoretical evaluations of the current behavior present in the `Server` codebase.

---

## A. Current Architecture

Based on the actual code, here is how the system currently handles authentication and security:

### Registration
1. The user provides `userName`, `email`, and `password`.
2. The server performs regex checks on the username and password complexity.
3. It checks for collisions. Weakly-verified state exists: if an existing account isn't verified yet, a new signup with the same details deletes the old pending user.
4. The IP address is derived from `x-forwarded-for` to get geolocation.
5. The password is hashed using `bcrypt` (10 rounds).
6. A cryptographic `verificationToken` is generated and valid for 5 minutes. An email is sent.

### Verification & Onboarding
1. Hitting the `/verify/:token` endpoint marks `verification = true` in the DB and generates a new `profileToken`.
2. The `profileToken` is passed to the frontend to allow them to add their birthday via `/add-birthday`.
3. Once the birthday is added, the system sends an automated "Welcome" notification.

### Login
1. Looks up the user by email, and verifies `bcrypt.compare` against the password.
2. Checks that both `verification` and `birthday` conditions are met.
3. Generates a stateless JWT containing **only** `{ id: userFound._id, email: userFound.email }` signed with `JWT_SECRET`.
4. Issues a cookie: `httpOnly: true`, `maxAge: 2 days`, `sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"`, `secure`.

### Authentication after Login
1. Two middlewares exist: `IsLogin.js` and `DecodeToken.js`.
2. Reuses `jwt.verify` to read the cookie.
3. If valid, attaches `req.user` to the request object. 

### Refresh
- **Refresh tokens do not exist**. 
- The system only issues a 2-day `access_token` stored in the cookie. The user must re-authenticate entirely when the cookie expires via `/login`.

### Logout
- Triggers `/logout` which simply tells the browser to clear the `token` cookie.
- Server-side, **nothing happens**. The DB does not record the logout and the JWT isn't blacklisted.

### Password Reset
1. Generates a 6-digit numeric OTP.
2. Hashes the OTP via `bcrypt` and saves `otp` and `otpExpires` (5 minutes) to the user document. (Sends OTP to email).
3. Hitting `/confirm-otp` checks the parsed OTP with `bcrypt.compare`.
4. If correct, issues a hexadecimal `resetToken` valid for 10 minutes. 
5. Hitting `/reset-password` updates the password.

### Password Change (While Logged In)
- Verifies the old password, hashes the new one, and saves it. 
- Existing 2-day JWT tokens remain completely valid.

---

## B. What Is Already Good

1. **Strong Password Policies**: The regex enforcement (`isStrongPassword`) requires complex combinations out of the gate.
2. **Proper Cookie Attributes**: `HttpOnly` and `Secure` flags are correctly configured for production environments, preventing basic XSS cookie theft.
3. **Hashing Sensitive Data**: Both passwords and numeric OTPs are correctly hashed using `bcrypt` rather than stored in plaintext.
4. **Environment Awareness**: Using conditional SameSite/Secure values depending on the `NODE_ENV` shows an understanding of differences between local development and production constraints.

---

## C. Critical Issues







---

## D. High-Priority Issues





### 3. Account Enumeration via OTP Recovery
**Problem**: The `/send-otp` route validates email existence gracefully in the response error.
**Evidence**: `if (!userFound...) return res.status(400).json({ error: "Email is incorrect or doesn't exist..." })`
**Impact**: Attackers can query this endpoint with a list of leaked emails to silently identify exactly who is a member of YAS without alerting the users.
**Recommended Solution**: Provide a generic time-constant success response for OTP requests regardless of whether the email exists ("If that email exists, an OTP has been sent").

---

## E. Medium / Low Priority Issues

### 1. Global Socket Timeout (Slowloris Risk)
**Problem**: In `server.js`, `req.setTimeout(600000)` enforces a staggering 10-minute timeout for typical REST routes.
**Impact**: Holding zombie connections open for 10 minutes makes the application highly susceptible to Slowloris DoS attacks resulting in total resource starvation.
**Recommended Solution**: Remove node-wide excessive timeouts unless specifically scoped to a route handling huge file stream uploads.

### 2. Race Condition on Registration
**Problem**: If an account holds `verification = false` pending email confirmation, an attacker can register with the same email/username and force previous records to delete completely via `await User.deleteOne(...)`.
**Impact**: Frustrating experience for users, and potential disruption vectors for attackers.
**Recommended Solution**: Scope unique constraints strictly.

---

## F. Missing Features

| Feature | Classification | Reason |
|---------|----------------|--------|
| **Refresh-Token Rotation** | **Essential** | The current 2-day JWT lifespan is risky. Short access tokens (15m) paired with rotating refresh tokens are the industry standard bare minimum. |
| **Rate Limiter / Anti-Brute Force** | ✅ **Resolved** | Redis-backed sliding window via Upstash. 5 attempts/15m on auth, 3/hr on OTP. |
| **Session / Device Management** | **Recommended** | Production apps need to show users "Where you're logged in" to kill suspicious laptop/phone sessions individually. |
| **Email Change Verification** | **Recommended** | Changing an email address must require verification of both the old and the new email address. |
| **Audit Logs** | **Optional** | Identifying who approved a moderator requires historical logs over time. |
| **MFA / 2FA Authenticator App**| **Optional** | A great feature, but mostly required for administrative or significantly high-value accounts right now. |

---

## G. Attack Scenarios



### Scenario 2: Persistent Session Hijacking (Stolen Token)
**Attack**: An attacker performs XSS or compromises a browser session, lifting the 2-day JWT.
**Why it works**: Since tokens are validated purely via math (`jwt.verify()`) without checking a database or a blacklist, the server remains unaware of compromise.
**Impact**: Even if the victim realizes they were hacked, panics, hits "Log out," and changes their password—the attacker's lifted token operates flawlessly in parallel for over 40+ hours. The victim is helpless.

---

## H. Architecture Concerns

1. **Authentication Silos**: The application is doing what's called "Client-Driven Security." The backend is currently designed as a database wrapper expecting the Frontend to be honest about who is calling it (`userId`, `loggedInUserId`). You need "Server-Driven Security", enforcing immutable contextual truth (via checking `req.user`).
2. **Missing Controller Middleware Integration**: Critical files like `Routes/User.js` have endpoints where they clearly forgot to prepend `DecodeToken`. This implies inconsistent manual mapping instead of automated middleware chains based on prefixes (e.g. `app.use('/api/protected', DecodeToken)`).

---

## I. Testing Gaps

There appear to be no comprehensive automated unit/integration tests assessing IDOR vulnerabilities.
* **Missing Tests**: 
  - Submitting operations on `/posts/:postId/` belonging to a different user.
  - Hitting `/admin/promote-user` with an unauthenticated token.
  - Using a token *after* changing the user's password.
  - OTP Brute force rate limit assertions.

---

## J. Recommended Improvements Summary





---

# Final Summary

### Top 5 Security Problems


### Top 5 Missing Features
2. Express-Rate-Limit for Brute Force defenses.
3. Refresh Tokens & Short-Lived Access Tokens (e.g., 15m JWT lifespan).
4. Synchronizer CSRF tokens or strictly coupled strict-origin verifications for Cross-Site defense configurations.
5. Password-change session invalidation logic (like JWT Token Versions).

### Production Readiness Checklist
✅ Rate Limiting (Resolved — Upstash Redis sliding window)
❌ Authorization Ownership Checks (Missing)
⚠️ Cookie Storage (Needs tuning against CSRF implications)
✅ Password Cryptography / Hashing (Handled correctly via 10-rd Bcrypt)
✅ Email Delivery Validations (Handled correctly)

> **Based strictly on the code I provided, what would I need to address before considering the YAS authentication system production-ready?**

To be blunt, the YAS application is currently **not safe for production deployment.** 
You must completely transition away from heavily trusting parameters (Client-Driven Security) and rewrite API signatures to infer identity strictly through `req.user.id` (Server-Driven Security). You also must attach your `DecodeToken` to all routes except public reads, implement `express-rate-limit`, and add an `isAdmin` middleware layer to your moderation tools instantly. Fixing the IDORs alone is the #1 mandatory step before a single real user registers.
