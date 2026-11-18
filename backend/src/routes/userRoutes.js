const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/profile', auth, controller.getProfile);
router.put('/change-password', auth, controller.changePassword);

module.exports = router;