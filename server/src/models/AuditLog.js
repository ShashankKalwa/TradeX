const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now, expires: '30d' }
});

// Enforce append-only rule
auditLogSchema.pre('updateOne', function(next) { next(new Error('Audit logs are immutable')); });
auditLogSchema.pre('updateMany', function(next) { next(new Error('Audit logs are immutable')); });
auditLogSchema.pre('findOneAndUpdate', function(next) { next(new Error('Audit logs are immutable')); });
auditLogSchema.pre('deleteOne', function(next) { next(new Error('Audit logs are immutable')); });
auditLogSchema.pre('deleteMany', function(next) { next(new Error('Audit logs are immutable')); });
auditLogSchema.pre('findOneAndDelete', function(next) { next(new Error('Audit logs are immutable')); });

module.exports = mongoose.model('AuditLog', auditLogSchema);
