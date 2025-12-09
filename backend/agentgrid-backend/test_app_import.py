import sys
import os

# Test if app can be imported and initialized
try:
    print("Attempting to import app...")
    from app.main import app
    print("✓ App imported successfully")
    
    print("\nApp details:")
    print(f"  Title: {app.title}")
    print(f"  Version: {app.version}")
    print(f"  Debug: {app.debug}")
    
    print("\nRegistered routes:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            print(f"  {route.methods} {route.path}")
    
    print("\n✓ App is properly configured")
    
except Exception as e:
    print(f"✗ Error importing app: {e}")
    import traceback
    traceback.print_exc()
