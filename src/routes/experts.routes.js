const express = require('express');
const router = express.Router();
const controller = require('../controllers/experts.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, isAdmin);

router.get('/', controller.listExperts);
router.post('/', controller.createExpert);
router.put('/:id', controller.updateExpert);
router.delete('/:id', controller.deleteExpert);

module.exports = router; 