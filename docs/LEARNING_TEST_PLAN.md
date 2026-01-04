# Learning Module Test Plan

## Overview
This document outlines test cases for the Learning Module (Lekledarutbildning) based on acceptance criteria from the specification.

---

## 1. Database Layer Tests

### 1.1 RLS Policies

#### Test: System admin can CRUD global courses
```sql
-- As system admin
SELECT * FROM learning_courses WHERE tenant_id IS NULL;
-- Expected: Returns all global courses

INSERT INTO learning_courses (slug, title, status, pass_score)
VALUES ('test-course', 'Test Course', 'draft', 80);
-- Expected: Succeeds

UPDATE learning_courses SET status = 'active' WHERE slug = 'test-course';
-- Expected: Succeeds

DELETE FROM learning_courses WHERE slug = 'test-course';
-- Expected: Succeeds
```

#### Test: Tenant admin can manage tenant-scoped courses
```sql
-- As tenant admin for tenant X
INSERT INTO learning_courses (tenant_id, slug, title, status, pass_score)
VALUES ('tenant-x-uuid', 'tenant-course', 'Tenant Course', 'draft', 70);
-- Expected: Succeeds

SELECT * FROM learning_courses WHERE tenant_id = 'tenant-y-uuid';
-- Expected: Returns empty (no cross-tenant access)
```

#### Test: Regular user can only read active courses
```sql
-- As regular user in tenant X
SELECT * FROM learning_courses WHERE status = 'active';
-- Expected: Returns global + tenant-X active courses

INSERT INTO learning_courses (slug, title, status, pass_score)
VALUES ('hack-attempt', 'Hacked', 'active', 0);
-- Expected: Fails (permission denied)
```

### 1.2 Helper Functions

#### Test: learning_course_completed returns correct status
```sql
SELECT learning_course_completed('user-uuid', 'tenant-uuid', 'course-uuid');
-- Expected: false (no progress)

INSERT INTO learning_user_progress (user_id, tenant_id, course_id, status)
VALUES ('user-uuid', 'tenant-uuid', 'course-uuid', 'completed');

SELECT learning_course_completed('user-uuid', 'tenant-uuid', 'course-uuid');
-- Expected: true
```

#### Test: learning_prerequisites_met checks path edges
```sql
-- Given: Path with A -> B edge (A is prerequisite for B)
-- When: User has not completed A
SELECT learning_prerequisites_met('user-uuid', 'tenant-uuid', 'path-uuid', 'course-b-uuid');
-- Expected: false

-- When: User completes A
UPDATE learning_user_progress SET status = 'completed' 
WHERE user_id = 'user-uuid' AND course_id = 'course-a-uuid';

SELECT learning_prerequisites_met('user-uuid', 'tenant-uuid', 'path-uuid', 'course-b-uuid');
-- Expected: true
```

#### Test: learning_get_unsatisfied_requirements returns correct list
```sql
-- Given: Requirement that game X requires course Y
INSERT INTO learning_requirements (requirement_type, target_ref, required_course_id)
VALUES ('game_unlock', '{"kind": "game", "id": "game-x-uuid"}', 'course-y-uuid');

-- When: User hasn't completed course Y
SELECT * FROM learning_get_unsatisfied_requirements('user-uuid', 'tenant-uuid', 'game', 'game-x-uuid');
-- Expected: Returns row with course-y-uuid

-- When: User completes course Y
INSERT INTO learning_user_progress (user_id, tenant_id, course_id, status)
VALUES ('user-uuid', 'tenant-uuid', 'course-y-uuid', 'completed');

SELECT * FROM learning_get_unsatisfied_requirements('user-uuid', 'tenant-uuid', 'game', 'game-x-uuid');
-- Expected: Returns empty
```

---

## 2. API Layer Tests

### 2.1 Course CRUD

#### Test: GET /api/learning/courses returns tenant-scoped list
```typescript
// Given: User authenticated in tenant X
// When: Fetching courses
const response = await fetch('/api/learning/courses');
const courses = await response.json();

// Then: Returns global + tenant X courses only
expect(courses.every(c => c.tenant_id === null || c.tenant_id === tenantX)).toBe(true);
```

#### Test: POST /api/learning/courses validates required fields
```typescript
// When: Missing required fields
const response = await fetch('/api/learning/courses', {
  method: 'POST',
  body: JSON.stringify({ title: 'Missing fields' })
});

// Then: Returns 400 with validation errors
expect(response.status).toBe(400);
const error = await response.json();
expect(error.errors).toContain('slug is required');
expect(error.errors).toContain('pass_score is required');
```

### 2.2 Quiz Submission

#### Test: POST /api/learning/courses/[id]/submit calculates score correctly
```typescript
// Given: Course with 4 questions, each worth 25 points
// When: User answers 3 correctly
const response = await fetch(`/api/learning/courses/${courseId}/submit`, {
  method: 'POST',
  body: JSON.stringify({
    answers: [
      { questionId: 'q1', answer: 'correct' },
      { questionId: 'q2', answer: 'correct' },
      { questionId: 'q3', answer: 'wrong' },
      { questionId: 'q4', answer: 'correct' }
    ]
  })
});

const result = await response.json();
expect(result.score).toBe(75);
expect(result.passed).toBe(course.pass_score <= 75);
```

#### Test: Rewards granted only once (idempotency)
```typescript
// Given: User completes course with rewards
const result1 = await submitQuiz(courseId, correctAnswers);
expect(result1.rewards).toEqual({ dicecoin: 100, xp: 50 });

// When: User submits again
const result2 = await submitQuiz(courseId, correctAnswers);

// Then: Rewards not re-granted
expect(result2.rewards).toBeUndefined();
expect(result2.message).toContain('already completed');
```

---

## 3. UI Component Tests

### 3.1 Admin Course Editor

#### Test: Content section CRUD
```typescript
// Given: Course editor rendered
render(<CourseEditor course={mockCourse} />);

// When: Adding new text section
await user.click(screen.getByText('Add Section'));
await user.click(screen.getByText('Text'));
await user.type(screen.getByLabelText('Title'), 'Introduction');

// Then: Section appears in list
expect(screen.getByText('Introduction')).toBeInTheDocument();
```

#### Test: Quiz question builder
```typescript
// Given: Course editor on Quiz tab
render(<CourseEditor course={mockCourse} />);
await user.click(screen.getByRole('tab', { name: 'Quiz' }));

// When: Adding multiple choice question
await user.click(screen.getByText('Add Question'));
await user.type(screen.getByLabelText('Question'), 'What is X?');
await user.click(screen.getByText('Add Option'));
await user.type(screen.getByLabelText('Option 1'), 'Answer A');
await user.click(screen.getByLabelText('Correct'));

// Then: Question saved with correct answer
expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
  quiz_json: expect.arrayContaining([
    expect.objectContaining({
      question: 'What is X?',
      options: [{ text: 'Answer A', isCorrect: true }]
    })
  ])
}));
```

### 3.2 Path Graph Builder

#### Test: Nodes can be positioned via drag-drop
```typescript
// Given: Path builder with existing nodes
render(<PathBuilder path={mockPath} />);

// When: Dragging node to new position
const node = screen.getByTestId('node-course-a');
await dragTo(node, { x: 200, y: 150 });

// Then: Position updated
expect(mockUpdateNode).toHaveBeenCalledWith('course-a', { position: { x: 200, y: 150 } });
```

#### Test: Edges can be created by connecting nodes
```typescript
// Given: Path builder with two nodes
render(<PathBuilder path={mockPath} />);

// When: Drawing edge from A to B
const nodeA = screen.getByTestId('node-course-a-output');
const nodeB = screen.getByTestId('node-course-b-input');
await drawEdge(nodeA, nodeB);

// Then: Edge created
expect(mockCreateEdge).toHaveBeenCalledWith({
  from_course_id: 'course-a',
  to_course_id: 'course-b'
});
```

### 3.3 Learner Path View

#### Test: Locked courses show lock icon
```typescript
// Given: Path with A -> B edge, A not completed
render(<LearnerPathView path={mockPath} progress={noProgress} />);

// Then: B shows as locked
const nodeB = screen.getByTestId('node-course-b');
expect(nodeB).toHaveAttribute('data-status', 'locked');
expect(within(nodeB).getByRole('img', { name: 'Locked' })).toBeInTheDocument();
```

#### Test: Completed courses show check icon
```typescript
// Given: Course A completed
render(<LearnerPathView path={mockPath} progress={completedA} />);

// Then: A shows as completed
const nodeA = screen.getByTestId('node-course-a');
expect(nodeA).toHaveAttribute('data-status', 'completed');
expect(within(nodeA).getByRole('img', { name: 'Completed' })).toBeInTheDocument();
```

### 3.4 Course Runner

#### Test: Progress through content sections
```typescript
// Given: Course with 3 sections + quiz
render(<CourseRunner course={mockCourse} />);

// When: Navigating through sections
expect(screen.getByText('Section 1')).toBeInTheDocument();
await user.click(screen.getByText('Continue'));
expect(screen.getByText('Section 2')).toBeInTheDocument();
await user.click(screen.getByText('Continue'));
expect(screen.getByText('Section 3')).toBeInTheDocument();
await user.click(screen.getByText('Start Quiz'));

// Then: Quiz displayed
expect(screen.getByText('Quiz')).toBeInTheDocument();
expect(screen.getByText(mockCourse.quiz_json[0].question)).toBeInTheDocument();
```

#### Test: Quiz submission shows results
```typescript
// Given: Course runner on quiz
render(<CourseRunner course={mockCourse} />);
await navigateToQuiz();

// When: Answering and submitting
await user.click(screen.getByLabelText('Answer A'));
await user.click(screen.getByText('Submit'));

// Then: Results displayed
expect(screen.getByText(/Score: \d+%/)).toBeInTheDocument();
expect(screen.getByText(/Passed|Failed/)).toBeInTheDocument();
```

---

## 4. Integration Tests

### 4.1 Complete Learning Flow

#### Test: Full journey from start to rewards
```typescript
// 1. User views their learning journey
await page.goto('/app/learning');
expect(await page.getByText('Your Learning Journey')).toBeVisible();

// 2. User clicks on available path
await page.click('text=Onboarding Path');
expect(await page.getByTestId('path-graph')).toBeVisible();

// 3. User starts first course (unlocked)
await page.click('[data-testid="node-course-1"]');
await page.click('text=Start Course');

// 4. User reads content
await page.click('text=Continue'); // Section 1 -> 2
await page.click('text=Continue'); // Section 2 -> 3
await page.click('text=Start Quiz');

// 5. User completes quiz with passing score
await page.click('text=Answer A'); // Correct
await page.click('text=Submit');

// 6. User sees rewards
expect(await page.getByText('Course Complete!')).toBeVisible();
expect(await page.getByText('+100 DiceCoin')).toBeVisible();
expect(await page.getByText('+50 XP')).toBeVisible();

// 7. Next course is now unlocked
await page.goto('/app/learning/path/onboarding');
const node2 = page.getByTestId('node-course-2');
expect(await node2.getAttribute('data-status')).toBe('unlocked');
```

### 4.2 Gating Integration

#### Test: Requirement blocks activity until course completed
```typescript
// Given: Game X requires Course Y
// When: User tries to start Game X without completing Course Y
await page.goto('/app/games/game-x');
await page.click('text=Start Game');

// Then: Shown required training message
expect(await page.getByText('Training Required')).toBeVisible();
expect(await page.getByText('Course Y')).toBeVisible();

// When: User completes Course Y
await completeCourse('course-y');

// Then: Can start Game X
await page.goto('/app/games/game-x');
await page.click('text=Start Game');
expect(await page.getByTestId('game-screen')).toBeVisible();
```

---

## 5. Accessibility Tests

### 5.1 Keyboard Navigation

#### Test: Path graph is keyboard navigable
```typescript
// Tab through nodes
await page.keyboard.press('Tab');
expect(await page.locator(':focus').getAttribute('data-testid')).toBe('node-course-1');
await page.keyboard.press('Tab');
expect(await page.locator(':focus').getAttribute('data-testid')).toBe('node-course-2');

// Enter to select
await page.keyboard.press('Enter');
expect(await page.getByText('Start Course')).toBeVisible();
```

### 5.2 Screen Reader

#### Test: Course progress announced
```typescript
// Node has proper aria-label
const node = page.getByTestId('node-course-1');
expect(await node.getAttribute('aria-label')).toBe('Course: Introduction, Status: Completed');
```

---

## 6. Multi-Tenant Tests

### 6.1 Isolation

#### Test: Tenant A cannot see Tenant B's courses
```typescript
// Given: Logged in as user in Tenant A
// When: Fetching courses
const courses = await fetchCourses();

// Then: No Tenant B courses visible
expect(courses.every(c => c.tenant_id !== tenantB)).toBe(true);
```

#### Test: Tenant admin cannot modify other tenant's courses
```typescript
// Given: Course owned by Tenant B
// When: Tenant A admin tries to update
const response = await fetch(`/api/learning/courses/${tenantBCourse.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ title: 'Hacked' })
});

// Then: Forbidden
expect(response.status).toBe(403);
```

---

## 7. Performance Tests

### 7.1 Query Efficiency

#### Test: Course list loads < 200ms
```typescript
const start = Date.now();
await fetch('/api/learning/courses');
const duration = Date.now() - start;
expect(duration).toBeLessThan(200);
```

#### Test: Path with 20 nodes loads < 300ms
```typescript
const start = Date.now();
await fetch(`/api/learning/paths/${largePath.id}`);
const duration = Date.now() - start;
expect(duration).toBeLessThan(300);
```

---

## Test Coverage Matrix

| Feature | Unit | Integration | E2E | a11y |
|---------|------|-------------|-----|------|
| Course CRUD | ✓ | ✓ | ✓ | - |
| Quiz grading | ✓ | ✓ | ✓ | - |
| Path builder | ✓ | ✓ | ✓ | ✓ |
| Progress tracking | ✓ | ✓ | ✓ | - |
| Reward payout | ✓ | ✓ | ✓ | - |
| Requirement gating | ✓ | ✓ | ✓ | - |
| Tenant isolation | ✓ | ✓ | ✓ | - |
| Learner path view | ✓ | ✓ | ✓ | ✓ |
| Course runner | ✓ | ✓ | ✓ | ✓ |
