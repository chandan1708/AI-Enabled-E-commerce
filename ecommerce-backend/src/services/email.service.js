const transporter = require('../config/email');
const fs = require('fs');
const path = require('path');
const handlebars = require('../utils/handlebars-helpers');

/**
 * Send order confirmation email
 * @param {Object} orderData - Order information
 * @param {string} orderData.userName - Customer name
 * @param {string} orderData.userEmail - Customer email
 * @param {string} orderData.orderNumber - Order number
 * @param {string} orderData.orderDate - Order date
 * @param {Array} orderData.items - Order items
 * @param {number} orderData.totalAmount - Total order amount
 * @param {Object} orderData.shippingAddress - Shipping address details
 */
async function sendOrderConfirmation(orderData) {
    try {
        // Load template
        const templatePath = path.join(__dirname, '../templates/emails/order-confirmation.html');
        const templateSource = fs.readFileSync(templatePath, 'utf8');

        // Compile template
        const template = handlebars.compile(templateSource);
        const html = template(orderData);

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: orderData.userEmail,
            subject: `Order Confirmation - ${orderData.orderNumber}`,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Order confirmation email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw error;
    }
}

module.exports = {
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendOrderCancellation,
    sendWelcomeEmail,
    sendPaymentSuccess
};

/**
 * Send order status update email
 * @param {Object} data - Status update information
 */
async function sendOrderStatusUpdate(data) {
    return await sendEmail('order-status-update.html', data, `Order Status Update - ${data.orderNumber}`);
}

/**
 * Send order cancellation email
 * @param {Object} data - Cancellation information
 */
async function sendOrderCancellation(data) {
    return await sendEmail('order-cancellation.html', data, `Order Cancelled - ${data.orderNumber}`);
}

/**
 * Send welcome email
 * @param {Object} data - User information
 */
async function sendWelcomeEmail(data) {
    return await sendEmail('welcome.html', data, 'Welcome to Our Store!');
}

/**
 * Send payment success email
 * @param {Object} data - Payment information
 */
async function sendPaymentSuccess(data) {
    return await sendEmail('payment-success.html', data, `Payment Successful - ${data.orderNumber}`);
}

/**
 * Generic email sending function
 * @param {string} templateName - Template file name
 * @param {Object} data - Template data
 * @param {string} subject - Email subject
 */
async function sendEmail(templateName, data, subject) {
    try {
        const templatePath = path.join(__dirname, '../templates/emails', templateName);
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        const html = template(data);

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: data.userEmail,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent (${templateName}):`, info.messageId);
        return info;
    } catch (error) {
        console.error(`Error sending email (${templateName}):`, error);
        throw error;
    }
}
