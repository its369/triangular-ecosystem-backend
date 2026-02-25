import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send Email
export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const message = {
    from: `${process.env.EMAIL_FROM || 'Triangular Ecosystem'} <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(message);
};

// Calculate match score for Quotify
export const calculateMatchScore = (request, provider) => {
  let score = 0;
  
  // Skills match (40 points)
  const requiredSkills = request.requirements.skills || [];
  const providerSkills = provider.quotify.providerProfile.services || [];
  const matchingSkills = requiredSkills.filter(skill => 
    providerSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
  );
  score += (matchingSkills.length / Math.max(requiredSkills.length, 1)) * 40;
  
  // Tier match (20 points)
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'contributor', 'business_owner'];
  const providerTierIndex = tierOrder.indexOf(provider.tier);
  const minTierIndex = tierOrder.indexOf(request.requirements.minTier || 'bronze');
  if (providerTierIndex >= minTierIndex) {
    score += 20;
  }
  
  // Rating (20 points)
  score += (provider.quotify.providerProfile.rating / 5) * 20;
  
  // Completed projects (10 points)
  score += Math.min(provider.quotify.providerProfile.completedProjects / 10, 1) * 10;
  
  // Reputation (10 points)
  score += Math.min(provider.reputation / 100000, 1) * 10;
  
  return Math.round(score);
};

// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Pagination helper
export const paginate = (query, page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return query.skip(skip).limit(parseInt(limit));
};

// Response helper
export const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = {
    success,
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};
