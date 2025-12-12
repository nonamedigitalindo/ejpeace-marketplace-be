const express = require("express");
const router = express.Router();
const PurchaseRepository = require("../models/purchase.repository");
const { successResponse } = require("../utils/response.util");

// Debug endpoint to check purchase status
router.get("/purchase/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await PurchaseRepository.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    return successResponse(res, "Purchase details", {
      id: purchase.id,
      user_id: purchase.user_id,
      total_amount: purchase.total_amount,
      status: purchase.status,
      payment_id: purchase.payment_id,
      external_id: purchase.external_id,
      created_at: purchase.created_at,
      updated_at: purchase.updated_at,
      completed_at: purchase.completed_at,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching purchase",
      error: error.message,
    });
  }
});

module.exports = router;
