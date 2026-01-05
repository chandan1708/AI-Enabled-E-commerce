import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.fraud_detection_model import FraudDetectionModel
from config.database import get_db_connection
from datetime import datetime
import numpy as np

class FraudService:
    def __init__(self):
        self.model = FraudDetectionModel()
        self.load_model()
    
    def load_model(self):
        """Load pre-trained fraud detection model"""
        try:
            self.model.load_model('models/saved_models/fraud_model.pkl')
            print("Fraud detection model loaded successfully")
        except Exception as e:
            print(f"Error loading fraud model: {e}")
    
    def check_transaction(self, transaction_data):
        """
        Check a transaction for fraud
        
        Expected fields:
        - user_id
        - amount
        - num_items
        - shipping_address
        - payment_method
        """
        try:
            # Extract features
            features = self._extract_features(transaction_data)
            
            # Get prediction
            prediction = self.model.predict_fraud_probability(features)
            
            # Get explanation
            explanation = self.model.explain_prediction(features)
            
            # Additional rule-based checks
            rule_checks = self._apply_rule_based_checks(transaction_data, features)
            
            # Combine results
            result = {
                **prediction,
                'explanation': explanation,
                'rule_violations': rule_checks,
                'recommendation': self._get_recommendation(prediction, rule_checks)
            }
            
            return result
            
        except Exception as e:
            print(f"Error in check_transaction: {e}")
            return {
                'error': str(e),
                'fraud_probability': 0.5,
                'risk_level': 'unknown',
                'recommendation': 'manual_review'
            }
    
    def _extract_features(self, transaction_data):
        """Extract features from transaction data"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        user_id = transaction_data['user_id']
        
        # Get user history
        cursor.execute("""
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(MAX(created_at), NOW()) as last_order_date,
                created_at as registration_date
            FROM orders
            WHERE user_id = %s
        """, (user_id,))
        
        user_history = cursor.fetchone()
        
        cursor.execute("""
            SELECT created_at FROM users WHERE id = %s
        """, (user_id,))
        
        user_registration = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Calculate features
        amount = float(transaction_data['amount'])
        num_items = int(transaction_data.get('num_items', 1))
        
        user_age_days = 0
        previous_orders = 0
        time_since_last_order = 999999
        
        if user_registration:
            user_age_days = (datetime.now() - user_registration[0]).days
        
        if user_history:
            previous_orders = user_history[0] or 0
            if user_history[1]:
                time_since_last_order = (datetime.now() - user_history[1]).total_seconds() / 3600
        
        features = [
            amount,
            num_items,
            amount / num_items,  # avg item price
            user_age_days,
            previous_orders,
            time_since_last_order,
            datetime.now().hour,
            datetime.now().weekday()
        ]
        
        return features
    
    def _apply_rule_based_checks(self, transaction_data, features):
        """Apply rule-based fraud checks"""
        violations = []
        
        amount = features[0]
        num_items = features[1]
        user_age_days = features[3]
        previous_orders = features[4]
        hour = features[6]
        
        # High value transaction
        if amount > 50000:
            violations.append({
                'rule': 'high_value_transaction',
                'severity': 'high',
                'message': f'Transaction amount (₹{amount}) exceeds threshold'
            })
        
        # New account with high value
        if user_age_days < 7 and amount > 10000:
            violations.append({
                'rule': 'new_account_high_value',
                'severity': 'high',
                'message': 'New account with high-value transaction'
            })
        
        # Unusual time
        if hour < 5 or hour > 23:
            violations.append({
                'rule': 'unusual_time',
                'severity': 'low',
                'message': f'Transaction at unusual hour ({hour}:00)'
            })
        
        # First transaction high value
        if previous_orders == 0 and amount > 5000:
            violations.append({
                'rule': 'first_transaction_high_value',
                'severity': 'medium',
                'message': 'First transaction with high value'
            })
        
        # Velocity check (would need more data)
        # Multiple transactions in short time
        
        return violations
    
    def _get_recommendation(self, prediction, rule_violations):
        """Get recommendation based on prediction and rules"""
        risk_level = prediction['risk_level']
        fraud_prob = prediction['fraud_probability']
        high_severity_violations = [
            v for v in rule_violations if v['severity'] == 'high'
        ]
        
        if risk_level == 'high' or len(high_severity_violations) >= 2:
            return 'block'
        elif risk_level == 'medium' or len(high_severity_violations) >= 1:
            return 'manual_review'
        elif fraud_prob > 0.3:
            return '3ds_authentication'  # Require additional authentication
        else:
            return 'approve'