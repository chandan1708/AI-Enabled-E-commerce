import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.recommendation_model import CollaborativeFilteringModel, ContentBasedModel
from config.database import get_db_connection
import pandas as pd
import numpy as np

def fetch_interaction_data():
    """Fetch user interaction data from database"""
    conn = get_db_connection()
    
    query = """
        SELECT 
            user_id,
            product_id,
            interaction_type,
            timestamp
        FROM user_interactions
        ORDER BY timestamp DESC
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    # Convert interaction types to scores
    interaction_scores = {
        'purchase': 5.0,
        'add_to_cart': 3.0,
        'wishlist': 2.0,
        'view': 1.0
    }
    
    df['score'] = df['interaction_type'].map(interaction_scores)
    
    # Aggregate multiple interactions
    interaction_df = df.groupby(['user_id', 'product_id'])['score'].sum().reset_index()
    
    return interaction_df

def fetch_product_data():
    """Fetch product data for content-based filtering"""
    conn = get_db_connection()
    
    query = """
        SELECT 
            p.id as product_id,
            p.name,
            p.description,
            p.price,
            p.brand,
            c.name as category
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = true
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    return df

def train_collaborative_filtering():
    """Train collaborative filtering model"""
    print("Training Collaborative Filtering Model...")
    
    # Fetch data
    interactions_df = fetch_interaction_data()
    print(f"Loaded {len(interactions_df)} interactions")
    
    # Initialize and train model
    cf_model = CollaborativeFilteringModel()
    cf_model.prepare_data(interactions_df)
    
    # Train all methods
    cf_model.train_user_based()
    print("✓ User-based CF trained")
    
    cf_model.train_item_based()
    print("✓ Item-based CF trained")
    
    cf_model.train_svd(n_factors=50)
    print("✓ SVD trained")
    
    # Save model
    cf_model.save_model('models/saved_models/cf_model.pkl')
    print("✓ Model saved")
    
    return cf_model

def train_content_based():
    """Train content-based model"""
    print("\nTraining Content-Based Model...")
    
    # Fetch data
    products_df = fetch_product_data()
    print(f"Loaded {len(products_df)} products")
    
    # Initialize and train model
    cb_model = ContentBasedModel()
    cb_model.prepare_features(products_df)
    cb_model.train()
    print("✓ Content-based model trained")
    
    # Save model
    cb_model.save_model('models/saved_models/cb_model.pkl')
    print("✓ Model saved")
    
    return cb_model

def evaluate_models(cf_model, cb_model):
    """Evaluate model performance"""
    print("\nEvaluating Models...")
    
    # Simple evaluation - check if recommendations are generated
    test_user_id = 'some-user-id'  # Replace with actual user ID
    
    try:
        recommendations = cf_model.recommend_for_user(test_user_id, 10)
        print(f"✓ Generated {len(recommendations)} recommendations for test user")
    except:
        print("✗ Failed to generate recommendations")
    
    test_product_id = 'some-product-id'  # Replace with actual product ID
    
    try:
        similar = cb_model.get_similar_products(test_product_id, 10)
        print(f"✓ Found {len(similar)} similar products")
    except:
        print("✗ Failed to find similar products")

if __name__ == '__main__':
    print("=" * 60)
    print("AI Model Training Script")
    print("=" * 60)
    
    try:
        # Train models
        cf_model = train_collaborative_filtering()
        cb_model = train_content_based()
        
        # Evaluate
        evaluate_models(cf_model, cb_model)
        
        print("\n" + "=" * 60)
        print("Training completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Training failed: {e}")
        import traceback
        traceback.print_exc()