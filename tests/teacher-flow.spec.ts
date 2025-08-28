// exsense/tests/teacher-flow.spec.ts
import { test, expect } from '@playwright/test';

const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL ?? 'your_teacher_test_email@example.com';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? 'your_strong_password';

test.describe('Teacher Course Creation Flow', () => {
  test('allows a teacher to create a new course and be redirected', async ({ page }) => {
    // 1) Login
    await page.goto('/login');
    await page.getByPlaceholder('email').fill(TEACHER_EMAIL);
    await page.getByPlaceholder('password').fill(TEACHER_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();

    // 2) Teacher dashboard
    await expect(page).toHaveURL('/teacher-dash');
    await expect(page.getByRole('heading', { name: 'Classroom Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My Courses & Insights' })).toBeVisible();

    // 3) New Course
    await page.getByRole('button', { name: 'New Course' }).click();

    // 4) Create Course page
    await expect(page).toHaveURL('/teacher/create-course');
    await expect(page.getByRole('heading', { name: 'Create New Course' })).toBeVisible();

    // Use placeholders since labels are not programmatically associated to inputs
    const newCourseTitle = `My E2E Test Course ${Date.now()}`;
    await page.getByPlaceholder('e.g. JavaScript Essentials').fill(newCourseTitle);
    await page.getByPlaceholder('Short description...').fill('E2E created course.');

    // 5) Create + Redirect
    await page.getByRole('button', { name: 'Create Course' }).click();
    await expect(page).toHaveURL(/\/teacher\?courseId=.+/);
  });
});