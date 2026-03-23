const express = require("express");
const router = express.Router();

const usersRoute = require("./users.route");
const rescueRequestsRoute = require("./rescue_requests.route");
const rescueTeamsRoute = require("./rescue_teams.route");
const vehiclesRoute = require("./vehicles.route");
const suppliesRoute = require("./supplies.route");
const importBatchesRoute = require("./import_batches.route");
const vehicleRequestsRoute = require("./vehicle_requests.route");
const uploadRoute = require("./upload.route");
const charityRoute = require("./charity.route");
const charityCampaignRoutes = require("./charity_campaign.route");

router.use("/charity-campaigns", charityCampaignRoutes);
router.use("/vehicle-requests", vehicleRequestsRoute);
router.use("/upload", uploadRoute);
router.use("/users", usersRoute);
router.use("/rescue-requests", rescueRequestsRoute);
router.use("/rescue-teams", rescueTeamsRoute);
router.use("/vehicles", vehiclesRoute);
router.use("/supplies", suppliesRoute);
router.use("/import-batches", importBatchesRoute);
router.use("/charity", charityRoute);

module.exports = router;
