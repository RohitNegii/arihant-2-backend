import crypto from "crypto";

/**
 * Encrypt a plain text query string using CCAvenue working key (AES-128-CBC)
 */
export const encrypt = (plainText: string, workingKey: string): string => {
  const md5 = crypto.createHash("md5").update(workingKey).digest();
  // CCAvenue expects a fixed 16-byte initialization vector (0 to 15)
  const iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const cipher = crypto.createCipheriv("aes-128-cbc", md5, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

/**
 * Decrypt an encrypted hex response string from CCAvenue using working key
 */
export const decrypt = (encText: string, workingKey: string): string => {
  const md5 = crypto.createHash("md5").update(workingKey).digest();
  const iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const decipher = crypto.createDecipheriv("aes-128-cbc", md5, iv);
  let decrypted = decipher.update(encText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
