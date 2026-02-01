const express = require("express");
const router = express.Router();

const usersRoute = require("./users.route");
const rescueRequestsRoute = require("./rescue_requests.route");
const rescueTeamsRoute = require("./rescue_teams.route");

router.use("/users", usersRoute);
router.use("/rescue-requests", rescueRequestsRoute);
router.use("/rescue-teams", rescueTeamsRoute);

module.exports = router;
