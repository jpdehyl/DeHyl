#!/bin/bash
# ralph.sh - Run Claude Code in a loop for autonomous development
# Usage: ./ralph.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-30}
ITERATION=0
LOG_FILE="ralph_session_$(date +%Y%m%d_%H%M%S).log"

echo "🚀 Starting Ralph Loop for DeHyl Financials"
echo "📊 Max iterations: $MAX_ITERATIONS"
echo "📝 Logging to: $LOG_FILE"
echo "-------------------------------------------"

# Check if required files exist
if [ ! -f "RALPH_PRD.md" ]; then
  echo "❌ RALPH_PRD.md not found. Please create it first."
  exit 1
fi

if [ ! -f "progress.md" ]; then
  echo "❌ progress.md not found. Please create it first."
  exit 1
fi

# Main loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo ""
  echo "🔄 [$TIMESTAMP] Iteration $ITERATION of $MAX_ITERATIONS"
  echo "-------------------------------------------"
  
  # Run Claude Code with the Ralph prompt
  OUTPUT=$(claude -p "
You are Ralph, an autonomous development agent.

INSTRUCTIONS:
1. Read progress.md to find the next incomplete user story ([ ] not [x])
2. Read RALPH_PRD.md to get the full acceptance criteria for that story
3. Implement the story completely
4. Verify: npm run lint && npm run build
5. Update progress.md to mark the story [x]
6. Commit: git add -A && git commit -m 'US-XXX: [story title]'

If ALL stories are marked [x] in progress.md, respond with exactly: RALPH_COMPLETE

IMPORTANT:
- Complete ONE story per iteration
- Follow acceptance criteria exactly
- Handle edge cases and errors as specified
- Use existing project conventions (check CLAUDE.md)

Begin by reading progress.md now.
" --allowedTools "Bash(git:*),Bash(npm:*),Bash(npx:*),Edit,Write,Read,Grep" 2>&1)
  
  # Log output
  echo "$OUTPUT" >> "$LOG_FILE"
  
  # Check for completion signal
  if echo "$OUTPUT" | grep -q "RALPH_COMPLETE"; then
    echo ""
    echo "✅ All user stories complete!"
    echo "🎉 Ralph finished after $ITERATION iterations"
    break
  fi
  
  # Check for errors that should stop the loop
  if echo "$OUTPUT" | grep -qi "fatal error\|build failed\|compilation error"; then
    echo ""
    echo "⚠️  Critical error detected. Pausing for review."
    echo "Check $LOG_FILE for details."
    read -p "Press Enter to continue or Ctrl+C to stop..."
  fi
  
  # Brief pause between iterations
  sleep 2
done

echo ""
echo "-------------------------------------------"
echo "📊 Ralph Session Summary"
echo "-------------------------------------------"
echo "Iterations completed: $ITERATION"
echo "Log file: $LOG_FILE"
echo ""

# Show progress summary
if [ -f "progress.md" ]; then
  echo "Progress:"
  grep -E "^\- \[" progress.md | head -20
fi

echo ""
echo "🏁 Ralph session ended"
