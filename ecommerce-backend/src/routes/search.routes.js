const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Public search routes
router.get('/', searchController.searchProducts);
router.get('/autocomplete', searchController.getAutocomplete);
router.get('/suggestions', searchController.searchAsYouType);
router.get('/trending', searchController.getTrendingSearches);
router.get('/filters', searchController.getSearchFilters);
router.get('/nlp', searchController.naturalLanguageSearch);


module.exports = router;