const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  } : undefined,
  requestTimeout: 60000,
  maxRetries: 3
});

// Test connection
const checkConnection = async () => {
  try {
    const health = await client.cluster.health();
    console.log(' Elasticsearch connected:', health.status);
    return true;
  } catch (error) {
    console.error(' Elasticsearch connection failed:', error.message);
    return false;
  }
};

// Initialize on startup
checkConnection();

module.exports = { client, checkConnection };