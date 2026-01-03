const express = require('express');
const router = express.Router();
const searchController = require('../../controllers/admin/search.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const searchAnalyticsController = require('../../controllers/admin/searchAnalytics.controller');


router.use(authenticate, authorize('admin'));

router.post('/reindex', searchController.reindexProducts);
router.post('/sync', searchController.syncRecentProducts);
router.get('/stats', searchController.getSearchStats);
router.get('/test', searchController.testConnection);
router.get('/mapping', searchController.getIndexMapping);
router.get('/analytics/metrics', searchAnalyticsController.getSearchMetrics);
router.get('/analytics/failed', searchAnalyticsController.getFailedSearches);
router.get('/analytics/ctr', searchAnalyticsController.getClickThroughData);
router.get('/analytics/popular', searchAnalyticsController.getPopularSearches);

module.exports = router;