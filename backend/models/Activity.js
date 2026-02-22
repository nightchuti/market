import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["ORDER", "PAYMENT", "USER", "COUPON", "ADS", "REPORT"],
      required: true
    },

    action: {
      type: String,
      required: true
      // เช่น CREATE_ORDER, CONFIRM_PAYMENT
    },

    description: {
      type: String,
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    relatedModel: {
      type: String,
      default: null
    },

    meta: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

export default mongoose.model("Activity", activitySchema);