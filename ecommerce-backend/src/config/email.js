const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Only create transporter if email credentials are provided
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Verify connection (non-blocking)
  transporter.verify((error, success) => {
    if (error) {
      logger.warn('Email configuration error (emails will not be sent):', error.message);
      logger.warn('To fix: Update EMAIL_USER and EMAIL_PASSWORD in .env file');
    } else {
      logger.info('Email server is ready');
    }
  });
} else {
  logger.warn('Email configuration missing. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env to enable email functionality.');
}

module.exports = transporter;