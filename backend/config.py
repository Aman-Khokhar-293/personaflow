"""
PersonaFlow Configuration
"""
import os

class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'personaflow-secret-key-change-in-production')
    
    # Database — strip whitespace/newlines from env var
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///personaflow.db').strip()
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    if 'pgbouncer=' in db_url:
        import urllib.parse as urlparse
        url_parts = list(urlparse.urlparse(db_url))
        query = urlparse.parse_qs(url_parts[4])
        query.pop('pgbouncer', None)
        url_parts[4] = urlparse.urlencode(query, doseq=True)
        db_url = urlparse.urlunparse(url_parts)

    # For Supabase pooler connections: add sslmode if not present
    _is_pg = db_url.startswith('postgresql')
    if _is_pg and 'pooler.supabase.com' in db_url and 'sslmode' not in db_url:
        db_url += ('&' if '?' in db_url else '?') + 'sslmode=require'

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Engine options for Supabase PgBouncer compatibility
    if _is_pg:
        SQLALCHEMY_ENGINE_OPTIONS = {
            'connect_args': {
                'connect_timeout': 10,
                'options': '-c client_encoding=UTF8',
            },
            'pool_pre_ping': True,
            'pool_recycle': 300,
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {}
    
    # OpenRouter Settings
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openrouter/auto')
    
    # Session - Fixed for proper cookie handling
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
