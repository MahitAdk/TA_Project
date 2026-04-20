import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import { updateUserPlan, getUserById } from "../services/user.service.js";

//
// 🔹 CREATE ORDER
//
export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    let amount;

    if (plan === "pro") amount = 49900;
    else if (plan === "enterprise") amount = 149900;
    else {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Order creation failed" });
  }
};

//
// 🔹 VERIFY PAYMENT + UPDATE PLAN
//
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false });
    }

    const userId = req.user.id;

    // ✅ UPDATE PLAN
    await updateUserPlan(userId, plan);

    // ✅ RETURN UPDATED USER
    const user = await getUserById(userId);

    res.json({
      success: true,
      user,
    });

  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
};