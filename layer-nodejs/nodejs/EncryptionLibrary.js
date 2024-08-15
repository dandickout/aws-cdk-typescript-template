const CryptoJS = require("crypto-js");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

class EncryptionLibrary {
  constructor(secretName, region) {
    this.secretName = secretName;
    this.client = new SecretsManagerClient({ region });
  }

  async encryptWithIV(data, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return encrypted.toString();
  }

  async decryptWithIV(encryptedData, key, iv) {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  async retrieveEncryptionKey() {
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: this.secretName,
          VersionStage: "AWSCURRENT",
        })
      );
      return response.SecretString;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = EncryptionLibrary;