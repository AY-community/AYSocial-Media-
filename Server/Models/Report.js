const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // Reporter Information
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    // What is being reported
    reportType: {
      type: String,
      enum: ["user", "content"],
      required: true,
    },

    // Reference to the reported entity
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: function () {
        return this.reportType === "user";
      },
    },

    reportedContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post", // You might want to use a discriminator or separate field for Video
      required: function () {
        return this.reportType === "content";
      },
    },

    contentType: {
      type: String,
      enum: ["post", "video"],
      required: function () {
        return this.reportType === "content";
      },
    },

    // Report Details
    reason: {
      type: String,
      enum: [
        "spam",
        "harassment",
        "inappropriate",
        "violence",
        "hate_speech",
        "nudity",
        "false_info",
        "copyright",
        "impersonation",
        "fake_account",
        "other",
      ],
      required: true,
    },

    additionalInfo: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },

    // Report Status
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
    },

    // Admin Review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    reviewedAt: {
      type: Date,
    },

    reviewNotes: {
      type: String,
      maxlength: 1000,
    },

    actionTaken: {
      type: String,
      enum: [
        "none",
        "warning_sent",
        "content_removed",
        "user_suspended",
        "user_banned",
        "other",
      ],
    },

    // Priority (can be set by system or admin)
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for efficient queries
reportSchema.index({ reportType: 1, status: 1 });
reportSchema.index({ reportedUserId: 1 });
reportSchema.index({ reportedContentId: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });

// Prevent duplicate reports from same user for same entity within 24 hours
reportSchema.index(
  { reporterId: 1, reportedUserId: 1, createdAt: 1 },
  {
    partialFilterExpression: { reportType: "user" },
    name: "prevent_duplicate_user_reports",
  }
);

reportSchema.index(
  { reporterId: 1, reportedContentId: 1, createdAt: 1 },
  {
    partialFilterExpression: { reportType: "content" },
    name: "prevent_duplicate_content_reports",
  }
);

// Virtual for getting the reported entity dynamically
reportSchema.virtual("reportedEntity").get(function () {
  if (this.reportType === "user") {
    return this.reportedUserId;
  } else {
    return this.reportedContentId;
  }
});

// Method to check if report is recent (within 24 hours)
reportSchema.statics.hasRecentReport = async function (
  reporterId,
  reportType,
  entityId
) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const query = {
    reporterId,
    reportType,
    createdAt: { $gte: twentyFourHoursAgo },
  };

  if (reportType === "user") {
    query.reportedUserId = entityId;
  } else {
    query.reportedContentId = entityId;
  }

  const existingReport = await this.findOne(query);
  return !!existingReport;
};

// Method to get report statistics
reportSchema.statics.getReportStats = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save middleware to set priority based on reason
reportSchema.pre("save", function (next) {
  if (this.isNew) {
    const urgentReasons = ["violence", "hate_speech", "nudity"];
    const highPriorityReasons = ["harassment", "inappropriate"];

    if (urgentReasons.includes(this.reason)) {
      this.priority = "urgent";
    } else if (highPriorityReasons.includes(this.reason)) {
      this.priority = "high";
    }
  }
  next();
});

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;