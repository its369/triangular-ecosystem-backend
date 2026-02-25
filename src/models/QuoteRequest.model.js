import mongoose from 'mongoose';

const quoteRequestSchema = new mongoose.Schema({
  // Requester Info
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Request Details
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Web Development',
      'Mobile Development',
      'Design',
      'Marketing',
      'Content Writing',
      'Video Production',
      'Consulting',
      'Other'
    ]
  },
  
  // Requirements
  requirements: {
    skills: [String],
    experience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    minTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'contributor', 'business_owner'],
      default: 'bronze'
    }
  },
  
  // Budget & Timeline
  budget: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'INR'
    },
    flexible: {
      type: Boolean,
      default: true
    }
  },
  timeline: {
    type: String,
    required: true
  },
  deadline: Date,
  
  // Attachments
  attachments: [{
    url: String,
    filename: String,
    type: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['open', 'in_review', 'awarded', 'completed', 'cancelled'],
    default: 'open'
  },
  
  // Quotes received
  quotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  }],
  
  // Selected quote
  selectedQuote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  
  // Stats
  stats: {
    views: {
      type: Number,
      default: 0
    },
    quotesReceived: {
      type: Number,
      default: 0
    }
  },
  
  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'private', 'invited'],
    default: 'public'
  },
  invitedProviders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
  
}, {
  timestamps: true
});

// Indexes
quoteRequestSchema.index({ requester: 1, status: 1 });
quoteRequestSchema.index({ category: 1, status: 1 });
quoteRequestSchema.index({ createdAt: -1 });

// Virtual to check if expired
quoteRequestSchema.virtual('isExpired').get(function() {
  return this.deadline && new Date() > this.deadline;
});

const QuoteRequest = mongoose.model('QuoteRequest', quoteRequestSchema);

export default QuoteRequest;
