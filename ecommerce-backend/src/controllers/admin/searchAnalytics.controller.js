const searchAnalyticsService = require('../../services/search/analytics.service');
const logger = require('../../utils/logger');

/**
 * Get search metrics
 */
const getSearchMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const metrics = await searchAnalyticsService.getSearchMetrics(startDate, endDate);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Get search metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search metrics',
      error: error.message
    });
  }
};

/**
 * Get failed searches
 */
const getFailedSearches = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const failedSearches = await searchAnalyticsService.getFailedSearches(
      parseInt(limit)
    );

    res.json({
      success: true,
      data: failedSearches
    });
  } catch (error) {
    logger.error('Get failed searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get failed searches',
      error: error.message
    });
  }
};

/**
 * Get click-through data
 */
const getClickThroughData = async (req, res) => {
  try {
    const data = await searchAnalyticsService.getClickThroughData();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Get click-through data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get click-through data',
      error: error.message
    });
  }
};

/**
 * Get popular searches
 */
const getPopularSearches = async (req, res) => {
  try {
    const { period = 'day', limit = 20 } = req.query;

    const searches = await searchAnalyticsService.getPopularSearchesByPeriod(
      period,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: searches
    });
  } catch (error) {
    logger.error('Get popular searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
      error: error.message
    });
  }
};

module.exports = {
  getSearchMetrics,
  getFailedSearches,
  getClickThroughData,
  getPopularSearches
};