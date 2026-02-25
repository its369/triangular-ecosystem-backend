import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Application Content
  coverLetter: {
    type: String,
    required: true
  },
  resume: {
    url: String,
    filename: String
  },
  portfolio: {
    url: String,
    description: String
  },
  
  // Custom Question Answers
  customAnswers: [{
    question: String,
    answer: String
  }],
  
  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  // Timeline
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  statusUpdatedAt: Date,
  
  // Feedback
  recruiterNotes: String,
  feedback: String,
  
  // Communication
  messages: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
  
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ opportunity: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ opportunity: 1, status: 1 });

// Middleware to update opportunity stats
applicationSchema.post('save', async function() {
  const Opportunity = mongoose.model('Opportunity');
  const opportunity = await Opportunity.findById(this.opportunity);
  
  if (opportunity) {
    opportunity.stats.applications = await this.constructor.countDocuments({ 
      opportunity: this.opportunity 
    });
    opportunity.stats.shortlisted = await this.constructor.countDocuments({ 
      opportunity: this.opportunity, 
      status: { $in: ['shortlisted', 'interview', 'accepted'] } 
    });
    opportunity.stats.hired = await this.constructor.countDocuments({ 
      opportunity: this.opportunity, 
      status: 'accepted' 
    });
    
    await opportunity.save();
  }
});

const Application = mongoose.model('Application', applicationSchema);

export default Application;
