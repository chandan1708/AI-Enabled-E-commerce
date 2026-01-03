import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
import pickle
import os

class CollaborativeFilteringModel:
    def __init__(self):
        self.user_item_matrix = None
        self.user_similarity = None
        self.item_similarity = None
        self.svd_user_features = None
        self.svd_item_features = None
        self.user_mapping = {}
        self.item_mapping = {}
        self.reverse_user_mapping = {}
        self.reverse_item_mapping = {}
        
    def prepare_data(self, interactions_df):
        """
        Prepare interaction data
        interactions_df should have columns: user_id, product_id, rating/interaction_score
        """
        # Create mappings
        unique_users = interactions_df['user_id'].unique()
        unique_items = interactions_df['product_id'].unique()
        
        self.user_mapping = {user_id: idx for idx, user_id in enumerate(unique_users)}
        self.item_mapping = {item_id: idx for idx, item_id in enumerate(unique_items)}
        self.reverse_user_mapping = {idx: user_id for user_id, idx in self.user_mapping.items()}
        self.reverse_item_mapping = {idx: item_id for item_id, idx in self.item_mapping.items()}
        
        # Create user-item matrix
        n_users = len(unique_users)
        n_items = len(unique_items)
        
        self.user_item_matrix = np.zeros((n_users, n_items))
        
        for _, row in interactions_df.iterrows():
            user_idx = self.user_mapping[row['user_id']]
            item_idx = self.item_mapping[row['product_id']]
            self.user_item_matrix[user_idx, item_idx] = row['score']
        
        return self.user_item_matrix
    
    def train_user_based(self):
        """Train user-based collaborative filtering"""
        # Calculate user similarity using cosine similarity
        self.user_similarity = cosine_similarity(self.user_item_matrix)
        return self.user_similarity
    
    def train_item_based(self):
        """Train item-based collaborative filtering"""
        # Calculate item similarity
        self.item_similarity = cosine_similarity(self.user_item_matrix.T)
        return self.item_similarity
    
    def train_svd(self, n_factors=50):
        """Train matrix factorization using SVD"""
        # Convert to sparse matrix
        sparse_matrix = csr_matrix(self.user_item_matrix)
        
        # Perform SVD
        u, s, vt = svds(sparse_matrix, k=n_factors)
        
        # Store the features
        self.svd_user_features = u
        self.svd_item_features = vt.T
        
        return u, s, vt
    
    def predict_user_item(self, user_id, item_id, method='svd'):
        """Predict rating for a user-item pair"""
        if user_id not in self.user_mapping or item_id not in self.item_mapping:
            return 0.0
        
        user_idx = self.user_mapping[user_id]
        item_idx = self.item_mapping[item_id]
        
        if method == 'svd':
            # SVD prediction
            prediction = np.dot(
                self.svd_user_features[user_idx],
                self.svd_item_features[item_idx]
            )
        elif method == 'user_based':
            # User-based prediction
            similar_users = self.user_similarity[user_idx]
            user_ratings = self.user_item_matrix[:, item_idx]
            prediction = np.dot(similar_users, user_ratings) / np.sum(np.abs(similar_users))
        elif method == 'item_based':
            # Item-based prediction
            similar_items = self.item_similarity[item_idx]
            item_ratings = self.user_item_matrix[user_idx, :]
            prediction = np.dot(similar_items, item_ratings) / np.sum(np.abs(similar_items))
        else:
            prediction = 0.0
        
        return float(prediction)
    
    def recommend_for_user(self, user_id, n_recommendations=10):
        """Get top N recommendations for a user"""
        if user_id not in self.user_mapping:
            return []
        
        user_idx = self.user_mapping[user_id]
        
        # Get items the user hasn't interacted with
        user_interactions = self.user_item_matrix[user_idx]
        unrated_items = np.where(user_interactions == 0)[0]
        
        # Predict scores for unrated items
        predictions = []
        for item_idx in unrated_items:
            item_id = self.reverse_item_mapping[item_idx]
            score = self.predict_user_item(user_id, item_id)
            predictions.append((item_id, score))
        
        # Sort by score and return top N
        predictions.sort(key=lambda x: x[1], reverse=True)
        return predictions[:n_recommendations]
    
    def get_similar_items(self, item_id, n_similar=10):
        """Get similar items using item similarity"""
        if item_id not in self.item_mapping:
            return []
        
        item_idx = self.item_mapping[item_id]
        
        # Get similarity scores
        similarities = self.item_similarity[item_idx]
        
        # Get top similar items (excluding the item itself)
        similar_indices = np.argsort(similarities)[::-1][1:n_similar+1]
        
        similar_items = [
            (self.reverse_item_mapping[idx], float(similarities[idx]))
            for idx in similar_indices
        ]
        
        return similar_items
    
    def save_model(self, filepath):
        """Save the trained model"""
        model_data = {
            'user_item_matrix': self.user_item_matrix,
            'user_similarity': self.user_similarity,
            'item_similarity': self.item_similarity,
            'svd_user_features': self.svd_user_features,
            'svd_item_features': self.svd_item_features,
            'user_mapping': self.user_mapping,
            'item_mapping': self.item_mapping,
            'reverse_user_mapping': self.reverse_user_mapping,
            'reverse_item_mapping': self.reverse_item_mapping
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath):
        """Load a trained model"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.user_item_matrix = model_data['user_item_matrix']
        self.user_similarity = model_data['user_similarity']
        self.item_similarity = model_data['item_similarity']
        self.svd_user_features = model_data['svd_user_features']
        self.svd_item_features = model_data['svd_item_features']
        self.user_mapping = model_data['user_mapping']
        self.item_mapping = model_data['item_mapping']
        self.reverse_user_mapping = model_data['reverse_user_mapping']
        self.reverse_item_mapping = model_data['reverse_item_mapping']


class ContentBasedModel:
    def __init__(self):
        self.product_features = None
        self.product_similarity = None
        self.product_mapping = {}
        self.reverse_product_mapping = {}
        
    def prepare_features(self, products_df):
        """
        Prepare product features from product data
        products_df should have: product_id, category, brand, price, attributes
        """
        from sklearn.preprocessing import StandardScaler
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        # Create product mapping
        self.product_mapping = {
            pid: idx for idx, pid in enumerate(products_df['product_id'])
        }
        self.reverse_product_mapping = {
            idx: pid for pid, idx in self.product_mapping.items()
        }
        
        # Extract features
        features_list = []
        
        # Categorical features (one-hot encoding)
        categories = pd.get_dummies(products_df['category'], prefix='cat')
        brands = pd.get_dummies(products_df['brand'], prefix='brand')
        
        # Numerical features (normalized)
        scaler = StandardScaler()
        prices = scaler.fit_transform(products_df[['price']])
        
        # Text features (TF-IDF)
        tfidf = TfidfVectorizer(max_features=100)
        descriptions = tfidf.fit_transform(
            products_df['description'].fillna('')
        ).toarray()
        
        # Combine all features
        self.product_features = np.hstack([
            categories.values,
            brands.values,
            prices,
            descriptions
        ])
        
        return self.product_features
    
    def train(self):
        """Calculate product similarity"""
        self.product_similarity = cosine_similarity(self.product_features)
        return self.product_similarity
    
    def get_similar_products(self, product_id, n_similar=10):
        """Get similar products"""
        if product_id not in self.product_mapping:
            return []
        
        product_idx = self.product_mapping[product_id]
        similarities = self.product_similarity[product_idx]
        
        # Get top similar products
        similar_indices = np.argsort(similarities)[::-1][1:n_similar+1]
        
        similar_products = [
            (self.reverse_product_mapping[idx], float(similarities[idx]))
            for idx in similar_indices
        ]
        
        return similar_products
    
    def save_model(self, filepath):
        """Save the model"""
        model_data = {
            'product_features': self.product_features,
            'product_similarity': self.product_similarity,
            'product_mapping': self.product_mapping,
            'reverse_product_mapping': self.reverse_product_mapping
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath):
        """Load the model"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.product_features = model_data['product_features']
        self.product_similarity = model_data['product_similarity']
        self.product_mapping = model_data['product_mapping']
        self.reverse_product_mapping = model_data['reverse_product_mapping']