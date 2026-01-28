const express = require("express");
const router = express.Router();
const reportController = require("../Controllers/ReportController");
const DecodeToken = require("../Middlewares/DecodeToken");


router.use(DecodeToken);


router.post("/report-user", reportController.reportUser);

// Report Content Route
router.post("/report-content", reportController.reportContent);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all reports (with filters and pagination)
// Query params: ?type=user&status=pending&page=1&limit=20&sortBy=createdAt&sortOrder=desc
router.get("/admin/reports", reportController.getAllReports);

// Get single report by ID
router.get("/admin/reports/:reportId", reportController.getReportById);

// Update report status (pending, investigating, resolved, ignored)
router.patch("/admin/reports/:reportId/status", reportController.updateReportStatus);

// Ignore report (marks as ignored but keeps the report)
router.patch("/admin/reports/:reportId/ignore", reportController.ignoreReport);

// Delete report only (removes useless/fake report, doesn't affect reportedNumber)
router.delete("/admin/reports/:reportId", reportController.deleteReport);

// Delete the actual reported content (post/video) - increases reportedNumber
router.delete("/admin/reports/:reportId/delete-content", reportController.deleteReportedContent);

module.exports = router;