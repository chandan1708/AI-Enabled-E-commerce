import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.recommendation_model import CollaborativeFilteringModel, ContentBasedModel
from config.database import get_db_connection
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class RecommendationService:
    def __init__(self):
        self.cf_model = CollaborativeFilteringModel()
        self.cb_model = ContentBasedModel()
        self.load_models()
        
    def load_models(self):
        """Load pre-trained models"""
        try:
            self.cf_model.load_model('models/saved_models/cf_model.pkl')
            self.cb_model.load_model('models/saved_models/cb_model.pkl')
            print("Models loaded successfully")
        except Exception as e:
            print(f"Error loading models: {e}")
            print("Models need to be trained first")
    
    def get_user_recommendations(self, user_id, limit=10):
        """
        Get personalized recommendations for a user
        Combines collaborative filtering and content-based approaches
        """
        try:
            # Get collaborative filtering recommendations
            cf_recommendations = self.cf_model.recommend_for_user(user_id, limit * 2)
            
            # Get user's recent interactions for content-based
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT DISTINCT product_id
                FROM user_interactions
                WHERE user_id = %s
                ORDER BY timestamp DESC
                LIMIT 5
            """, (user_id,))
            
            recent_products = [row[0] for row in cursor.fetchall()]
            
            # Get content-based recommendations
            cb_recommendations = []
            for product_id in recent_products:
                similar = self.cb_model.get_similar_products(product_id, 5)
                cb_recommendations.extend(similar)
            
            # Combine recommendations (hybrid approach)
            combined = self._combine_recommendations(
                cf_recommendations,
                cb_recommendations,
                cf_weight=0.7,
                cb_weight=0.3
            )
            
            # Get product details
            product_ids = [rec[0] for rec in combined[:limit]]
            products = self._get_product_details(product_ids)
            
            cursor.close()
            conn.close()
            
            return products
            
        except Exception as e:
            print(f"Error in get_user_recommendations: {e}")
            return []
    
    def get_similar_products(self, product_id, limit=10):
        """Get products similar to a given product"""
        try:
            # Use content-based similarity
            similar = self.cb_model.get_similar_products(product_id, limit)
            
            # Get product details
            product_ids = [item[0] for item in similar]
            products = self._get_product_details(product_ids)
            
            return products
            
        except Exception as e:
            print(f"Error in get_similar_products: {e}")
            return []
    
    def get_trending_products(self, limit=10, days=7):
        """Get trending products based on recent interactions"""
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            since_date = datetime.now() - timedelta(days=days)
            
            cursor.execute("""
                SELECT 
                    product_id,
                    COUNT(*) as interaction_count,
                    SUM(CASE WHEN interaction_type = 'purchase' THEN 3
                             WHEN interaction_type = 'add_to_cart' THEN 2
                             ELSE 1 END) as weighted_score
                FROM user_interactions
                WHERE timestamp >= %s
                GROUP BY product_id
                ORDER BY weighted_score DESC
                LIMIT %s
            """, (since_date, limit))
            
            trending = cursor.fetchall()
            product_ids = [row[0] for row in trending]
            
            products = self._get_product_details(product_ids)
            
            cursor.close()
            conn.close()
            
            return products
            
        except Exception as e:
            print(f"Error in get_trending_products: {e}")
            return []
    
    def get_personalized_homepage(self, user_id):
        """Get personalized product sections for homepage"""
        try:
            homepage_data = {
                'recommended_for_you': self.get_user_recommendations(user_id, 12),
                'trending': self.get_trending_products(8),
                'similar_to_viewed': [],
                'frequently_bought_together': []
            }
            
            # Get recently viewed products
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT product_id
                FROM user_interactions
                WHERE user_id = %s AND interaction_type = 'view'
                ORDER BY timestamp DESC
                LIMIT 1
            """, (user_id,))
            
            recent_view = cursor.fetchone()
            
            if recent_view:
                homepage_data['similar_to_viewed'] = self.get_similar_products(
                    recent_view[0], 8
                )
            
            cursor.close()
            conn.close()
            
            return homepage_data
            
        except Exception as e:
            print(f"Error in get_personalized_homepage: {e}")
            return {}
    
    def _combine_recommendations(self, cf_recs, cb_recs, cf_weight=0.7, cb_weight=0.3):
        """Combine collaborative and content-based recommendations"""
        combined_scores = {}
        
        # Add CF scores
        for product_id, score in cf_recs:
            combined_scores[product_id] = score * cf_weight
        
        # Add CB scores
        for product_id, score in cb_recs:
            if product_id in combined_scores:
                combined_scores[product_id] += score * cb_weight
            else:
                combined_scores[product_id] = score * cb_weight
        
        # Sort by combined score
        sorted_recommendations = sorted(
            combined_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return sorted_recommendations
    
    def _get_product_details(self, product_ids):
        """Fetch product details from database"""
        if not product_ids:
            return []
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            placeholders = ','.join(['%s'] * len(product_ids))
            
            cursor.execute(f"""
                SELECT 
                    id, name, price, discount_price, 
                    images, average_rating, review_count
                FROM products
                WHERE id IN ({placeholders}) AND is_active = true
            """, product_ids)
            
            products = []
            for row in cursor.fetchall():
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'price': float(row[2]),
                    'discountPrice': float(row[3]) if row[3] else None,
                    'images': row[4],
                    'averageRating': float(row[5]) if row[5] else 0,
                    'reviewCount': row[6]
                })
            
            cursor.close()
            conn.close()
            
            return products
            
        except Exception as e:
            print(f"Error fetching product details: {e}")
            return []