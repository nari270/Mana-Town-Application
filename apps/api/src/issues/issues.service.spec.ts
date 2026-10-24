import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IssueStatus } from '@prisma/client';
import { canTransitionIssueStatus } from './issues.service.js';

test('issue statuses only follow the defined review workflow', () => {
  assert.equal(
    canTransitionIssueStatus(IssueStatus.SUBMITTED, IssueStatus.UNDER_REVIEW),
    true,
  );
  assert.equal(
    canTransitionIssueStatus(IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED),
    true,
  );
  assert.equal(
    canTransitionIssueStatus(IssueStatus.SUBMITTED, IssueStatus.CLOSED),
    false,
  );
  assert.equal(
    canTransitionIssueStatus(IssueStatus.CLOSED, IssueStatus.IN_PROGRESS),
    false,
  );
});
