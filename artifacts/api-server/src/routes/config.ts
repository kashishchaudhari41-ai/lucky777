import { Router } from "express";
import { getNumberSetting } from "../lib/settings.js";

const router = Router();

// Public: limits the mobile app shows before the user submits a request
router.get("/app-config", async (_req, res) => {
  const [minDeposit, minWithdrawal] = await Promise.all([
    getNumberSetting("min_deposit"), getNumberSetting("min_withdrawal")]);
  res.json({ minDeposit, minWithdrawal });
});

export default router;
