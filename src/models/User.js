const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() { return !this.googleId; },
    minlength: 6,
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  mobile: {
    type: String,
    trim: true,
    default: ''
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: null
  },
  upiId: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(v);
      },
      message: 'Please provide a valid UPI ID'
    }
  },
  avatar: {
    type: String,
    default: function() {
      const userName = this.name || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
    }
  },
  profilePicture: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedAt: {
    type: Date
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

// Pre-save hook to keep old and new fields in sync
userSchema.pre('save', function() {
  // Sync avatar and profilePicture
  if (this.isModified('avatar') && !this.isModified('profilePicture')) {
    this.profilePicture = this.avatar;
  } else if (this.isModified('profilePicture') && !this.isModified('avatar')) {
    this.avatar = this.profilePicture;
  } else if (!this.avatar && this.profilePicture) {
    this.avatar = this.profilePicture;
  } else if (!this.profilePicture && this.avatar) {
    this.profilePicture = this.avatar;
  }

  // Sync mobile and mobileNumber
  if (this.isModified('mobile') && !this.isModified('mobileNumber')) {
    this.mobileNumber = this.mobile;
  } else if (this.isModified('mobileNumber') && !this.isModified('mobile')) {
    this.mobile = this.mobileNumber || '';
  }

  // Sync isBlocked and status
  if (this.isModified('isBlocked') && !this.isModified('status')) {
    this.status = this.isBlocked ? 'suspended' : 'active';
  } else if (this.isModified('status') && !this.isModified('isBlocked')) {
    this.isBlocked = this.status === 'suspended';
  }
});
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);
