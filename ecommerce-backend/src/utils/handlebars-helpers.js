const handlebars = require('handlebars');

// Register helper for multiplication
handlebars.registerHelper('multiply', function(a, b) {
  return (parseFloat(a) * parseFloat(b)).toFixed(2);
});

// Register helper for currency formatting
handlebars.registerHelper('currency', function(amount) {
  return `₹${parseFloat(amount).toFixed(2)}`;
});

// Register helper for date formatting
handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('en-IN');
});

module.exports = handlebars;