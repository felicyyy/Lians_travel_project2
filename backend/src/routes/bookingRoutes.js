const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookingController');


router.get('/', controller.getAllBookings);
router.get('/stats', controller.getMonthlyStats);
router.get('/rentuner', controller.getRentunerBookings);
router.get('/dp-notifications', controller.getDPBookings);
router.get('/phone/:phone', controller.getBookingsByPhone);
router.get('/:id', controller.getBookingById);


router.post('/', controller.createBooking);


router.put('/:id/status', controller.updateBookingStatus);
router.put('/:id/detail', controller.updateBookingDetail);


router.delete('/:id', controller.deleteBooking);

module.exports = router;