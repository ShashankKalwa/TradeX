const mongoose = require('mongoose');

/**
 * Refresh tokens are stored as SHA-256 hashes with an issue date: a database
 * leak must not hand an attacker a usable session, and expiry is enforced by
 * comparing the stored date rather than trusting the client.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned by a query unless explicitly asked for.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },

    verificationTokenHash: { type: String, select: false },
    verificationExpiresAt: { type: Date, select: false },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    totpSecret: { type: String, select: false },
    // Admin moderation. A suspended account can still authenticate-free reads
    // are blocked at the middleware, not here.
    isSuspended: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function toJSON() {
  const { passwordHash, refreshTokens, verificationTokenHash, totpSecret, ...safe } = this.toObject();
  return safe;
};

module.exports = mongoose.model('User', userSchema);
