import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pickle
import os

class FraudDetectionModel:
    def __init__(self):
        self.isolation_forest = None
        self.random_forest = None
        self.scaler = StandardScaler()
        self.feature_columns = []
        
    def prepare_features(self, transactions_df):
        """
        Extract features from transaction data
        Expected columns: order_id, user_id, amount, num_items, shipping_address, 
                         payment_method, user_age_days, previous_orders, time_since_last_order
        """
        features = []
        
        # Transaction amount features
        features.append(transactions_df['amount'])
        features.append(transactions_df['num_items'])
        features.append(transactions_df['amount'] / transactions_df['num_items'])  # avg item price
        
        # User behavior features
        features.append(transactions_df['user_age_days'])
        features.append(transactions_df['previous_orders'])
        features.append(transactions_df['time_since_last_order'])
        
        # Time-based features
        transactions_df['hour'] = pd.to_datetime(transactions_df['timestamp']).dt.hour
        transactions_df['day_of_week'] = pd.to_datetime(transactions_df['timestamp']).dt.dayofweek
        features.append(transactions_df['hour'])
        features.append(transactions_df['day_of_week'])
        
        # Combine features
        feature_matrix = np.column_stack(features)
        
        self.feature_columns = [
            'amount', 'num_items', 'avg_item_price', 'user_age_days',
            'previous_orders', 'time_since_last_order', 'hour', 'day_of_week'
        ]
        
        return feature_matrix
    
    def train_isolation_forest(self, features, contamination=0.01):
        """
        Train Isolation Forest for anomaly detection
        contamination: expected proportion of outliers
        """
        self.isolation_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        # Normalize features
        features_scaled = self.scaler.fit_transform(features)
        
        # Train
        self.isolation_forest.fit(features_scaled)
        
        return self.isolation_forest
    
    def train_supervised(self, features, labels):
        """
        Train supervised model (Random Forest) with labeled fraud data
        """
        self.random_forest = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        
        # Normalize features
        features_scaled = self.scaler.fit_transform(features)
        
        # Train
        self.random_forest.fit(features_scaled, labels)
        
        return self.random_forest
    
    def predict_fraud_probability(self, transaction_features):
        """
        Predict fraud probability for a transaction
        Returns: fraud_score (0-1), is_anomaly (bool), risk_level (low/medium/high)
        """
        features_scaled = self.scaler.transform([transaction_features])
        
        # Isolation Forest prediction (-1 for anomaly, 1 for normal)
        if_prediction = self.isolation_forest.predict(features_scaled)[0]
        is_anomaly = if_prediction == -1
        
        # Anomaly score (lower = more anomalous)
        anomaly_score = self.isolation_forest.score_samples(features_scaled)[0]
        
        # Convert to probability (0-1 scale)
        # Anomaly scores are typically negative, normalize to 0-1
        fraud_probability = 1 / (1 + np.exp(anomaly_score))
        
        # If supervised model exists, combine predictions
        if self.random_forest is not None:
            rf_proba = self.random_forest.predict_proba(features_scaled)[0][1]
            fraud_probability = (fraud_probability + rf_proba) / 2
        
        # Determine risk level
        if fraud_probability >= 0.7:
            risk_level = 'high'
        elif fraud_probability >= 0.4:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'fraud_probability': float(fraud_probability),
            'is_anomaly': bool(is_anomaly),
            'risk_level': risk_level,
            'anomaly_score': float(anomaly_score)
        }
    
    def explain_prediction(self, transaction_features):
        """
        Provide explanation for fraud prediction
        """
        if self.random_forest is None:
            return {}
        
        features_scaled = self.scaler.transform([transaction_features])
        
        # Get feature importance
        feature_importance = self.random_forest.feature_importances_
        
        # Get top contributing features
        importance_dict = {
            feature: importance 
            for feature, importance in zip(self.feature_columns, feature_importance)
        }
        
        sorted_features = sorted(
            importance_dict.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        
        return {
            'top_risk_factors': [
                {'feature': feature, 'importance': float(importance)}
                for feature, importance in sorted_features
            ]
        }
    
    def save_model(self, filepath):
        """Save the trained model"""
        model_data = {
            'isolation_forest': self.isolation_forest,
            'random_forest': self.random_forest,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath):
        """Load a trained model"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.isolation_forest = model_data['isolation_forest']
        self.random_forest = model_data.get('random_forest')
        self.scaler = model_data['scaler']
        self.feature_columns = model_data['feature_columns']