// file: encryption-utils.js

/**
 * Encryption Utilities for Dart-compatible AES-256-CBC encryption
 * Matches the implementation in Encryptor.dart
 */
class EncryptionUtils {

     /**
      * Decrypt data that was encrypted with the Dart Encryptor class
      * @param {string|Object} encryptedData - JSON string or parsed object
      * @param {string} password - The password used for encryption
      * @returns {Promise<string>} - Decrypted plain text
      */
     static async decryptFromDart(encryptedData, password) {
          try {
               // Parse if string
               const payload = typeof encryptedData === 'string'
                    ? JSON.parse(encryptedData)
                    : encryptedData;

               // Validate payload
               if (!payload.salt || !payload.iv || !payload.data) {
                    throw new Error('Invalid payload structure. Missing salt, iv, or data.');
               }

               if (payload.v !== 1) {
                    throw new Error(`Unsupported version: ${payload.v}`);
               }

               if (payload.algo !== 'AES-256-CBC') {
                    throw new Error(`Unsupported algorithm: ${payload.algo}. Expected AES-256-CBC`);
               }

               if (payload.padding !== 'PKCS7') {
                    throw new Error(`Unsupported padding: ${payload.padding}. Expected PKCS7`);
               }

               // Decode base64 strings
               const salt = this.base64ToUint8Array(payload.salt);
               const iv = this.base64ToUint8Array(payload.iv);
               const ciphertext = this.base64ToUint8Array(payload.data);

               // Derive key using the same method as Dart
               const key = await this.deriveKey(password, salt);

               // Decrypt using AES-256-CBC
               const decrypted = await this.decryptAESCBC(key, iv, ciphertext);

               return decrypted;
          } catch (error) {
               console.error('Decryption error:', error);
               throw new Error(`Decryption failed: ${error.message}`);
          }
     }

     /**
      * Encrypt data using the same method as Dart Encryptor
      * @param {string} plaintext - Text to encrypt
      * @param {string} password - Password for encryption
      * @returns {Promise<Object>} - Encrypted payload object
      */
     static async encryptForDart(plaintext, password) {
          try {
               // Generate random salt (16 bytes)
               const salt = this.generateRandomBytes(16);

               // Generate random IV (16 bytes)
               const iv = this.generateRandomBytes(16);

               // Derive key
               const key = await this.deriveKey(password, salt);

               // Encrypt
               const ciphertext = await this.encryptAESCBC(plaintext, key, iv);

               // Create payload matching Dart format
               const payload = {
                    'v': 1,
                    'salt': this.uint8ArrayToBase64(salt),
                    'iv': this.uint8ArrayToBase64(iv),
                    'data': this.uint8ArrayToBase64(ciphertext),
                    'algo': 'AES-256-CBC',
                    'padding': 'PKCS7'
               };

               return payload;
          } catch (error) {
               console.error('Encryption error:', error);
               throw new Error(`Encryption failed: ${error.message}`);
          }
     }

     /**
      * Derive AES-256 key from password and salt
      * Matches _deriveSimpleKey in Dart
      */
     static async deriveKey(password, salt) {
          // Convert password to UTF-8 bytes
          const passwordBytes = new TextEncoder().encode(password);

          // Combine password and salt
          const combined = new Uint8Array(passwordBytes.length + salt.length);
          combined.set(passwordBytes);
          combined.set(salt, passwordBytes.length);

          // Hash with SHA-256 for 10000 iterations (key stretching)
          let hashed = combined;
          for (let i = 0; i < 10000; i++) {
               hashed = await this.sha256(hashed);
          }

          // Take first 32 bytes for AES-256
          const keyBytes = hashed.slice(0, 32);

          // Import key for Web Crypto API
          const key = await crypto.subtle.importKey(
               'raw',
               keyBytes,
               { name: 'AES-CBC' },
               false,
               ['encrypt', 'decrypt']
          );

          return key;
     }

     /**
      * AES-256-CBC decryption
      */
     static async decryptAESCBC(key, iv, ciphertext) {
          try {
               // Decrypt using Web Crypto API
               const decrypted = await crypto.subtle.decrypt(
                    {
                         name: 'AES-CBC',
                         iv: iv
                    },
                    key,
                    ciphertext
               );

               // Remove PKCS7 padding
               const unpadded = this.removePKCS7Padding(new Uint8Array(decrypted));

               // Convert to string
               return new TextDecoder().decode(unpadded);
          } catch (error) {
               // Try without padding removal in case it's already unpadded
               try {
                    const decrypted = await crypto.subtle.decrypt(
                         {
                              name: 'AES-CBC',
                              iv: iv
                         },
                         key,
                         ciphertext
                    );

                    return new TextDecoder().decode(decrypted);
               } catch (retryError) {
                    throw new Error(`Decryption failed: ${retryError.message}`);
               }
          }
     }

     /**
      * AES-256-CBC encryption
      */
     static async encryptAESCBC(plaintext, key, iv) {
          // Convert plaintext to bytes
          const plaintextBytes = new TextEncoder().encode(plaintext);

          // Add PKCS7 padding
          const padded = this.addPKCS7Padding(plaintextBytes, 16);

          // Encrypt using Web Crypto API
          const encrypted = await crypto.subtle.encrypt(
               {
                    name: 'AES-CBC',
                    iv: iv
               },
               key,
               padded
          );

          return new Uint8Array(encrypted);
     }

     /**
      * SHA-256 hash function
      */
     static async sha256(data) {
          const hash = await crypto.subtle.digest('SHA-256', data);
          return new Uint8Array(hash);
     }

     /**
      * Add PKCS7 padding
      */
     static addPKCS7Padding(data, blockSize) {
          const paddingLength = blockSize - (data.length % blockSize);
          const padded = new Uint8Array(data.length + paddingLength);
          padded.set(data);
          padded.fill(paddingLength, data.length);
          return padded;
     }

     /**
      * Remove PKCS7 padding
      */
     static removePKCS7Padding(data) {
          const paddingLength = data[data.length - 1];

          // Validate padding
          if (paddingLength > data.length) {
               throw new Error('Invalid PKCS7 padding');
          }

          // Check all padding bytes
          for (let i = data.length - paddingLength; i < data.length; i++) {
               if (data[i] !== paddingLength) {
                    throw new Error('Invalid PKCS7 padding');
               }
          }

          return data.slice(0, data.length - paddingLength);
     }

     /**
      * Generate random bytes
      */
     static generateRandomBytes(length) {
          const bytes = new Uint8Array(length);
          crypto.getRandomValues(bytes);
          return bytes;
     }

     /**
      * Convert base64 string to Uint8Array
      */
     static base64ToUint8Array(base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
               bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
     }

     /**
      * Convert Uint8Array to base64 string
      */
     static uint8ArrayToBase64(bytes) {
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
               binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
     }

     /**
      * Read and decrypt a file
      */
     static async decryptFile(filePath, password) {
          try {
               let encryptedData;

               // Browser environment
               if (typeof window !== 'undefined') {
                    const response = await fetch(filePath);
                    if (!response.ok) {
                         throw new Error(`Failed to fetch file: ${response.status}`);
                    }
                    encryptedData = await response.text();
               }
               // Node.js environment
               else if (typeof require !== 'undefined') {
                    const fs = require('fs');
                    encryptedData = fs.readFileSync(filePath, 'utf8');
               }
               else {
                    throw new Error('Unsupported environment');
               }

               return await this.decryptFromDart(encryptedData, password);
          } catch (error) {
               throw new Error(`File read error: ${error.message}`);
          }
     }

     /**
      * Save encrypted data to file (Node.js only)
      */
     static async saveEncryptedFile(filePath, plaintext, password) {
          if (typeof require === 'undefined') {
               throw new Error('saveEncryptedFile is only available in Node.js');
          }

          try {
               const payload = await this.encryptForDart(plaintext, password);
               const fs = require('fs');
               fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
               return true;
          } catch (error) {
               throw new Error(`File save error: ${error.message}`);
          }
     }

     /**
      * Verify Web Crypto API is available
      */
     static isSupported() {
          return !!(window.crypto && window.crypto.subtle);
     }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
     module.exports = EncryptionUtils;
}