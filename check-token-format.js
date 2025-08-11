const jwt = require('jsonwebtoken');

// Generate a sample token similar to what the server generates
const JWT_SECRET = 'your-secret-key-change-in-production';

const sampleToken = jwt.sign(
  { 
    userId: 'test', 
    tokenId: '12345678-1234-1234-1234-123456789012',
    expiresAt: Date.now() + 3600000
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Sample token info:');
console.log('Length:', sampleToken.length);
console.log('Token:', sampleToken);
console.log('Parts:', sampleToken.split('.').length);

// The token you're seeing (1356 chars) is way too long
console.log('\nYour token length: 1356 characters');
console.log('Expected length: ~200-300 characters');
console.log('\nThis suggests the token might be:');
console.log('1. Double-encoded or corrupted');
console.log('2. Not a real JWT token');
console.log('3. Contains extra data somehow');