from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

from services.recommendation_service import RecommendationService
from services.fraud_service import FraudService
from services.nlp_service import NLPService
from services.content_generation_service import ContentGenerationService

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize services
recommendation_service = RecommendationService()
fraud_service = FraudService()
nlp_service = NLPService()
content_service = ContentGenerationService()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'AI Services'}), 200

# Recommendation endpoints
@app.route('/api/ai/recommendations/user/', methods=['GET'])
def get_user_recommendations(user_id):
    try:
        limit = request.args.get('limit', 10, type=int)
        recommendations = recommendation_service.get_user_recommendations(user_id, limit)
        return jsonify({'success': True, 'data': recommendations}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/recommendations/product/', methods=['GET'])
def get_similar_products(product_id):
    try:
        limit = request.args.get('limit', 10, type=int)
        similar = recommendation_service.get_similar_products(product_id, limit)
        return jsonify({'success': True, 'data': similar}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/recommendations/trending', methods=['GET'])
def get_trending_products():
    try:
        limit = request.args.get('limit', 10, type=int)
        trending = recommendation_service.get_trending_products(limit)
        return jsonify({'success': True, 'data': trending}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Fraud detection endpoints
@app.route('/api/ai/fraud/check', methods=['POST'])
def check_fraud():
    try:
        data = request.json
        result = fraud_service.check_transaction(data)
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# NLP endpoints
@app.route('/api/ai/nlp/search', methods=['POST'])
def nlp_search():
    try:
        data = request.json
        query = data.get('query')
        result = nlp_service.process_search_query(query)
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/nlp/sentiment', methods=['POST'])
def analyze_sentiment():
    try:
        data = request.json
        text = data.get('text')
        sentiment = nlp_service.analyze_sentiment(text)
        return jsonify({'success': True, 'data': sentiment}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Content generation endpoints
@app.route('/api/ai/content/generate-description', methods=['POST'])
def generate_description():
    try:
        data = request.json
        description = content_service.generate_product_description(data)
        return jsonify({'success': True, 'data': description}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/content/generate-tags', methods=['POST'])
def generate_tags():
    try:
        data = request.json
        tags = content_service.generate_product_tags(data)
        return jsonify({'success': True, 'data': tags}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('AI_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)