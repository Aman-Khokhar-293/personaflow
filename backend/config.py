"""
PersonaFlow Configuration
"""
import os

class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'personaflow-secret-key-change-in-production')
    
    # Database
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///personaflow.db')
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    if 'pgbouncer=' in db_url:
        import urllib.parse as urlparse
        url_parts = list(urlparse.urlparse(db_url))
        query = urlparse.parse_qs(url_parts[4])
        query.pop('pgbouncer', None)
        url_parts[4] = urlparse.urlencode(query, doseq=True)
        db_url = urlparse.urlunparse(url_parts)
        
    SQLALCHEMY_DATABASE_URI = db_url
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
