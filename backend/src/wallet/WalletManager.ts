/**
 * Wallet Layer - Key Management & Signing
 * 
 * CRITICAL: This is the ONLY layer that handles private keys
 * Keys are encrypted at rest and decrypted only during signing
 */

import crypto from "crypto";
import { promisify } from "util";
import { Keypair, TransactionBuilder, Transaction } from "stellar-sdk";
import { EncryptedKeypair } from "../types/index.js";
import { logger } from "../utils/logger.js";

// Type-safe promisified scrypt with correct overload
const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

/**
 * Handles key encryption/decryption with AES-256-GCM + scrypt
 */
class KeyEncryption {
  private password: string;

  constructor(password: string) {
    if (!password || password.length < 8) {
      throw new Error("Wallet password must be at least 8 characters");
    }
    this.password = password;
  }

  /**
   * Encrypt a keypair using AES-256-GCM
   */
  async encrypt(keypair: Keypair): Promise<EncryptedKeypair> {
    // 1. Generate random salt
    const salt = crypto.randomBytes(32);

    // 2. Derive key from password using scrypt
    const derivedKey = (await scrypt(this.password, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
    })) as Buffer;

    // 3. Prepare plaintext (keypair as JSON)
    const keypairJson = JSON.stringify({
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(), // ⚠️ SECRET in plaintext briefly
    });

    // 4. Encrypt with AES-256-GCM
    const iv = crypto.randomBytes(12); // GCM requires 12-byte IV
    const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(keypairJson, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // 5. Clear plaintext and derived key from memory
    // Note: This is a best-effort approach; GC behavior is not guaranteed
    (keypairJson as any) = null;
    (derivedKey as any) = null;

    // 6. Return encrypted package
    return {
      publicKey: keypair.publicKey(),
      algorithm: "aes-256-gcm",
      derivationFunction: "scrypt",
      salt: salt.toString("hex"),
      scryptParams: {
        N: 16384,
        r: 8,
        p: 1,
      },
      iv: iv.toString("hex"),
      ciphertext: encrypted.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt an encrypted keypair
   */
  async decrypt(encrypted: EncryptedKeypair): Promise<Keypair> {
    try {
      // 1. Derive key from password (same params as encryption)
      const salt = Buffer.from(encrypted.salt, "hex");
      const derivedKey = (await scrypt(this.password, salt, 32, {
        N: encrypted.scryptParams.N,
        r: encrypted.scryptParams.r,
        p: encrypted.scryptParams.p,
      })) as Buffer;

      // 2. Prepare ciphertext
      const iv = Buffer.from(encrypted.iv, "hex");
      const ciphertext = Buffer.from(encrypted.ciphertext, "hex");
      const authTag = Buffer.from(encrypted.authTag, "hex");

      // 3. Decrypt with AES-256-GCM
      const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      // 4. Parse keypair JSON
      const keypairData = JSON.parse(decrypted.toString("utf8")) as {
        publicKey: string;
        secretKey: string;
      };

      // ⚠️ CRITICAL SECTION: Key is in memory
      const keypair = Keypair.fromSecret(keypairData.secretKey);

      // 5. Immediately clear sensitive data
      keypairData.secretKey = "";
      (keypairData as any) = null;
      (derivedKey as any) = null;

      return keypair;
    } catch (err) {
      logger.error("Failed to decrypt keypair", { error: (err as Error).message });
      throw new Error("Failed to decrypt keypair - invalid password or corrupted data");
    }
  }
}

/**
 * Wallet Manager - handles all key operations
 */
export class WalletManager {
  private encryptedKeys: Map<string, EncryptedKeypair> = new Map();
  private encryption: KeyEncryption;

  constructor(encryptionPassword: string) {
    this.encryption = new KeyEncryption(encryptionPassword);
  }

  /**
   * Create a new wallet for an agent
   */
  async createWallet(agentId: string): Promise<{ publicKey: string }> {
    // Check if already exists
    if (this.encryptedKeys.has(agentId)) {
      throw new Error(`Wallet already exists for agent ${agentId}`);
    }

    // Generate new keypair
    const keypair = Keypair.random();

    // Encrypt it
    const encrypted = await this.encryption.encrypt(keypair);

    // Store encrypted version
    this.encryptedKeys.set(agentId, encrypted);

    logger.info("Wallet created", { agentId, publicKey: keypair.publicKey() });

    return { publicKey: keypair.publicKey() };
  }

  /**
   * Get public key (safe to expose)
   */
  getPublicKey(agentId: string): string {
    const encrypted = this.encryptedKeys.get(agentId);
    if (!encrypted) {
      throw new Error(`Wallet not found for agent ${agentId}`);
    }
    return encrypted.publicKey;
  }

  /**
   * Sign a transaction envelope
   * This is the ONLY method that decrypts the private key
   */
  async signTransaction(
    agentId: string,
    transactionEnvelope: string,
    networkPassphrase: string
  ): Promise<string> {
    const encrypted = this.encryptedKeys.get(agentId);
    if (!encrypted) {
      throw new Error(`Wallet not found for agent ${agentId}`);
    }

    let keypair: Keypair | null = null;
    try {
      // ⚠️ CRITICAL: Decrypt key only for signing
      keypair = await this.encryption.decrypt(encrypted);

      // Parse transaction from XDR
      const tx = TransactionBuilder.fromXDR(transactionEnvelope, networkPassphrase) as Transaction;

      // Sign the transaction
      tx.sign(keypair);

      // Get signed envelope
      const signedEnvelope = tx.toXDR();

      logger.debug("Transaction signed", { agentId });

      return signedEnvelope;
    } finally {
      // ⚠️ CRITICAL: Clear keypair from memory
      keypair = null;
    }
  }

  /**
   * Internal: Get encrypted keypair (for persistence)
   * Used when saving wallet to storage
   */
  getEncryptedKeypair(agentId: string): EncryptedKeypair {
    const encrypted = this.encryptedKeys.get(agentId);
    if (!encrypted) {
      throw new Error(`Wallet not found for agent ${agentId}`);
    }
    return encrypted;
  }

  /**
   * Internal: Load encrypted keypair from storage
   */
  loadEncryptedKeypair(agentId: string, encrypted: EncryptedKeypair): void {
    this.encryptedKeys.set(agentId, encrypted);
  }

  /**
   * Check if wallet exists
   */
  hasWallet(agentId: string): boolean {
    return this.encryptedKeys.has(agentId);
  }

  /**
   * Get all wallet public keys (for listing)
   */
  getAllWallets(): Array<{ agentId: string; publicKey: string }> {
    const wallets: Array<{ agentId: string; publicKey: string }> = [];
    for (const [agentId, encrypted] of this.encryptedKeys.entries()) {
      wallets.push({
        agentId,
        publicKey: encrypted.publicKey,
      });
    }
    return wallets;
  }
}
