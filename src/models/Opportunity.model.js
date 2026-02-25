import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Development',
      'Design',
      'Marketing',
      'Content',
      'Research',
      'Data Science',
      'Business',
      'Other'
    ]
  },
  tags: [String],

  // Platform & Type
  platform: {
    type: String,
    enum: ['huse_circle', 'dofracto', 'both'],
    required: true
  },
  opportunityType: {
    type: String,
    enum: ['project', 'internship', 'job', 'freelance', 'competition', 'learning'],
    required: true
  },

  // Posted By
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: String,
  companyLogo: String,

  // Requirements & Skills
  requiredSkills: [String],
  preferredSkills: [String],
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  minTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'contributor', 'business_owner'],
    default: 'bronze'
  },

  // Compensation
  compensation: {
    type: {
      type: String,
      enum: ['paid', 'unpaid', 'reputation', 'both'],
      default: 'reputation'
    },
    amount: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    reputationPoints: {
      type: Number,
      default: 0
    }
  },

  // Duration & Timeline
  duration: {
    type: String, // e.g., "3 months", "Ongoing"
    required: true
  },
  startDate: Date,
  deadline: Date,
  isUrgent: {
    type: Boolean,
    default: false
  },

  // Location
  location: {
    type: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid'],
      default: 'remote'
    },
    city: String,
    country: String
  },

  // Application Settings
  applicationSettings: {
    maxApplicants: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    requireResume: {
      type: Boolean,
      default: false
    },
    requirePortfolio: {
      type: Boolean,
      default: false
    },
    customQuestions: [{
      question: String,
      required: Boolean
    }]
  },

  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'filled', 'cancelled'],
    default: 'active'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'tier_restricted'],
    default: 'public'
  },

  // Stats
  stats: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shortlisted: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    }
  },

  // Featured & Premium
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,

  // Applicants tracking
  applicants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],

  // Additional Info
  contactEmail: String,
  contactPhone: String,
  applyUrl: String, // External application URL

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
opportunitySchema.index({ platform: 1, status: 1 });
opportunitySchema.index({ postedBy: 1 });
opportunitySchema.index({ category: 1 });
opportunitySchema.index({ requiredSkills: 1 });
opportunitySchema.index({ createdAt: -1 });
opportunitySchema.index({ 'compensation.type': 1 });

// Virtual for checking if opportunity is expired
opportunitySchema.virtual('isExpired').get(function() {
  return this.deadline && new Date() > this.deadline;
});

// Virtual for checking if applications are full
opportunitySchema.virtual('isFull').get(function() {
  return this.applicationSettings.maxApplicants > 0 && 
         this.stats.applications >= this.applicationSettings.maxApplicants;
});

// Middleware to update status if expired
opportunitySchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'active') {
    this.status = 'closed';
  }
  next();
});

// Method to increment view count
opportunitySchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Method to check if user can apply
opportunitySchema.methods.canApply = function(user) {
  // Check if opportunity is active
  if (this.status !== 'active') return false;
  
  // Check if expired
  if (this.isExpired) return false;
  
  // Check if full
  if (this.isFull) return false;
  
  // Check tier requirement
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'contributor', 'business_owner'];
  const userTierIndex = tierOrder.indexOf(user.tier);
  const minTierIndex = tierOrder.indexOf(this.minTier);
  
  if (userTierIndex < minTierIndex) return false;
  
  // Check platform access
  if (this.platform === 'huse_circle' && !user.platforms.huseCircle) return false;
  if (this.platform === 'dofracto' && !user.platforms.dofracto) return false;
  
  return true;
};

const Opportunity = mongoose.model('Opportunity', opportunitySchema);

export default Opportunity;
