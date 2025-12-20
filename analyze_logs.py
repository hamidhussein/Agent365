
import re

def analyze_logs():
    try:
        with open("debug_logs.txt", "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        matches = re.finditer(r"ResponseValidationError", content)
        for match in matches:
            start = match.start()
            # Print 500 characters around the error to capture the full context
            print("-" * 50)
            print(content[start:start+1000])
            print("-" * 50)
            
    except Exception as e:
        print(f"Error reading logs: {e}")

if __name__ == "__main__":
    analyze_logs()
