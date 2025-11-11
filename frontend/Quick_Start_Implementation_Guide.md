# AgentGrid Frontend Refactoring - Quick Start Guide
## For VS Code Copilot / Cursor AI Assistant

**Use this document with your AI coding assistant to implement all 20 steps efficiently.**

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1) - MUST DO FIRST
- [ ] **Step 1**: Create folder structure (components/ui, components/features, lib/api, lib/hooks, lib/store)
- [ ] **Step 2**: Run `npm install zustand immer react-hook-form zod @hookform/resolvers framer-motion react-hot-toast lucide-react axios react-query clsx tailwind-merge date-fns`
- [ ] **Step 3**: Update `tsconfig.json` with strict mode and path aliases
- [ ] **Step 4**: Create `tailwind.config.js` with design tokens and `globals.css` with theme variables
- [ ] **Step 5**: Create `src/lib/types/index.ts` with all TypeScript interfaces (User, Agent, Creator, Review, etc.)

**✅ After Phase 1**: You have a solid foundation with proper types and configuration

---

### Phase 2: Core Architecture (Week 2)
- [ ] **Step 6**: Create Zustand stores in `src/lib/store/` (AuthStore, AgentStore, UIStore, ExecutionStore)
- [ ] **Step 7**: Create custom hooks in `src/lib/hooks/` (useAuth, useAgents, useToast)
- [ ] **Step 8**: Create API client in `src/lib/api/client.ts` with axios and interceptors
- [ ] **Step 9**: Create reusable UI components (Button, Input, Card with all subcomponents)
- [ ] **Step 10**: Create ErrorBoundary, LoadingSpinner, and Skeleton components

**✅ After Phase 2**: You have working state management, API integration, and base components

---

### Phase 3: Features & UX (Week 3-4)
- [ ] **Step 11**: Create feature components (AgentCard with variants, SearchBar with filters, UserProfile)
- [ ] **Step 12**: Create form schemas in `src/lib/schemas/` and form components with validation
- [ ] **Step 13**: Create Toast system with ToastContainer and add to layout
- [ ] **Step 14**: Create Modal component with ConfirmDialog helper
- [ ] **Step 15**: Add accessibility (VisuallyHidden, SkipToContent, ARIA labels, keyboard navigation)

**✅ After Phase 3**: You have a complete, user-friendly interface

---

### Phase 4: Quality & Performance (Week 5-6)
- [ ] **Step 16**: Add performance optimizations (lazy loading, code splitting, intersection observer, OptimizedImage)
- [ ] **Step 17**: Implement security measures (input sanitization, rate limiting, CSRF protection)
- [ ] **Step 18**: Setup testing with Vitest and write tests for all components
- [ ] **Step 19**: Initialize Storybook and create stories for all components
- [ ] **Step 20**: Write documentation (README, CONTRIBUTING, component docs)

**✅ After Phase 4**: You have a production-ready, 10/10 quality frontend

---

## 🤖 HOW TO USE WITH AI ASSISTANT

### For Each Step:

1. **Open the main guide** and navigate to the step you're implementing
2. **Copy the "VS Code Copilot Prompt"** section
3. **Paste it into your AI assistant** (Cursor, Copilot, etc.)
4. **Review the generated code** before committing
5. **Test the implementation** before moving to next step

### Example Workflow:

```
You: [Copy VS Code Copilot Prompt from Step 1]

AI: [Generates folder structure and index files]

You: Great! Now show me Step 2's prompt.

You: [Copy VS Code Copilot Prompt from Step 2]

AI: [Updates package.json and generates install commands]

... continue for all 20 steps
```

---

## 🎯 PRIORITY LEVELS

### P0 - Critical (Do First)
- Steps 1-8: Foundation and core architecture
- Without these, nothing else will work properly

### P1 - Important (Do Next)
- Steps 9-13: UI components, forms, and notifications
- Core user-facing features

### P2 - Nice-to-Have (Do Last)
- Steps 14-20: Advanced features, testing, and documentation
- Important for production but not blocking

---

## 📝 QUICK COMMANDS REFERENCE

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Run Prettier
```

### Testing
```bash
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run test:coverage    # Generate coverage report
```

### Storybook
```bash
npm run storybook        # Start Storybook
npm run build-storybook  # Build Storybook
```

---

## 🔧 COMMON AI ASSISTANT PROMPTS

### Creating a New Component
```
Create a new component at [path] with the following requirements:
1. TypeScript with proper types
2. forwardRef for ref support
3. Tailwind styling with cn() utility
4. ARIA labels for accessibility
5. Unit test file
6. Storybook story

Component specs:
[Your requirements here]
```

### Refactoring an Existing Component
```
Refactor the component at [path] to:
1. Split into smaller sub-components
2. Extract business logic to custom hooks
3. Add proper error handling
4. Improve TypeScript types
5. Add loading states
6. Optimize performance (memo, useMemo)

Current code:
[Paste current code]
```

### Adding Form Validation
```
Create a Zod schema and form component for [form name] with fields:
- [field 1]: [type] with [validation rules]
- [field 2]: [type] with [validation rules]

Requirements:
- Use react-hook-form with zodResolver
- Display validation errors inline
- Add loading state during submission
- Show success/error toast after submission
```

### Writing Tests
```
Write comprehensive tests for [component name] covering:
1. Rendering with different props
2. User interactions (click, type, etc.)
3. Loading and error states
4. Accessibility (keyboard navigation, ARIA)
5. Edge cases

Component code:
[Paste component code]
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue: "Cannot find module '@/components/ui/Button'"
**Solution**: Ensure path aliases are set in both `tsconfig.json` and `vitest.config.ts`

### Issue: Tailwind classes not working
**Solution**: Check that `globals.css` is imported in your root layout and Tailwind is configured correctly

### Issue: Zustand store not persisting
**Solution**: Verify the store name in persist middleware and check browser storage

### Issue: Tests failing with "Cannot find module"
**Solution**: Add proper aliases in `vitest.config.ts` and mock Next.js modules in test setup

### Issue: Storybook not loading styles
**Solution**: Import `globals.css` in `.storybook/preview.tsx`

---

## ✅ QUALITY CHECKLIST (Before Moving to Next Step)

After completing each step, verify:

- [ ] **Code Quality**
  - No TypeScript errors (`npm run type-check`)
  - No ESLint errors (`npm run lint`)
  - Code is formatted (`npm run format`)

- [ ] **Functionality**
  - Component renders without errors
  - All props work as expected
  - Interactions work correctly

- [ ] **Accessibility**
  - Keyboard navigation works
  - ARIA labels are present
  - Focus indicators are visible
  - Works with screen reader (if applicable)

- [ ] **Testing**
  - Unit tests pass (`npm test`)
  - Coverage is adequate (>80% for critical components)

- [ ] **Documentation**
  - Component has JSDoc comments
  - Storybook story exists
  - README is updated (if needed)

---

## 🎓 LEARNING RESOURCES

While implementing, refer to:

- **TypeScript**: https://www.typescriptlang.org/docs/
- **React**: https://react.dev/
- **Next.js**: https://nextjs.org/docs
- **Tailwind**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Storybook**: https://storybook.js.org/docs/react/get-started/introduction

---

## 📊 PROGRESS TRACKING

### Week 1: Foundation ⬜
- [ ] Step 1: Project structure
- [ ] Step 2: Dependencies
- [ ] Step 3: TypeScript config
- [ ] Step 4: Tailwind design system
- [ ] Step 5: Type definitions

### Week 2: Core Architecture ⬜
- [ ] Step 6: State management
- [ ] Step 7: Custom hooks
- [ ] Step 8: API client
- [ ] Step 9: UI components
- [ ] Step 10: Error handling

### Week 3-4: Features ⬜
- [ ] Step 11: Feature components
- [ ] Step 12: Form validation
- [ ] Step 13: Notifications
- [ ] Step 14: Modals
- [ ] Step 15: Accessibility

### Week 5-6: Quality ⬜
- [ ] Step 16: Performance
- [ ] Step 17: Security
- [ ] Step 18: Testing
- [ ] Step 19: Storybook
- [ ] Step 20: Documentation

---

## 🎉 YOU'RE READY!

Start with **Step 1** from the main guide and work your way through. Use your AI assistant to generate code, but always review and test before moving forward.

**Remember**: Quality over speed. It's better to do 5 steps perfectly than 20 steps poorly.

Good luck! 🚀
