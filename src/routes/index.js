const express = require("express");
const router = express.Router();

const usersRoute = require("./users.route");
const rescueRequestsRoute = require("./rescue_requests.route");

router.use("/users", usersRoute);
router.use("/rescue-requests", rescueRequestsRoute);

module.exports = router;
