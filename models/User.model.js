import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't return password by default
    },
    
    // User Type
    role: {
      type: String,
      enum: ['student', 'builder', 'recruiter', 'contributor', 'business', 'admin'],
      default: 'student'
    },
    
    // Profile Info
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/avataaars/svg'
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
      type: String
    },
    
    // Tier System
    tier: {
      type: String,
      enum: ['free', 'bronze', 'silver', 'gold', 'platinum'],
      default: 'free'
    },
    
    // Reputation
    reputationScore: {
      type: Number,
      default: 0
    },
    
    // College/University (for students)
    college: {
      type: String
    },
    graduationYear: {
      type: Number
    },
    
    // Company (for recruiters/businesses)
    company: {
      type: String
    },
    position: {
      type: String
    },
    
    // Social Links
    socialLinks: {
      linkedin: String,
      github: String,
      twitter: String,
      portfolio: String
    },
    
    // Skills (for students/builders)
    skills: [{
      type: String
    }],
    
    // Account Status
    isVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    
    // Email Verification
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    
    // Last Login
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'mySecretKey123TriangularEcosystem456Random789',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Virtual for user's full profile URL
userSchema.virtual('profileUrl').get(function () {
  return `/api/v1/users/${this._id}`;
});

const User = mongoose.model('User', userSchema);

export default User;
