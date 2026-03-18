"""Quick migration to add anchoring columns to agents table"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'personaflow.db')
print(f"DB path: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get existing columns
cursor.execute('PRAGMA table_info(agents)')
columns = [col[1] for col in cursor.fetchall()]
print(f"Existing columns: {columns}")

# Add missing columns
migrations = [
    ('agent_type', 'ALTER TABLE agents ADD COLUMN agent_type VARCHAR(20) DEFAULT "conversation"'),
    ('is_default', 'ALTER TABLE agents ADD COLUMN is_default BOOLEAN DEFAULT 0'),
    ('script_content', 'ALTER TABLE agents ADD COLUMN script_content TEXT'),
]

for col_name, sql in migrations:
    if col_name not in columns:
        print(f"Adding column: {col_name}")
        cursor.execute(sql)
    else:
        print(f"Column already exists: {col_name}")

conn.commit()
conn.close()
print("Migration complete!")
