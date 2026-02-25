import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg'
  },

  // User Role & Platform Access
  userType: {
    type: String,
    enum: ['student', 'contributor', 'business', 'recruiter', 'admin', 'super_admin'],
    default: 'student'
  },
  platforms: {
    huseCircle: {
      type: Boolean,
      default: true
    },
    dofracto: {
      type: Boolean,
      default: false
    },
    quotify: {
      type: Boolean,
      default: true
    }
  },

  // Tier System (Bronze -> Business Owner)
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'contributor', 'business_owner'],
    default: 'bronze'
  },
  reputation: {
    type: Number,
    default: 0,
    min: 0
  },

  // HUSE Circle Specific
  huseCircle: {
    isStudent: {
      type: Boolean,
      default: true
    },
    college: {
      name: String,
      email: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    enrollmentYear: Number,
    graduationYear: Number,
    major: String,
    skills: [String],
    interests: [String],
    bio: String,
    portfolio: [{
      title: String,
      description: String,
      link: String,
      image: String,
      tags: [String],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    achievements: [{
      title: String,
      description: String,
      date: Date,
      icon: String
    }],
    projects: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    }]
  },

  // Dofracto Specific
  dofracto: {
    isContributor: {
      type: Boolean,
      default: false
    },
    isBusiness: {
      type: Boolean,
      default: false
    },
    graduatedAt: Date,
    graduationMethod: {
      type: String,
      enum: ['reputation', 'paid', null],
      default: null
    },
    contributorProfile: {
      title: String,
      description: String,
      hourlyRate: Number,
      availability: {
        type: String,
        enum: ['available', 'busy', 'unavailable'],
        default: 'available'
      },
      expertise: [String],
      experience: Number,
      portfolioUrl: String,
      githubUrl: String,
      linkedinUrl: String
    },
    businessProfile: {
      companyName: String,
      companySize: String,
      industry: String,
      website: String,
      logo: String,
      description: String,
      verified: {
        type: Boolean,
        default: false
      },
      kycCompleted: {
        type: Boolean,
        default: false
      },
      kycDocuments: [{
        type: String,
        url: String,
        uploadedAt: Date
      }]
    }
  },

  // Quotify Specific
  quotify: {
    isProvider: {
      type: Boolean,
      default: false
    },
    credits: {
      type: Number,
      default: 10
    },
    providerProfile: {
      services: [String],
      pricing: {
        hourly: Number,
        fixed: Number
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalReviews: {
        type: Number,
        default: 0
      },
      completedProjects: {
        type: Number,
        default: 0
      }
    }
  },

  // Subscription & Payment
  subscription: {
    active: {
      type: Boolean,
      default: false
    },
    plan: {
      type: String,
      enum: ['free', 'annual', 'monthly', null],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },

  // Analytics & Activity
  stats: {
    profileViews: {
      type: Number,
      default: 0
    },
    opportunitiesApplied: {
      type: Number,
      default: 0
    },
    opportunitiesPosted: {
      type: Number,
      default: 0
    },
    quotesSubmitted: {
      type: Number,
      default: 0
    },
    quotesReceived: {
      type: Number,
      default: 0
    }
  },

  // Notifications & Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },

  // Security
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ reputation: -1 });
userSchema.index({ tier: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'huseCircle.college.verified': 1 });

// Virtual for tier progression percentage
userSchema.virtual('tierProgress').get(function() {
  const tierRanges = {
    bronze: { min: 0, max: 999 },
    silver: { min: 1000, max: 4999 },
    gold: { min: 5000, max: 29999 },
    platinum: { min: 30000, max: 99999 },
    contributor: { min: 100000, max: 299999 },
    business_owner: { min: 300000, max: Infinity }
  };

  const range = tierRanges[this.tier];
  if (!range) return 0;
  
  if (range.max === Infinity) return 100;
  
  const progress = ((this.reputation - range.min) / (range.max - range.min)) * 100;
  return Math.min(Math.max(progress, 0), 100);
});

// Virtual for graduation eligibility
userSchema.virtual('canGraduate').get(function() {
  return this.reputation >= 100000 || this.subscription.active;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to update tier based on reputation
userSchema.methods.updateTier = function() {
  if (this.reputation >= 300000) {
    this.tier = 'business_owner';
  } else if (this.reputation >= 100000) {
    this.tier = 'contributor';
  } else if (this.reputation >= 30000) {
    this.tier = 'platinum';
  } else if (this.reputation >= 5000) {
    this.tier = 'gold';
  } else if (this.reputation >= 1000) {
    this.tier = 'silver';
  } else {
    this.tier = 'bronze';
  }
};

// Method to add reputation
userSchema.methods.addReputation = async function(amount, reason) {
  this.reputation += amount;
  this.updateTier();
  
  // Create reputation history entry
  await mongoose.model('ReputationHistory').create({
    user: this._id,
    amount,
    reason,
    balanceAfter: this.reputation
  });
  
  await this.save();
};

const User = mongoose.model('User', userSchema);

export default User;
