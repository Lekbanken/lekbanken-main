# VALIDATION CHECKLIST – Quality Gates for All Phases

**Purpose:** Ensure consistent quality standards across all validation and refactoring work.

---

## Phase 0: Foundation Setup

### Deliverables

- [x] Master TODO tracking system created
- [x] Domain validation template created (`DOMAIN_VALIDATION_TEMPLATE.md`)
- [x] Component inventory template created (`COMPONENT_INVENTORY_TEMPLATE.md`)
- [x] Decision criteria document created (`DECISION_CRITERIA.md`)
- [x] Validation checklist created (`VALIDATION_CHECKLIST.md`)

### Quality Gates

- [ ] All templates are comprehensive
- [ ] Templates include examples
- [ ] Decision criteria covers all scenarios
- [ ] User approved templates

**Phase 0 Complete:** ✅ / ⏳

---

## Phase 1: Domain Documentation Validation

### Per Domain Checklist

#### Documentation Review

- [ ] Domain specification read completely
- [ ] All features listed
- [ ] All tables documented
- [ ] All APIs documented
- [ ] Design principles understood

#### Code Discovery

- [ ] All components discovered (`file_search "features/[domain]/**"`)
- [ ] All API routes discovered (`file_search "app/api/[domain]/**"`)
- [ ] All hooks discovered
- [ ] All services discovered
- [ ] Usage counts verified (`list_code_usages`)

#### Database Validation

- [ ] All documented tables exist
- [ ] All columns match specification
- [ ] RLS enabled on all tables
- [ ] RLS policies tested with different roles
- [ ] Indexes verified
- [ ] Foreign keys verified

#### API Validation

- [ ] All documented endpoints exist
- [ ] Request/response types verified
- [ ] Error handling consistent
- [ ] Authentication working
- [ ] RLS context set correctly
- [ ] Rate limiting in place (where needed)

#### Gap Analysis

- [ ] Missing features identified
- [ ] Undocumented features identified
- [ ] Architectural deviations noted
- [ ] Security issues flagged
- [ ] Performance issues flagged

#### Validation Report

- [ ] Report created from template
- [ ] All sections filled
- [ ] P0/P1/P2 issues prioritized
- [ ] Effort estimated
- [ ] Recommendations clear

#### User Approval

- [ ] Report presented to user
- [ ] User approved report
- [ ] Clarifications documented
- [ ] Action items agreed

### Domain-Specific Gates

#### Platform Domain

- [ ] Vercel deployment config verified
- [ ] Supabase connection working
- [ ] Environment variables documented
- [ ] Feature flags system working
- [ ] Error logging verified
- [ ] Rate limiting tested
- [ ] Secrets properly managed

#### Translation Engine Domain

- [ ] NO/SE/EN support verified
- [ ] Fallback logic (NO → SE → EN) tested
- [ ] User language preference working
- [ ] Tenant default language working
- [ ] Product/Purpose translations complete
- [ ] UI translations complete

#### API / Integration Domain

- [ ] REST API structure consistent
- [ ] Authentication middleware working
- [ ] Error handling standardized
- [ ] Response formats consistent
- [ ] OpenAPI documentation exists (or planned)

#### Participants Domain

- [ ] Tables created (participant_sessions, participants, etc.)
- [ ] Session code generation tested
- [ ] Participant token security verified
- [ ] RLS policies tested
- [ ] Join/rejoin flows working
- [ ] Role assignment system implemented

#### AI Domain

- [ ] Feature flag structure defined
- [ ] API key storage strategy documented
- [ ] Usage logging table designed
- [ ] Cost tracking approach planned
- [ ] Module enable/disable mechanism working

### Quality Gates (Per Domain)

- [ ] Documentation coverage ≥95%
- [ ] Code-to-docs alignment ≥90%
- [ ] All P0 issues documented
- [ ] Architecture risks identified
- [ ] User approved

**Domain Validation Complete:** ✅ / ⏳

---

## Phase 1.5: Cross-Domain Validation

### Integration Points

- [ ] All domain-to-domain dependencies mapped
- [ ] Integration points tested
- [ ] Data flow validated
- [ ] Type contracts verified
- [ ] RLS isolation verified across domains

### Cross-Domain Matrix

- [ ] Matrix completed for all domain pairs
- [ ] Issues documented
- [ ] Fix priorities assigned

### Quality Gates

- [ ] No broken integration points
- [ ] All cross-domain APIs type-safe
- [ ] Tenant isolation preserved
- [ ] User approved cross-domain report

**Phase 1.5 Complete:** ✅ / ⏳

---

## Phase 2: Component Inventory

### Discovery

- [ ] All components discovered
- [ ] All hooks discovered
- [ ] All services discovered
- [ ] All API routes discovered
- [ ] All utilities discovered

### Classification

- [ ] Components categorized by domain
- [ ] Usage counts verified
- [ ] Legacy code identified
- [ ] Orphaned code identified
- [ ] Duplicate code identified

### Documentation

- [ ] Inventory document created
- [ ] All components documented
- [ ] Status assigned (ACTIVE/LEGACY/UNUSED)
- [ ] Dependencies mapped

### Quality Gates

- [ ] 100% of components inventoried
- [ ] ≥90% assigned to domains
- [ ] All legacy code flagged
- [ ] Orphaned code <5%
- [ ] User approved inventory

**Phase 2 Complete:** ✅ / ⏳

---

## Phase 3: Admin Refactoring

### Per Admin Section

#### Pre-Refactoring

- [ ] Current state screenshot taken
- [ ] Components listed
- [ ] Catalyst vs custom identified
- [ ] RLS policies verified

#### Refactoring

- [ ] Catalyst components used
- [ ] Consistent layout applied
- [ ] Navigation unified
- [ ] Forms follow design system
- [ ] Tables follow design system

#### Testing

- [ ] Manual testing with different roles
- [ ] system_admin access verified
- [ ] org_admin restrictions verified
- [ ] editor restrictions verified
- [ ] RLS policies tested

#### Documentation

- [ ] Before/after screenshots
- [ ] Changes documented
- [ ] New patterns documented

### Admin Sections

- [ ] Dashboard refactored
- [ ] Users section refactored
- [ ] Tenants section refactored
- [ ] Games section refactored
- [ ] Products section refactored
- [ ] Purposes section refactored
- [ ] Media section refactored
- [ ] Billing section refactored
- [ ] Analytics section refactored
- [ ] Settings section refactored

### Quality Gates

- [ ] 100% Catalyst UI Kit adoption
- [ ] Design consistency verified (visual)
- [ ] RLS coverage 100%
- [ ] No regressions
- [ ] User approved design

**Phase 3 Complete:** ✅ / ⏳

---

## Phase 4: Backend ↔ Frontend Validation

### Per API Endpoint

#### Type Contract

- [ ] Request type defined
- [ ] Response type defined
- [ ] Frontend expects correct type
- [ ] Backend returns correct type
- [ ] Error types defined

#### RLS Policy

- [ ] Policy allows expected queries
- [ ] Policy denies unauthorized access
- [ ] Tested with multiple roles

#### Error Handling

- [ ] Standard error format used
- [ ] HTTP codes correct (200, 400, 401, 403, 404, 500)
- [ ] Frontend handles errors gracefully

#### Performance

- [ ] Query optimized
- [ ] Indexes in place
- [ ] Pagination implemented (if needed)
- [ ] Response time < 500ms

### API Validation Report

- [ ] All endpoints validated
- [ ] Type mismatches fixed
- [ ] RLS gaps closed
- [ ] Error handling standardized
- [ ] Performance optimized

### Quality Gates

- [ ] 100% type-safe endpoints
- [ ] 100% error format standardized
- [ ] Slow queries (<5)
- [ ] User approved API report

**Phase 4 Complete:** ✅ / ⏳

---

## Phase 5: Sandbox Completion

### Component Coverage

#### Catalyst UI Kit Components

- [ ] Button (all variants)
- [ ] Input (all types)
- [ ] Select
- [ ] Checkbox
- [ ] Radio
- [ ] Switch
- [ ] Textarea
- [ ] Table
- [ ] Modal/Dialog
- [ ] Badge
- [ ] Alert
- [ ] Card
- [ ] Avatar
- [ ] Dropdown
- [ ] Tabs
- [ ] Accordion
- [ ] Tooltip
- [ ] Pagination
- [ ] Breadcrumb
- [ ] Navbar
- [ ] Sidebar
- [ ] Footer

#### Custom Components

- [ ] All domain-specific components
- [ ] All layout components
- [ ] All shared components

### Component Documentation

Per component:
- [ ] All variants demonstrated
- [ ] All states shown (default, hover, active, disabled, loading, error)
- [ ] Interactive demo working
- [ ] Props documented
- [ ] Usage examples provided
- [ ] Do's and Don'ts listed

### Quality Gates

- [ ] 110% component coverage (includes edge cases)
- [ ] 100% interactive demos
- [ ] 100% documentation
- [ ] Visual consistency verified
- [ ] User approved sandbox

**Phase 5 Complete:** ✅ / ⏳

---

## Phase 6: Legacy Cleanup

### Identification

- [ ] All unused files identified (from Phase 2)
- [ ] All duplicate files identified
- [ ] All legacy patterns identified

### Safety Verification

Per file to delete:
- [ ] Usage count = 0 verified
- [ ] No test references
- [ ] No dynamic imports
- [ ] No mentions in config files

### Archival

- [ ] Files moved to `archive/` first
- [ ] README added to archive explaining why
- [ ] 2-week review period set

### Deletion

After review period:
- [ ] Confirmed not needed
- [ ] Deleted from archive
- [ ] Git commit clear

### Metrics

- [ ] Before/after file counts
- [ ] Codebase size reduction calculated
- [ ] No new bugs introduced
- [ ] All tests pass

### Quality Gates

- [ ] ≥20% file reduction
- [ ] 0 broken imports
- [ ] 0 test failures
- [ ] User approved cleanup

**Phase 6 Complete:** ✅ / ⏳

---

## Phase 7: Data Model Domain

### Schema Documentation

- [ ] All tables documented
- [ ] All columns documented with types
- [ ] All relationships documented
- [ ] All RLS policies documented
- [ ] All indexes documented

### ERD

- [ ] ERD created (visual diagram)
- [ ] All relationships shown
- [ ] Foreign keys labeled
- [ ] Cardinality indicated

### Migration History

- [ ] All migrations listed
- [ ] Breaking changes flagged
- [ ] Migration strategy documented

### Future Extensions

- [ ] Planned schema changes documented
- [ ] Deprecation plan for old tables
- [ ] New tables planned

### Quality Gates

- [ ] 100% of tables documented
- [ ] ERD accurate
- [ ] User approved final blueprint

**Phase 7 Complete:** ✅ / ⏳

---

## Global Quality Gates (All Phases)

### Code Quality

- [ ] TypeScript (no `any` without justification)
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] No console.log in production code
- [ ] Error handling comprehensive

### Security

- [ ] RLS enabled on all tables
- [ ] RLS policies tested
- [ ] API authentication verified
- [ ] Secrets in environment variables
- [ ] Input validation in place

### Performance

- [ ] Queries < 500ms
- [ ] No N+1 queries
- [ ] Pagination where needed
- [ ] Indexes on foreign keys

### Testing

- [ ] API endpoints tested (≥80% coverage)
- [ ] RLS policies tested (100% coverage)
- [ ] Critical paths tested
- [ ] No regressions

### Documentation

- [ ] Domain specs up-to-date
- [ ] API documented
- [ ] Complex logic commented
- [ ] README files current

---

## Sign-Off Checklist

### Per Phase

After each phase:
- [ ] Deliverables completed
- [ ] Quality gates passed
- [ ] User reviewed
- [ ] User approved
- [ ] Issues logged (if any)
- [ ] Next phase planned

### Final Sign-Off

After all phases:
- [ ] All domains validated
- [ ] All components inventoried
- [ ] Admin refactored
- [ ] APIs validated
- [ ] Sandbox complete
- [ ] Legacy code removed
- [ ] Data model documented
- [ ] User satisfied
- [ ] Project documented
- [ ] Handover complete

---

## Risk Checklist

### Before Major Changes

- [ ] Backup created
- [ ] Staging environment tested
- [ ] Rollback plan ready
- [ ] User notified
- [ ] Feature flag available (if applicable)

### After Major Changes

- [ ] Tests pass
- [ ] Manual testing done
- [ ] Monitoring checked
- [ ] No new errors in logs
- [ ] User confirmed working

---

## Emergency Rollback Checklist

If something breaks:

- [ ] Identify what broke
- [ ] Check Git history for last known good state
- [ ] Revert commit (if safe)
- [ ] Deploy rollback
- [ ] Verify system working
- [ ] Document what happened
- [ ] Plan fix
- [ ] Communicate to user

---

**Checklist Owner:** Architecture Team  
**Last Updated:** 2025-12-10  
**Usage:** Check off items as completed, review before phase sign-off
