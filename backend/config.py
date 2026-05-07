"""
PersonaFlow Configuration
"""
import os

class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'personaflow-secret-key-change-in-production')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///personaflow.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OpenRouter Settings
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openrouter/auto')
    
    # Session - Fixed for proper cookie handling
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
