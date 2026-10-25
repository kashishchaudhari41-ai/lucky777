import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "@workspace/db";
import { requireAuth, signUserToken } from "../middlewares/auth.js";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { fullName, phone, email, password, referralCode: refCode } = req.body;
  if (!fullName || !phone || !password) {
    res.status(400).json({ error: "fullName, phone, password required" });
    return;
  }
  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.length > 100) {
    res.status(400).json({ error: "Enter your full name" });
    return;
  }
  if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
    return;
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    res.status(400).json({ error: "Password must be 8 to 72 characters" });
    return;
  }
  try {
    const exists = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
    if (exists.rows.length > 0) {
      res.status(400).json({ error: "Phone already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    let referredBy: string | null = null;
    if (refCode) {
      const ref = await pool.query("SELECT id FROM users WHERE referral_code = $1", [refCode]);
      if (ref.rows.length > 0) referredBy = ref.rows[0].id;
    }

    // Assign a random UPI to this user
    const upiRes = await pool.query("SELECT id FROM upi_accounts WHERE is_active = true ORDER BY RANDOM() LIMIT 1");
    
    const result = await pool.query(
      `INSERT INTO users (full_name, phone, email, password_hash, referral_code, referred_by, balance, status)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 'active') RETURNING id, full_name, phone, email, balance, referral_code, status, kyc_status, created_at`,
      [fullName, phone, email || null, passwordHash, referralCode, referredBy]
    );
    const user = result.rows[0];
    const token = signUserToken({ userId: user.id, phone: user.phone });
    res.status(201).json({
      token,
      user: {
        id: user.id, fullName: user.full_name, phone: user.phone, email: user.email,
        balance: parseFloat(user.balance), referralCode: user.referral_code,
        status: user.status, kycStatus: user.kyc_status, createdAt: user.created_at
      }
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ error: "phone and password required" });
    return;
  }
  try {
    const result = await pool.query(
      "SELECT id, full_name, phone, email, password_hash, balance, referral_code, status, kyc_status, created_at, bank_account_number, ifsc_code, account_holder_name, upi_id FROM users WHERE phone = $1",
      [phone]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const user = result.rows[0];
    if (user.status === "blocked") {
      res.status(403).json({ error: "Account blocked" });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    const token = signUserToken({ userId: user.id, phone: user.phone });
    res.json({
      token,
      user: {
        id: user.id, fullName: user.full_name, phone: user.phone, email: user.email,
        balance: parseFloat(user.balance), referralCode: user.referral_code,
        status: user.status, kycStatus: user.kyc_status, createdAt: user.created_at,
        bankAccountNumber: user.bank_account_number, ifscCode: user.ifsc_code,
        accountHolderName: user.account_holder_name, upiId: user.upi_id
      }
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  res.json({ message: "Logged out", success: true });
});

// There is no SMS provider, so self-service password reset cannot verify who is asking.
// (It used to accept any phone number with no OTP check, which allowed account takeover.)
// Passwords are reset by the admin (Users page) after the player contacts support.
const resetDisabled = (_req: any, res: any) => {
  res.status(501).json({ error: "Password reset is handled by support. Please contact us on WhatsApp/Telegram." });
};
router.post("/auth/forgot-password", resetDisabled);
router.post("/auth/verify-otp", resetDisabled);
router.post("/auth/reset-password", resetDisabled);

router.get("/auth/profile", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, phone, email, balance, referral_code, status, kyc_status, created_at, bank_account_number, ifsc_code, account_holder_name, upi_id FROM users WHERE id = $1",
      [req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const u = result.rows[0];
    res.json({
      id: u.id, fullName: u.full_name, phone: u.phone, email: u.email,
      balance: parseFloat(u.balance), referralCode: u.referral_code,
      status: u.status, kycStatus: u.kyc_status, createdAt: u.created_at,
      bankAccountNumber: u.bank_account_number, ifscCode: u.ifsc_code,
      accountHolderName: u.account_holder_name, upiId: u.upi_id
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/auth/profile", requireAuth, async (req, res) => {
  const { fullName, email, bankAccountNumber, ifscCode, accountHolderName, upiId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email),
       bank_account_number = COALESCE($3, bank_account_number), ifsc_code = COALESCE($4, ifsc_code),
       account_holder_name = COALESCE($5, account_holder_name), upi_id = COALESCE($6, upi_id),
       updated_at = NOW() WHERE id = $7
       RETURNING id, full_name, phone, email, balance, referral_code, status, kyc_status, created_at, bank_account_number, ifsc_code, account_holder_name, upi_id`,
      [fullName, email, bankAccountNumber, ifscCode, accountHolderName, upiId, req.user!.userId]
    );
    const u = result.rows[0];
    res.json({
      id: u.id, fullName: u.full_name, phone: u.phone, email: u.email,
      balance: parseFloat(u.balance), referralCode: u.referral_code,
      status: u.status, kycStatus: u.kyc_status, createdAt: u.created_at,
      bankAccountNumber: u.bank_account_number, ifscCode: u.ifsc_code,
      accountHolderName: u.account_holder_name, upiId: u.upi_id
    });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;
