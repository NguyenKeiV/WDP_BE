const express = require('express');
const router = express.Router();

const usersRoute = require('./users.route');

router.use('/users', usersRoute);

module.exports = router;