const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate, authorize('admin'));

router.get('/', userController.getAllUsers);
router.get('/stats', userController.getUserStats);
router.get('/:id', userController.getUserById);
router.put('/:id/role', userController.updateUserRole);
router.put('/:id/toggle-status', userController.toggleUserStatus);

module.exports = router;