import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResumeText } from '../src/resumeParser.js';

const resumeText = `TAYLOR EXAMPLE
Anuradhapura | +94 123456789 | [taylor@example.test](mailto:taylor@example.test)
LinkedIn: linkedin.com/in/taylor-example | GitHub: github.com/taylorexample

PROFESSIONAL SUMMARY
Computer Science undergraduate with hands-on software development experience.

TECHNICAL SKILLS
Programming Languages: Python, C++, JavaScript
Frameworks &amp; Libraries: React, Next.js, TensorFlow
Core Competencies: Web Development, Database &amp; Application Development

WORK EXPERIENCE
Software Engineer Intern
Example Software (Pvt) Ltd, Colombo, Sri Lanka
March 2024 – September 2025
Built and tested a responsive web application.

KEY PROJECTS
Attendance System (Python, OpenCV, SQLite): Created an attendance app using face recognition.

EDUCATION
Bachelor of Science in Computer Science (Undergraduate)
Example University, Sri Lanka (2022 – Present)
GPA: 3.01 | Academic requirements completed.
Diploma in English
Example Institute (2019 – 2020)`;

test('maps common resume sections into editable resume fields', () => {
  const result = parseResumeText(resumeText);
  assert.equal(result.name, 'TAYLOR EXAMPLE');
  assert.equal(result.email, 'taylor@example.test');
  assert.equal(result.phone, '+94 123456789');
  assert.equal(result.location, 'Anuradhapura');
  assert.equal(result.linkedin, 'linkedin.com/in/taylor-example');
  assert.equal(result.github, 'github.com/taylorexample');
  assert.equal(result.website, '');
  assert.equal(result.targetRole, 'Software Engineer');
  assert.match(result.summary, /Computer Science undergraduate/);
  assert.deepEqual(result.experiences[0], {
    role: 'Software Engineer Intern',
    company: 'Example Software (Pvt) Ltd',
    location: 'Colombo, Sri Lanka',
    start: 'March 2024',
    end: 'September 2025',
    description: 'Built and tested a responsive web application.',
  });
  assert.deepEqual(result.projects[0], {
    name: 'Attendance System',
    technologies: 'Python, OpenCV, SQLite',
    description: 'Created an attendance app using face recognition.',
  });
  assert.equal(result.education.length, 2);
  assert.equal(result.education[0].year, '2022 – Present');
  assert.match(result.education[0].details, /GPA: 3.01/);
  assert.ok(result.skills.includes('C++'));
  assert.ok(result.skills.includes('Database & Application Development'));
});

test('returns an empty draft for unstructured or empty input', () => {
  const result = parseResumeText('');
  assert.equal(result.name, '');
  assert.equal(result.summary, '');
  assert.deepEqual(result.experiences, []);
  assert.deepEqual(result.projects, []);
  assert.deepEqual(result.education, []);
  assert.deepEqual(result.skills, []);
});
