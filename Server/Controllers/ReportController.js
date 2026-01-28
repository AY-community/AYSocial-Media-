const Report = require("../Models/Report");
const User = require("../Models/User");

// Report User Controller
exports.reportUser = async (req, res) => {
  try {
    const reporterId = req.user?.id;

    if (!reporterId) {
      return res.status(401).json({
        success: false,
        error: "You must be logged in to submit a report",
      });
    }

    const { userId, reason, additionalInfo } = req.body;

    if (!userId || !reason || !additionalInfo) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const validReasons = [
      "spam",
      "harassment",
      "inappropriate",
      "impersonation",
      "hate_speech",
      "fake_account",
      "copyright",
      "other",
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: "Invalid report reason",
      });
    }

    const trimmedInfo = additionalInfo.trim();
    if (trimmedInfo.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Additional information must be at least 10 characters",
      });
    }

    if (trimmedInfo.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Additional information must not exceed 2000 characters",
      });
    }

    const reportedUser = await User.findById(userId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (reporterId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        error: "You cannot report yourself",
      });
    }

    const hasRecent = await Report.hasRecentReport(reporterId, "user", userId);

    if (hasRecent) {
      return res.status(400).json({
        success: false,
        error: "You have already reported this user recently. Please wait 24 hours before submitting another report.",
      });
    }

    const newReport = new Report({
      reporterId,
      reportType: "user",
      reportedUserId: userId,
      reason,
      additionalInfo: trimmedInfo,
      status: "pending",
    });

    await newReport.save();

    // DON'T increment reportedNumber yet - only when admin takes action

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      reportId: newReport._id,
    });
  } catch (error) {
    console.error("Error submitting user report:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while submitting the report. Please try again.",
    });
  }
};

// Report Content Controller
exports.reportContent = async (req, res) => {
  try {
    const reporterId = req.user?.id;

    if (!reporterId) {
      return res.status(401).json({
        success: false,
        error: "You must be logged in to submit a report",
      });
    }

    const { contentId, contentType, reason, additionalInfo } = req.body;

    if (!contentId || !contentType || !reason || !additionalInfo) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (!["post", "video"].includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid content type. Must be 'post' or 'video'",
      });
    }

    const validReasons = [
      "spam",
      "harassment",
      "inappropriate",
      "violence",
      "hate_speech",
      "nudity",
      "false_info",
      "copyright",
      "other",
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: "Invalid report reason",
      });
    }

    const trimmedInfo = additionalInfo.trim();
    if (trimmedInfo.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Additional information must be at least 10 characters",
      });
    }

    if (trimmedInfo.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Additional information must not exceed 2000 characters",
      });
    }

    let content;
    if (contentType === "video") {
      const Video = require("../Models/Video");
      content = await Video.findById(contentId);
    } else {
      const Post = require("../Models/Post");
      content = await Post.findById(contentId);
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    if (content.user && content.user.toString() === reporterId.toString()) {
      return res.status(400).json({
        success: false,
        error: "You cannot report your own content",
      });
    }

    const hasRecent = await Report.hasRecentReport(reporterId, "content", contentId);

    if (hasRecent) {
      return res.status(400).json({
        success: false,
        error: "You have already reported this content recently. Please wait 24 hours before submitting another report.",
      });
    }

    const newReport = new Report({
      reporterId,
      reportType: "content",
      reportedContentId: contentId,
      contentType,
      reason,
      additionalInfo: trimmedInfo,
      status: "pending",
    });

    await newReport.save();

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      reportId: newReport._id,
    });
  } catch (error) {
    console.error("Error submitting content report:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while submitting the report. Please try again.",
    });
  }
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Get All Reports (Admin)
exports.getAllReports = async (req, res) => {
  try {
    const { type, contentType, status, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const filter = {};
    
    // Handle type filter
    if (type && ["user", "content"].includes(type)) {
      filter.reportType = type;
    }
    
    // Handle contentType filter for content reports
    if (contentType && ["post", "video"].includes(contentType)) {
      filter.contentType = contentType;
      filter.reportType = "content"; // Ensure we're filtering content reports
    }
    
    // Handle status filter
    if (status && ["pending", "investigating", "resolved", "ignored"].includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const reports = await Report.find(filter)
      .populate("reporterId", "userName profilePic email")
      .populate("reportedUserId", "userName profilePic email reportedNumber")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalReports = await Report.countDocuments(filter);

    const formattedReports = await Promise.all(
      reports.map(async (report) => {
        let entityData = {};
        let reportedCount = 0;

        if (report.reportType === "user" && report.reportedUserId) {
          reportedCount = report.reportedUserId.reportedNumber || 0;
          entityData = {
            type: "user",
            entityId: report.reportedUserId._id,
            userName: report.reportedUserId.userName,
            profilePic: report.reportedUserId.profilePic,
            email: report.reportedUserId.email,
          };
        } else if (report.reportType === "content" && report.reportedContentId) {
          reportedCount = await Report.countDocuments({
            reportedContentId: report.reportedContentId,
          });

          let content;
          if (report.contentType === "video") {
            const Video = require("../Models/Video");
            content = await Video.findById(report.reportedContentId)
              .populate("user", "userName profilePic")
              .lean();
          } else {
            const Post = require("../Models/Post");
            content = await Post.findById(report.reportedContentId)
              .populate("user", "userName profilePic")
              .lean();
          }

          if (content) {
            entityData = {
              type: report.contentType,
              entityId: content._id,
              content: content.text || content.description || "",
              contentOwner: content.user,
            };
          }
        }

        return {
          id: report._id,
          type: report.reportType,
          contentType: report.contentType,
          entityId: report.reportedUserId?._id || report.reportedContentId,
          reason: report.reason,
          additionalInfo: report.additionalInfo,
          status: report.status,
          createdAt: report.createdAt,
          reporter: {
            id: report.reporterId._id,
            userName: report.reporterId.userName,
            profilePic: report.reporterId.profilePic,
          },
          reportedCount,
          entityData,
        };
      })
    );

    return res.status(200).json({
      success: true,
      reports: formattedReports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / parseInt(limit)),
        totalReports,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while fetching reports",
    });
  }
};

// Get Single Report Details (Admin)
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate("reporterId", "userName profilePic email")
      .populate("reportedUserId", "userName profilePic email reportedNumber bio")
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    let entityDetails = {};
    if (report.reportType === "user" && report.reportedUserId) {
      entityDetails = report.reportedUserId;
    } else if (report.reportType === "content" && report.reportedContentId) {
      let content;
      if (report.contentType === "video") {
        const Video = require("../Models/Video");
        content = await Video.findById(report.reportedContentId)
          .populate("user", "userName profilePic email")
          .lean();
      } else {
        const Post = require("../Models/Post");
        content = await Post.findById(report.reportedContentId)
          .populate("user", "userName profilePic email")
          .lean();
      }
      entityDetails = content;
    }

    return res.status(200).json({
      success: true,
      report: {
        ...report,
        entityDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while fetching the report",
    });
  }
};

// Update Report Status (Admin)
exports.updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    if (!["pending", "investigating", "resolved", "ignored"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes: adminNotes || undefined,
        reviewedAt: Date.now(),
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report status updated successfully",
      report,
    });
  } catch (error) {
    console.error("Error updating report status:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while updating the report",
    });
  }
};

// Delete Report (Admin) - Just removes the report, no action taken
// Delete Report (Admin) - Just removes the report document
// Delete Report (Admin) - Deletes report and increments reportedNumber for content reports
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    // If it's a content report, increment the owner's reportedNumber
    if (report.reportType === "content") {
      const contentId = report.reportedContentId;
      const contentType = report.contentType;

      let ownerId = null;

      if (contentType === "video") {
        const Video = require("../Models/Video");
        const video = await Video.findById(contentId);
        if (video) {
          ownerId = video.user;
        }
      } else {
        const Post = require("../Models/Post");
        const post = await Post.findById(contentId);
        if (post) {
          ownerId = post.user;
        }
      }

      // Increment reportedNumber for the content owner
      if (ownerId) {
        await User.findByIdAndUpdate(ownerId, { 
          $inc: { reportedNumber: 1 } 
        });
      }
    }

    // Delete the report
    await Report.findByIdAndDelete(reportId);

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
      reportType: report.reportType,
      entityId: report.reportType === "user" ? report.reportedUserId : report.reportedContentId,
      contentType: report.contentType,
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the report",
    });
  }
};

// Ignore Report (Admin)
// Ignore Report (Admin) - Now deletes the report
exports.ignoreReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findByIdAndDelete(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    // No increment/decrement to reportedNumber - just delete the report

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the report",
    });
  }
};

// Delete Reported Content (Admin)
exports.deleteReportedContent = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adminNotes } = req.body || {};

    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    if (report.reportType !== "content") {
      return res.status(400).json({
        success: false,
        error: "This report is not about content",
      });
    }

    const contentId = report.reportedContentId;
    const contentType = report.contentType;

    let content = null;
    let ownerId = null;

    if (contentType === "video") {
      const Video = require("../Models/Video");
      content = await Video.findById(contentId);
      if (content) {
        ownerId = content.user;
        await Video.findByIdAndDelete(contentId);
      }
    } else {
      const Post = require("../Models/Post");
      content = await Post.findById(contentId);
      if (content) {
        ownerId = content.user;
        await Post.findByIdAndDelete(contentId);
      }
    }

    if (ownerId) {
      await User.findByIdAndUpdate(ownerId, { $inc: { reportedNumber: 1 } });
    }

    await Report.findByIdAndUpdate(
      reportId,
      {
        status: "resolved",
        adminNotes: adminNotes || undefined,
        reviewedAt: Date.now(),
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: content ? "Reported content deleted and user flagged" : "Content already removed; report marked resolved",
    });
  } catch (error) {
    console.error("Error deleting reported content:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while deleting the reported content",
    });
  }
};