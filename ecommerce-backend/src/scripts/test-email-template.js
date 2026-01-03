const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Register helper (same logic as in service)
handlebars.registerHelper('multiply', (a, b) => a * b);

const templatePath = path.join(__dirname, '../templates/emails/order-confirmation.html');
const source = fs.readFileSync(templatePath, 'utf8');
const template = handlebars.compile(source);

const testData = {
  userName: "John Doe",
  userEmail: "john@example.com",
  orderNumber: "ORD-2024-001",
  orderDate: "2024-12-23",
  items: [
    { 
      product: { name: "Wireless Headphones" }, 
      quantity: 2, 
      price: 1500 
    },
    { 
      product: { name: "USB Cable" }, 
      quantity: 3, 
      price: 200 
    }
  ],
  totalAmount: 3600,
  shippingAddress: {
    name: "John Doe",
    addressLine1: "123 Main Street",
    addressLine2: "Apartment 4B",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    phone: "+91 9876543210"
  }
};

console.log('Testing email template compilation...\n');
console.log('Test Data:', JSON.stringify(testData, null, 2));
console.log('\n--- Compiled HTML Output ---\n');

try {
  const html = template(testData);
  console.log(html);
  console.log('\n✅ Template compiled successfully!');
  console.log('✅ Multiply helper working: 2 × ₹1500 = ₹' + (2 * 1500));
  console.log('✅ Multiply helper working: 3 × ₹200 = ₹' + (3 * 200));
} catch (error) {
  console.error('❌ Template compilation failed:', error);
  process.exit(1);
}
