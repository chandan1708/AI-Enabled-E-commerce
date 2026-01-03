const { client } = require('../../config/elasticsearch');
const logger = require('../../utils/logger');

const SEARCH_QUERIES_INDEX = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'ecommerce_'}search_queries`;

class SearchAnalyticsService {

  /**
   * Get search performance metrics
   */
  async getSearchMetrics(startDate, endDate) {
    try {
      const dateRange = {
        gte: startDate || 'now-7d/d',
        lte: endDate || 'now/d'
      };

      const response = await client.search({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: {
            range: {
              timestamp: dateRange
            }
          },
          aggs: {
            total_searches: {
              value_count: {
                field: 'query.keyword'
              }
            },
            unique_searches: {
              cardinality: {
                field: 'query.keyword'
              }
            },
            avg_results: {
              avg: {
                field: 'resultCount'
              }
            },
            zero_result_searches: {
              filter: {
                term: { resultCount: 0 }
              }
            },
            searches_by_hour: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'hour',
                format: 'yyyy-MM-dd HH:00'
              }
            },
            top_queries: {
              terms: {
                field: 'query.keyword',
                size: 50,
                order: { _count: 'desc' }
              }
            }
          },
          size: 0
        }
      });

      const aggs = response.aggregations;

      return {
        totalSearches: aggs.total_searches.value,
        uniqueSearches: aggs.unique_searches.value,
        avgResultsPerSearch: aggs.avg_results.value,
        zeroResultSearches: aggs.zero_result_searches.doc_count,
        zeroResultRate: (aggs.zero_result_searches.doc_count / aggs.total_searches.value * 100).toFixed(2),
        searchesByHour: aggs.searches_by_hour.buckets,
        topQueries: aggs.top_queries.buckets
      };
    } catch (error) {
      logger.error('Get search metrics error:', error);
      throw error;
    }
  }

  /**
   * Get failed searches (0 results)
   */
  async getFailedSearches(limit = 100) {
    try {
      const response = await client.search({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: {
            term: { resultCount: 0 }
          },
          aggs: {
            failed_queries: {
              terms: {
                field: 'query.keyword',
                size: limit,
                order: { _count: 'desc' }
              }
            }
          },
          size: 0
        }
      });

      return response.aggregations.failed_queries.buckets;
    } catch (error) {
      logger.error('Get failed searches error:', error);
      throw error;
    }
  }

  /**
   * Get search click-through data
   */
  async getClickThroughData() {
    try {
      const response = await client.search({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: {
            exists: {
              field: 'clickedProductIds'
            }
          },
          aggs: {
            searches_with_clicks: {
              value_count: {
                field: 'clickedProductIds'
              }
            },
            total_searches: {
              value_count: {
                field: 'query.keyword'
              }
            }
          },
          size: 0
        }
      });

      const aggs = response.aggregations;
      const clickThroughRate = (aggs.searches_with_clicks.value / aggs.total_searches.value * 100).toFixed(2);

      return {
        searchesWithClicks: aggs.searches_with_clicks.value,
        totalSearches: aggs.total_searches.value,
        clickThroughRate: parseFloat(clickThroughRate)
      };
    } catch (error) {
      logger.error('Get click-through data error:', error);
      throw error;
    }
  }

  /**
   * Get popular search terms by time period
   */
  async getPopularSearchesByPeriod(period = 'day', limit = 20) {
    try {
      const intervals = {
        hour: '1h',
        day: '1d',
        week: '1w',
        month: '1M'
      };

      const response = await client.search({
        index: SEARCH_QUERIES_INDEX,
        body: {
          query: {
            range: {
              timestamp: {
                gte: `now-1${period[0]}/d`
              }
            }
          },
          aggs: {
            popular_searches: {
              terms: {
                field: 'query.keyword',
                size: limit,
                order: { _count: 'desc' }
              },
              aggs: {
                trend: {
                  date_histogram: {
                    field: 'timestamp',
                    fixed_interval: intervals[period]
                  }
                }
              }
            }
          },
          size: 0
        }
      });

      return response.aggregations.popular_searches.buckets;
    } catch (error) {
      logger.error('Get popular searches by period error:', error);
      throw error;
    }
  }
}

module.exports = new SearchAnalyticsService();