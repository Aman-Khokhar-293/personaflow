"""
PersonaFlow Scoring Service
Uses spaCy for response evaluation and scoring
"""
import json

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None
    print("Warning: spaCy model not loaded. Scoring will use basic metrics.")

class ScoringService:
    def __init__(self):
        self.nlp = nlp
    
    def evaluate_conversation(self, agent, messages):
        """
        Evaluate conversation based on agent's criteria
        Returns overall score and per-criteria scores
        """
        output_config = json.loads(agent.output_config) if agent.output_config else {}
        criteria = output_config.get('criteria', [])
        
        if not criteria:
            # Default evaluation if no criteria defined
            return self._default_evaluation(messages)
        
        user_messages = [m for m in messages if m.role == 'user']
        agent_messages = [m for m in messages if m.role == 'agent']
        
        criteria_scores = {}
        total_weight = 0
        weighted_sum = 0
        
        for criterion in criteria:
            name = criterion.get('name', 'Unknown')
            weight = criterion.get('weight', 1)
            score = self._evaluate_criterion(criterion, user_messages, agent_messages)
            
            criteria_scores[name] = score
            weighted_sum += score * weight
            total_weight += weight
        
        overall_score = weighted_sum / total_weight if total_weight > 0 else 0
        
        return {
            'overall_score': round(overall_score, 1),
            'criteria_scores': criteria_scores
        }
    
    def _evaluate_criterion(self, criterion, user_messages, agent_messages):
        """Evaluate a single criterion"""
        name = criterion.get('name', '').lower()
        
        # Use different evaluation methods based on criterion type
        if 'communication' in name or 'clarity' in name:
            return self._evaluate_communication(user_messages)
        elif 'engagement' in name or 'participation' in name:
            return self._evaluate_engagement(user_messages)
        elif 'knowledge' in name or 'technical' in name:
            return self._evaluate_knowledge(user_messages)
        elif 'response' in name or 'quality' in name:
            return self._evaluate_response_quality(user_messages)
        else:
            return self._evaluate_general(user_messages)
    
    def _evaluate_communication(self, messages):
        """Evaluate communication quality"""
        if not messages:
            return 50
        
        scores = []
        for msg in messages:
            content = msg.content
            
            # Base score
            score = 60
            
            # Length bonus (not too short, not too long)
            word_count = len(content.split())
            if 10 <= word_count <= 200:
                score += 15
            elif 5 <= word_count < 10 or 200 < word_count <= 300:
                score += 8
            
            # Sentence structure using spaCy if available
            if self.nlp:
                doc = self.nlp(content)
                sentences = list(doc.sents)
                if len(sentences) >= 2:
                    score += 10
                
                # Check for proper nouns, named entities (shows specificity)
                if len(doc.ents) > 0:
                    score += 5
            
            # Punctuation check
            if content.strip().endswith(('.', '?', '!')):
                score += 5
            
            # Cap at 100
            scores.append(min(score, 100))
        
        return sum(scores) / len(scores) if scores else 50
    
    def _evaluate_engagement(self, messages):
        """Evaluate user engagement level"""
        if not messages:
            return 50
        
        # More messages = more engagement
        message_count = len(messages)
        base_score = min(40 + (message_count * 5), 75)
        
        # Average message length shows effort
        avg_length = sum(len(m.content.split()) for m in messages) / len(messages)
        if avg_length > 15:
            base_score += 15
        elif avg_length > 8:
            base_score += 8
        
        # Questions show curiosity
        question_count = sum(1 for m in messages if '?' in m.content)
        base_score += min(question_count * 3, 10)
        
        return min(base_score, 100)
    
    def _evaluate_knowledge(self, messages):
        """Evaluate demonstrated knowledge"""
        if not messages:
            return 50
        
        score = 55
        
        for msg in messages:
            content = msg.content.lower()
            
            # Length indicates depth
            word_count = len(content.split())
            if word_count > 30:
                score += 3
            
            # Technical terms or jargon (simplified check)
            if self.nlp:
                doc = self.nlp(msg.content)
                # Named entities often indicate specific knowledge
                score += min(len(doc.ents) * 2, 10)
        
        return min(score, 100)
    
    def _evaluate_response_quality(self, messages):
        """Evaluate overall response quality"""
        if not messages:
            return 50
        
        scores = []
        for msg in messages:
            content = msg.content
            score = 55
            
            # Completeness
            word_count = len(content.split())
            if word_count >= 15:
                score += 15
            elif word_count >= 8:
                score += 8
            
            # Coherence (simplified)
            if self.nlp:
                doc = self.nlp(content)
                sentences = list(doc.sents)
                if len(sentences) >= 1:
                    score += 10
                
                # Has verbs (complete thoughts)
                verbs = [token for token in doc if token.pos_ == 'VERB']
                if verbs:
                    score += 10
            
            scores.append(min(score, 100))
        
        return sum(scores) / len(scores) if scores else 50
    
    def _evaluate_general(self, messages):
        """General evaluation for undefined criteria"""
        if not messages:
            return 50
        
        # Combine multiple factors
        comm_score = self._evaluate_communication(messages)
        engage_score = self._evaluate_engagement(messages)
        
        return (comm_score + engage_score) / 2
    
    def _default_evaluation(self, messages):
        """Default evaluation when no criteria defined"""
        user_messages = [m for m in messages if m.role == 'user']
        
        if not user_messages:
            return {
                'overall_score': 50,
                'criteria_scores': {
                    'Participation': 50,
                    'Communication': 50
                }
            }
        
        return {
            'overall_score': round(self._evaluate_general(user_messages), 1),
            'criteria_scores': {
                'Participation': round(self._evaluate_engagement(user_messages), 1),
                'Communication': round(self._evaluate_communication(user_messages), 1)
            }
        }

# Global instance
scoring_service = ScoringService()
