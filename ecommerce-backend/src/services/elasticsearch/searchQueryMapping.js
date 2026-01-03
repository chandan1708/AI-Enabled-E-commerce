const searchQueryIndexMapping = {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1
    },
    mappings: {
      properties: {
        query: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        userId: {
          type: 'keyword'
        },
        resultCount: {
          type: 'integer'
        },
        timestamp: {
          type: 'date'
        },
        clickedProductIds: {
          type: 'keyword'
        }
      }
    }
  };
  
  module.exports = { searchQueryIndexMapping };