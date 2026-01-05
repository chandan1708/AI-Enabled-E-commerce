import spacy
from transformers import pipeline
import re

class NLPService:
    def __init__(self):
        # Load spaCy model
        self.nlp = spacy.load('en_core_web_sm')
        
        # Load sentiment analysis pipeline
        self.sentiment_analyzer = pipeline(
            'sentiment-analysis',
            model='distilbert-base-uncased-finetuned-sst-2-english'
        )
        
        # Load zero-shot classification for intent detection
        self.classifier = pipeline('zero-shot-classification')
    
    def process_search_query(self, query):
        """
        Process natural language search query
        Extract intent, entities, filters
        """
        doc = self.nlp(query.lower())
        
        result = {
            'original_query': query,
            'cleaned_query': '',
            'intent': '',
            'entities': {},
            'filters': {},
            'keywords': []
        }
        
        # Extract entities
        entities = {
            'colors': [],
            'brands': [],
            'sizes': [],
            'materials': []
        }
        
        # Color detection
        colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'orange', 
                 'purple', 'pink', 'brown', 'gray', 'grey', 'silver', 'gold']
        for color in colors:
            if color in query.lower():
                entities['colors'].append(color)
        
        # Size detection
        sizes = ['small', 'medium', 'large', 'xl', 'xxl', 'xs', 's', 'm', 'l']
        for size in sizes:
            if re.search(r'\b' + size + r'\b', query.lower()):
                entities['sizes'].append(size)
        
        # Price extraction
        price_patterns = [
            (r'under (\d+)', 'max_price'),
            (r'below (\d+)', 'max_price'),
            (r'less than (\d+)', 'max_price'),
            (r'above (\d+)', 'min_price'),
            (r'more than (\d+)', 'min_price'),
            (r'over (\d+)', 'min_price'),
            (r'between (\d+) and (\d+)', 'price_range'),
            (r'(\d+) to (\d+)', 'price_range')
        ]
        
        for pattern, filter_type in price_patterns:
            match = re.search(pattern, query.lower())
            if match:
                if filter_type == 'price_range':
                    result['filters']['min_price'] = int(match.group(1))
                    result['filters']['max_price'] = int(match.group(2))
                elif filter_type == 'max_price':
                    result['filters']['max_price'] = int(match.group(1))
                elif filter_type == 'min_price':
                    result['filters']['min_price'] = int(match.group(1))
                break
        
        # Detect intent
        candidate_labels = ['search', 'compare', 'recommend', 'filter', 'sort']
        intent_result = self.classifier(query, candidate_labels)
        result['intent'] = intent_result['labels'][0]
        
        # Extract keywords (remove stop words and entities)
        keywords = []
        for token in doc:
            if not token.is_stop and not token.is_punct and len(token.text) > 2:
                keywords.append(token.text)
        
        result['keywords'] = keywords
        result['entities'] = entities
        
        # Create cleaned query (remove price mentions, etc.)
        cleaned = query.lower()
        for pattern, _ in price_patterns:
            cleaned = re.sub(pattern, '', cleaned)
        for color in entities['colors']:
            cleaned = cleaned.replace(color, '')
        for size in entities['sizes']:
            cleaned = re.sub(r'\b' + size + r'\b', '', cleaned)
        
        result['cleaned_query'] = ' '.join(cleaned.split())
        
        return result
    
    def analyze_sentiment(self, text):
        """
        Analyze sentiment of text (e.g., product reviews)
        Returns: positive, negative, neutral with scores
        """
        result = self.sentiment_analyzer(text)[0]
        
        return {
            'label': result['label'].lower(),
            'score': float(result['score']),
            'text': text
        }
    
    def analyze_review_batch(self, reviews):
        """Analyze sentiment for multiple reviews"""
        sentiments = []
        
        for review in reviews:
            sentiment = self.analyze_sentiment(review['text'])
            sentiments.append({
                'review_id': review['id'],
                'sentiment': sentiment['label'],
                'score': sentiment['score']
            })
        
        # Calculate overall sentiment
        positive_count = sum(1 for s in sentiments if s['sentiment'] == 'positive')
        negative_count = sum(1 for s in sentiments if s['sentiment'] == 'negative')
        
        total = len(sentiments)
        
        return {
            'reviews': sentiments,
            'summary': {
                'total': total,
                'positive': positive_count,
                'negative': negative_count,
                'positive_percentage': (positive_count / total * 100) if total > 0 else 0,
                'negative_percentage': (negative_count / total * 100) if total > 0 else 0
            }
        }
    
    def extract_product_attributes(self, description):
        """
        Extract structured attributes from product description
        """
        doc = self.nlp(description)
        
        attributes = {
            'materials': [],
            'colors': [],
            'dimensions': [],
            'features': []
        }
        
        # Extract adjectives as potential features
        for token in doc:
            if token.pos_ == 'ADJ':
                attributes['features'].append(token.text)
        
        # Extract measurements
        measurement_pattern = r'(\d+\.?\d*)\s*(cm|mm|m|inch|inches|kg|g|ml|l)'
        matches = re.findall(measurement_pattern, description.lower())
        attributes['dimensions'] = [f"{value} {unit}" for value, unit in matches]
        
        return attributes
    
    def generate_search_suggestions(self, partial_query):
        """
        Generate search suggestions based on partial query
        """
        # This would typically use a trained model or database lookup
        # For now, simple keyword expansion
        
        doc = self.nlp(partial_query.lower())
        suggestions = []
        
        # Add common completions
        if len(partial_query) >= 2:
            # In production, this would query a suggestions database
            # or use a trained model
            suggestions = [
                partial_query + " for men",
                partial_query + " for women",
                partial_query + " online",
                "best " + partial_query,
                partial_query + " with free shipping"
            ]
        
        return suggestions[:5]