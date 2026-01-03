const productIndexMapping = {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          custom_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: [
              'lowercase',
              'asciifolding',
              'custom_stop',
              'custom_stemmer'
            ]
          },
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: [
              'lowercase',
              'asciifolding',
              'autocomplete_filter'
            ]
          },
          autocomplete_search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: [
              'lowercase',
              'asciifolding'
            ]
          }
        },
        filter: {
          custom_stop: {
            type: 'stop',
            stopwords: '_english_'
          },
          custom_stemmer: {
            type: 'stemmer',
            language: 'english'
          },
          autocomplete_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 20
          }
        }
      }
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'custom_analyzer',
          fields: {
            keyword: { type: 'keyword' },
            autocomplete: {
              type: 'text',
              analyzer: 'autocomplete_analyzer',
              search_analyzer: 'autocomplete_search_analyzer'
            },
            suggest: {
              type: 'completion'
            }
          }
        },
        description: {
          type: 'text',
          analyzer: 'custom_analyzer'
        },
        sku: {
          type: 'keyword'
        },
        price: {
          type: 'float'
        },
        discountPrice: {
          type: 'float'
        },
        stockQuantity: {
          type: 'integer'
        },
        category: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'custom_analyzer',
              fields: {
                keyword: { type: 'keyword' }
              }
            },
            slug: { type: 'keyword' }
          }
        },
        brand: {
          type: 'text',
          analyzer: 'custom_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        tags: {
          type: 'keyword'
        },
        attributes: {
          type: 'object',
          enabled: true
        },
        images: {
          type: 'keyword'
        },
        isActive: {
          type: 'boolean'
        },
        featured: {
          type: 'boolean'
        },
        trending: {
          type: 'boolean'
        },
        averageRating: {
          type: 'float'
        },
        reviewCount: {
          type: 'integer'
        },
        soldCount: {
          type: 'integer'
        },
        views: {
          type: 'integer'
        },
        createdAt: {
          type: 'date'
        },
        updatedAt: {
          type: 'date'
        }
      }
    }
  };
  
  module.exports = { productIndexMapping };