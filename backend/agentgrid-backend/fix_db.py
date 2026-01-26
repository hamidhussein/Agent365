from app.db.session import SessionLocal
from sqlalchemy import text

def check_and_fix():
    db = SessionLocal()
    try:
        # Check if column exists
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='agent_executions' AND column_name='review_priority';"))
        if not res.fetchone():
            print("Column 'review_priority' missing. Adding...")
            db.execute(text("ALTER TABLE agent_executions ADD COLUMN review_priority VARCHAR(50) DEFAULT 'standard';"))
            db.commit()
            print("Successfully added column.")
        else:
            print("Column 'review_priority' already exists.")
            
        # Also check for reviewer_id
        res = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='agent_executions' AND column_name='reviewer_id';"))
        if not res.fetchone():
            print("Column 'reviewer_id' missing. Adding...")
            # reviewer_id is a UUID referencing users
            db.execute(text("ALTER TABLE agent_executions ADD COLUMN reviewer_id UUID REFERENCES users(id);"))
            db.commit()
            print("Successfully added reviewer_id column.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_fix()
