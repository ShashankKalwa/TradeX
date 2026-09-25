const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);
const STATIC_IV = Buffer.alloc(16, 0);

function encrypt(text) {
  if (!text) return text;
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, STATIC_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text) {
  if (!text) return text;
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, STATIC_IV);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return text; // Return original if not encrypted
  }
}

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
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      set: encrypt,
      get: decrypt
    },
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

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: encrypt(email.toLowerCase().trim()) });
};

userSchema.methods.toJSON = function toJSON() {
  const { passwordHash, refreshTokens, verificationTokenHash, totpSecret, ...safe } = this.toObject({ getters: true });
  return safe;
};

module.exports = mongoose.model('User', userSchema);
