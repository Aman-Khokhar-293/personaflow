"""
PersonaFlow Database Models
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_color = db.Column(db.String(7), default='#6366f1')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    agents = db.relationship('Agent', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar_color': self.avatar_color,
            'created_at': self.created_at.isoformat()
        }

class Agent(db.Model):
    __tablename__ = 'agents'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Identity (Step 1)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.Text)
    opening_message = db.Column(db.Text)
    
    # Behavior (Step 2)
    task_description = db.Column(db.Text)
    rules = db.Column(db.Text)  # JSON array of rules
    tone = db.Column(db.String(50), default='professional')
    knowledge = db.Column(db.Text)
    
    # Output (Step 3)
    output_config = db.Column(db.Text)  # JSON: {summary, transcript, report, evaluation, criteria}
    
    # Customize (Step 4)
    icon = db.Column(db.String(10), default='🤖')
    color = db.Column(db.String(7), default='#6366f1')
    status = db.Column(db.String(20), default='active')
    
    # Agent Type & System Fields
    agent_type = db.Column(db.String(20), default='conversation')  # 'conversation' or 'anchoring'
    is_default = db.Column(db.Boolean, default=False)  # True for system-created default agents
    script_content = db.Column(db.Text)  # Anchoring script text (line-by-line)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    conversations = db.relationship('Conversation', backref='agent', lazy=True, cascade='all, delete-orphan')
    share_links = db.relationship('ShareLink', backref='agent', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'role': self.role,
            'goal': self.goal,
            'opening_message': self.opening_message,
            'task_description': self.task_description,
            'rules': json.loads(self.rules) if self.rules else [],
            'tone': self.tone,
            'knowledge': self.knowledge,
            'output_config': json.loads(self.output_config) if self.output_config else {},
            'icon': self.icon,
            'color': self.color,
            'status': self.status,
            'agent_type': self.agent_type or 'conversation',
            'is_default': self.is_default or False,
            'script_content': self.script_content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'conversation_count': len(self.conversations),
            'share_link_count': len(self.share_links)
        }

class Conversation(db.Model):
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Null for public access
    share_link_id = db.Column(db.Integer, db.ForeignKey('share_links.id'), nullable=True)
    
    participant_name = db.Column(db.String(100))
    participant_email = db.Column(db.String(120))
    mode = db.Column(db.String(20), default='text')  # 'text' or 'video'
    status = db.Column(db.String(20), default='active')  # 'active' or 'completed'
    
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    
    # Relationships
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan', order_by='Message.timestamp')
    report = db.relationship('Report', backref='conversation', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'agent_name': self.agent.name if self.agent else None,
            'agent_icon': self.agent.icon if self.agent else None,
            'agent_color': self.agent.color if self.agent else None,
            'participant_name': self.participant_name,
            'participant_email': self.participant_email,
            'mode': self.mode,
            'status': self.status,
            'started_at': self.started_at.isoformat(),
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'message_count': len(self.messages),
            'has_report': self.report is not None
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'agent'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }

class ShareLink(db.Model):
    __tablename__ = 'share_links'
    
    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agents.id'), nullable=False)
    
    token = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(100))  # Optional label for the link
    password_hash = db.Column(db.String(256))
    expires_at = db.Column(db.DateTime)
    max_uses = db.Column(db.Integer)
    current_uses = db.Column(db.Integer, default=0)
    require_name = db.Column(db.Boolean, default=True)
    require_email = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    conversations = db.relationship('Conversation', backref='share_link', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'agent_name': self.agent.name if self.agent else None,
            'token': self.token,
            'name': self.name or '',
            'has_password': self.password_hash is not None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'max_uses': self.max_uses,
            'current_uses': self.current_uses,
            'require_name': self.require_name,
            'require_email': self.require_email,
            'created_at': self.created_at.isoformat(),
            'is_expired': self.expires_at and datetime.utcnow() > self.expires_at,
            'is_maxed': self.max_uses and self.current_uses >= self.max_uses
        }

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    
    overall_score = db.Column(db.Float)
    criteria_scores = db.Column(db.Text)  # JSON: {criteria_name: score}
    summary = db.Column(db.Text)
    feedback = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    transcript = db.Column(db.Text)  # JSON array of messages
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'overall_score': self.overall_score,
            'criteria_scores': json.loads(self.criteria_scores) if self.criteria_scores else {},
            'summary': self.summary,
            'feedback': self.feedback,
            'recommendations': self.recommendations,
            'transcript': json.loads(self.transcript) if self.transcript else [],
            'created_at': self.created_at.isoformat()
        }
