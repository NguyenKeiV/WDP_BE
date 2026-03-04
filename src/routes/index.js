const express = require("express");
const router = express.Router();

const usersRoute = require("./users.route");
const rescueRequestsRoute = require("./rescue_requests.route");
const rescueTeamsRoute = require("./rescue_teams.route");
const vehiclesRoute = require("./vehicles.route");
const suppliesRoute = require("./supplies.route");

router.use("/users", usersRoute);
router.use("/rescue-requests", rescueRequestsRoute);
router.use("/rescue-teams", rescueTeamsRoute);
router.use("/vehicles", vehiclesRoute);
router.use("/supplies", suppliesRoute);

module.exports = router;
