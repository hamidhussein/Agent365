"""
Quick test to verify Code Execution capability string is correctly generated
"""
import sys
sys.path.append('d:/Axeecom/AgentGrid/backend/agentgrid-backend')

from app.services.creator_studio import build_system_instruction

# Test with code execution enabled
instruction = "Test agent"
context_chunks = []
inputs_context = None
capabilities = {"codeExecution": True}

result = build_system_instruction(instruction, context_chunks, inputs_context, capabilities)

print("=" * 80)
print("GENERATED SYSTEM INSTRUCTION:")
print("=" * 80)
print(result)
print("=" * 80)

if "FEATURE ENABLED: Code Execution" in result:
    print("✓ Code Execution feature marker FOUND")
else:
    print("✗ Code Execution feature marker NOT FOUND")
    print("\nSearching for variations...")
    if "code execution" in result.lower():
        print("  - Found 'code execution' (case insensitive)")
    if "Code Execution" in result:
        print("  - Found 'Code Execution'")
    if "FEATURE ENABLED" in result:
        print("  - Found 'FEATURE ENABLED'")
