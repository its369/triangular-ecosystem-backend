import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  // Quote Request
  quoteRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuoteRequest',
    required: true
  },
  
  // Provider Info
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Quote Details
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Pricing
  pricing: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'daily'],
      default: 'fixed'
    }
  },
  
  // Timeline
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months']
    }
  },
  startDate: Date,
  deliveryDate: Date,
  
  // Deliverables
  deliverables: [{
    item: String,
    description: String
  }],
  
  // Additional Details
  terms: String,
  attachments: [{
    url: String,
    filename: String,
    type: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'viewed', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  // Match Score
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Response from requester
  requesterFeedback: String,
  
}, {
  timestamps: true
});

// Indexes
quoteSchema.index({ quoteRequest: 1, provider: 1 });
quoteSchema.index({ provider: 1, status: 1 });
quoteSchema.index({ quoteRequest: 1, matchScore: -1 });

const Quote = mongoose.model('Quote', quoteSchema);

export default Quote;
