from app.db.session import SessionLocal
from sqlalchemy import text

def check_and_fix():
    db = SessionLocal()
    try:
        # Phase 2: Advanced Workflow Columns
        new_columns = [
            ("priority", "TEXT DEFAULT 'normal'"),
            ("assigned_to", "UUID REFERENCES users(id)"),
            ("sla_deadline", "TIMESTAMP"),
            ("internal_notes", "TEXT"),
            ("quality_score", "INTEGER")
        ]
        
        for col_name, col_type in new_columns:
            res = db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='agent_executions' AND column_name='{col_name}';"))
            if not res.fetchone():
                print(f"Column '{col_name}' missing. Adding...")
                db.execute(text(f"ALTER TABLE agent_executions ADD COLUMN {col_name} {col_type};"))
                db.commit()
                print(f"Successfully added {col_name}.")
            else:
                print(f"Column '{col_name}' already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_fix()
