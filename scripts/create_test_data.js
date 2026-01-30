const fs = require('fs');
const path = require('path');
const EncryptionUtils = require('../js/encryption-utils.js');

// Configuration
const PUBLIC_KEY = 'student_test';
const PRIVATE_KEY = 'my_secret_password_123';

const TEST_DATA = {
     "student_name": "Alex Doe",
     "is_male": true, // or "true" string
     "rank": 5,
     "total_degree": 850,
     "accuracy": 92.5,
     "full_degree": 1000,
     "subjects": [
          { "name": "Mathematics", "full_degree": 100, "rank": 3, "degree": 95, "average_degree": 80 },
          { "name": "Physics", "full_degree": 100, "rank": 12, "degree": 88, "average_degree": 75 },
          { "name": "Chemistry", "full_degree": 100, "rank": 0, "degree": 78, "average_degree": 70 },
          { "name": "Biology", "full_degree": 100, "rank": 0, "degree": 92, "average_degree": 85 },
          { "name": "English", "full_degree": 100, "rank": 8, "degree": 85, "average_degree": 82 }
     ]
};

async function generate() {
     console.log('Generating test data...');

     try {
          // Encrypt data
          const jsonString = JSON.stringify(TEST_DATA);
          const payload = await EncryptionUtils.encryptForDart(jsonString, PRIVATE_KEY);

          // Ensure directory exists
          const analysisDir = path.join(__dirname, '../assets/analysis');
          if (!fs.existsSync(analysisDir)) {
               fs.mkdirSync(analysisDir, { recursive: true });
          }

          // Write to file (using PUBLIC_KEY as filename, no extension as per user hint "there's no .enc")
          const filePath = path.join(analysisDir, PUBLIC_KEY);
          fs.writeFileSync(filePath, JSON.stringify(payload)); // Payload is JSON object

          console.log(`Success! Data saved to: ${filePath}`);
          console.log('\n--- Usage ---');
          console.log(`Open index.html in your browser URL:`);
          console.log(`?public_key=${PUBLIC_KEY}&private_key=${PRIVATE_KEY}`);

     } catch (error) {
          console.error('Error generating data:', error);
     }
}

// Polyfill for Node.js Web Crypto if needed (Node 15+ has it global, older versions might need require)
if (!global.crypto) {
     try {
          const { webcrypto } = require('crypto');
          global.crypto = webcrypto;
     } catch (e) {
          console.warn('Web Crypto API might not be available in this Node version.');
     }
}

generate();
