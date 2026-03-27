const express = require("express");
const VolunteerRegistrationController = require("../controllers/volunteer_registration");
const { requireAuth, requireManager } = require("../middlewares/auth");

const router = express.Router();

router.post("/", requireAuth, VolunteerRegistrationController.create);
router.get("/me", requireAuth, VolunteerRegistrationController.listMine);
router.get(
  "/",
  requireManager,
  VolunteerRegistrationController.listAllForManager,
);
router.get("/:id", requireAuth, VolunteerRegistrationController.getById);
router.post(
  "/:id/review",
  requireManager,
  VolunteerRegistrationController.review,
);

module.exports = router;
