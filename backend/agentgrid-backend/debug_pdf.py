import os
import tempfile
import subprocess
import sys

def test_execution(code):
    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = os.path.join(tmpdir, "script.py")
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(code)
        
        print(f"Running code in {tmpdir} using {sys.executable}...")
        result = subprocess.run(
            [sys.executable, code_file],
            cwd=tmpdir,
            capture_output=True,
            text=True,
            timeout=30
        )
        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")

code = """
from fpdf import FPDF
try:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('helvetica', size=12)
    pdf.cell(text='Hello World')
    pdf.output('test.pdf')
    print('SUCCESS')
except Exception as e:
    import traceback
    print('FAILURE')
    traceback.print_exc()
"""

if __name__ == "__main__":
    test_execution(code)
