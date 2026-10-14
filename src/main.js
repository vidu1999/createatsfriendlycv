import './styles.css';
import { parseResumeText } from './resumeParser.js';

const STORAGE_KEY = 'craftcv.resume.v1';
const sections = [
  { key: 'contact', label: 'Basics', title: 'Contact details', description: 'Start with the essentials. Keep your contact information simple and easy to scan.' },
  { key: 'summary', label: 'Summary', title: 'Professional summary', description: 'Give a quick, specific introduction to the value you bring.' },
  { key: 'experience', label: 'Experience', title: 'Work experience', description: 'Show what you did, how you did it, and what changed because of your work.' },
  { key: 'projects', label: 'Projects', title: 'Selected projects', description: 'Highlight relevant projects, the tools you used, and what you built.' },
  { key: 'education', label: 'Education', title: 'Education', description: 'Add your most relevant education, training, or certifications.' },
  { key: 'skills', label: 'Skills', title: 'Skills', description: 'Use clear, role-specific skills that are also supported by your experience.' },
];

const sampleState = {
  resumeTitle: 'Sample resume · Alex Morgan',
  name: 'Alex Morgan',
  targetRole: 'Senior Software Engineer',
  email: 'alex.morgan@email.com',
  phone: '+1 (415) 555-0134',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/alexmorgan',
  github: 'github.com/alexmorgan',
  website: 'alexmorgan.dev',
  summary: 'Product-minded software engineer with 7+ years of experience building reliable, user-centered web applications. Skilled in TypeScript, React, Node.js, and cloud architecture, with a track record of improving performance and shipping measurable product outcomes.',
  experiences: [
    {
      role: 'Senior Software Engineer',
      company: 'Northstar Labs',
      location: 'San Francisco, CA',
      start: '2022',
      end: 'Present',
      description: 'Led the migration of a core dashboard to React and TypeScript, reducing page load time by 38% and cutting support requests by 21%.\nMentored 4 engineers and established code review standards that improved release cadence from biweekly to weekly.\nPartnered with product and design to ship 6 customer-facing features used by 25,000+ monthly active users.',
    },
    {
      role: 'Software Engineer',
      company: 'Brightside',
      location: 'Oakland, CA',
      start: '2019',
      end: '2022',
      description: 'Built and maintained 12 REST APIs in Node.js serving 1.2M requests per day at 99.95% availability.\nAutomated CI/CD workflows, reducing deployment time from 45 minutes to 12 minutes.',
    },
  ],
  projects: [
    { name: 'Workflow Insights Dashboard', technologies: 'React, TypeScript, Node.js', description: 'Shipped a searchable analytics dashboard used by 25,000+ monthly active users.' },
    { name: 'Deployment Automation Toolkit', technologies: 'GitHub Actions, AWS, Docker', description: 'Created reusable CI/CD workflows that reduced deployment time from 45 minutes to 12 minutes.' },
  ],
  education: [
    { degree: 'B.S. Computer Science', school: 'University of California, Davis', location: 'Davis, CA', year: '2019', details: '' },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'PostgreSQL', 'REST APIs', 'CI/CD', 'Agile'],
  jobDescription: '',
  importText: '',
};

function emptyState() {
  return {
    resumeTitle: 'My resume', name: '', targetRole: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '',
    summary: '', experiences: [], projects: [], education: [], skills: [], jobDescription: '', importText: '',
  };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return copy(sampleState);
    return {
      ...copy(sampleState),
      ...stored,
      github: typeof stored.github === 'string' ? stored.github : '',
      importText: typeof stored.importText === 'string' ? stored.importText : '',
      experiences: Array.isArray(stored.experiences) ? stored.experiences : copy(sampleState.experiences),
      projects: Array.isArray(stored.projects) ? stored.projects : [],
      education: Array.isArray(stored.education) ? stored.education : copy(sampleState.education),
      skills: Array.isArray(stored.skills) ? stored.skills : copy(sampleState.skills),
    };
  } catch {
    return copy(sampleState);
  }
}

let state = loadState();
let activeSection = 'contact';
let activeMode = 'build';
let hasScanned = false;
let toastTimeout;
let saveTimeout;

const editorCard = document.querySelector('#editorCard');
const sectionNav = document.querySelector('#sectionNav');
const progressLabel = document.querySelector('#progressLabel');
const progressPercent = document.querySelector('#progressPercent');
const progressFill = document.querySelector('#progressFill');
const buildView = document.querySelector('#buildView');
const importView = document.querySelector('#importView');
const matchView = document.querySelector('#matchView');
const resumePaper = document.querySelector('#resumePaper');
const readinessCard = document.querySelector('#readinessCard');
const saveStatus = document.querySelector('#saveStatus');
const resumeTitleInput = document.querySelector('#resumeTitle');
const breadcrumbLabel = document.querySelector('#breadcrumbLabel');
const toast = document.querySelector('#toast');

const iconMarkup = {
  check: '<path d="m4.2 10.3 3.6 3.5 8-8" />',
  plus: '<path d="M10 4.2v11.6M4.2 10h11.6" />',
  trash: '<path d="M4.8 6.2h10.4M8 6.2V4.5h4v1.7m-5.8 0 .6 9.2h6.4l.6-9.2M8.8 8.5v4.8m2.4-4.8v4.8" />',
  wand: '<path d="m12.2 4.1 3.7 3.7-8.2 8.2L4 12.3l8.2-8.2ZM11 5.3l3.7 3.7M4.2 4.2v2.2m-1.1-1.1h2.2m9.2 8.7v2.2m-1.1-1.1h2.2" />',
  arrowRight: '<path d="M3.5 10h12m-4.3-4.3 4.3 4.3-4.3 4.3" />',
  arrowLeft: '<path d="M16.5 10h-12m4.3 4.3L4.5 10l4.3-4.3" />',
  shield: '<path d="M10 2.8 16.1 5v4.4c0 3.7-2.4 6.2-6.1 7.8-3.7-1.6-6.1-4.1-6.1-7.8V5L10 2.8Z" /><path d="m7.2 9.8 1.8 1.8 3.8-4" />',
  lock: '<rect x="4.1" y="8.6" width="11.8" height="8.1" rx="1.6" /><path d="M6.8 8.6V6.2a3.2 3.2 0 0 1 6.4 0v2.4m-3.2 3.1v2" />',
  sparkle: '<path d="m10 2.5 1.6 5.9 5.9 1.6-5.9 1.6L10 17.5l-1.6-5.9L2.5 10l5.9-1.6L10 2.5Z" /><path d="m15.8 14.2.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7.7-2.2Z" />',
};

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 20 20" fill="none" aria-hidden="true">${iconMarkup[name] || ''}</svg>`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function saveState() {
  saveStatus.classList.add('is-saving');
  saveStatus.lastElementChild.textContent = 'Saving…';
  window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveStatus.classList.remove('is-saving');
      saveStatus.lastElementChild.textContent = 'Saved locally';
    } catch {
      saveStatus.classList.remove('is-saving');
      saveStatus.lastElementChild.textContent = 'Could not save';
      showToast('Your browser storage is full. Download a copy of your resume to keep it safe.');
    }
  }, 180);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function setMode(mode) {
  activeMode = mode;
  const isBuild = mode === 'build';
  const isImport = mode === 'import';
  const isMatch = mode === 'match';
  buildView.hidden = !isBuild;
  importView.hidden = !isImport;
  matchView.hidden = !isMatch;
  breadcrumbLabel.textContent = isBuild ? 'Resume studio' : isImport ? 'Paste & autofill' : 'Job match';
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-active', selected);
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(selected));
    if (button.classList.contains('nav-link')) {
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  });
  if (isImport) renderImportView();
  if (isMatch) renderMatchView();
}

function sectionIsComplete(key) {
  switch (key) {
    case 'contact': return Boolean(state.name.trim() && state.email.trim());
    case 'summary': return state.summary.trim().length >= 35;
    case 'experience': return state.experiences.some((item) => item.role.trim() && item.company.trim() && item.description.trim());
    case 'projects': return state.projects.some((item) => item.name.trim() && item.description.trim());
    case 'education': return state.education.some((item) => item.degree.trim() && item.school.trim());
    case 'skills': return state.skills.filter(Boolean).length >= 3;
    default: return false;
  }
}

function updateProgress() {
  const completed = sections.filter((section) => sectionIsComplete(section.key)).length;
  const percentage = Math.round((completed / sections.length) * 100);
  progressLabel.textContent = `${completed} of ${sections.length} sections complete`;
  progressPercent.textContent = `${percentage}%`;
  progressFill.style.width = `${percentage}%`;
  sectionNav.querySelectorAll('[data-section]').forEach((button) => {
    const complete = sectionIsComplete(button.dataset.section);
    button.classList.toggle('is-complete', complete);
    button.classList.toggle('is-active', button.dataset.section === activeSection);
    const index = sections.findIndex((section) => section.key === button.dataset.section);
    const indexNode = button.querySelector('.step-index');
    if (indexNode) indexNode.innerHTML = complete ? icon('check') : String(index + 1).padStart(2, '0');
  });
}

function field(label, key, value, placeholder = '', options = {}) {
  const required = options.required ? ' <em>*</em>' : '';
  const type = options.type || 'text';
  const hint = options.hint ? `<small class="field-hint">${escapeHtml(options.hint)}</small>` : '';
  const collectionAttributes = options.collection
    ? `data-collection="${escapeHtml(options.collection)}" data-index="${Number(options.index)}"`
    : '';
  const input = options.multiline
    ? `<textarea data-field="${escapeHtml(key)}" ${collectionAttributes} rows="${options.rows || 3}" placeholder="${escapeHtml(placeholder)}" ${options.maxlength ? `maxlength="${options.maxlength}"` : ''}>${escapeHtml(value || '')}</textarea>`
    : `<input data-field="${escapeHtml(key)}" ${collectionAttributes} type="${type}" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" ${options.maxlength ? `maxlength="${options.maxlength}"` : ''} />`;
  const fieldClass = options.spanFull ? ' form-field-full' : '';
  return `<label class="form-field${fieldClass}"><span>${label}${required}</span>${input}${hint}</label>`;
}

function editorFieldsFor(section) {
  if (section === 'contact') {
    const startSample = !state.name && !state.email && !state.targetRole;
    return `
      ${startSample ? `<div class="form-note form-note-sample">${icon('sparkle')}<span>New here? Start with a sample, then replace it with your own details.</span><button class="sample-inline-button" type="button" data-action="load-sample">Load sample</button></div>` : ''}
      <div class="form-grid">
        ${field('Full name', 'name', state.name, 'e.g. Jordan Lee', { required: true })}
        ${field('Target job title', 'targetRole', state.targetRole, 'e.g. Product Designer', { required: true })}
      </div>
      <div class="form-grid">
        ${field('Email address', 'email', state.email, 'name@email.com', { type: 'email', required: true })}
        ${field('Phone number', 'phone', state.phone, '+1 (555) 000-0000')}
      </div>
      <div class="form-grid">
        ${field('City, state / country', 'location', state.location, 'e.g. Austin, TX')}
        ${field('LinkedIn profile', 'linkedin', state.linkedin, 'linkedin.com/in/yourname')}
      </div>
      <div class="form-grid">
        ${field('GitHub profile', 'github', state.github, 'github.com/yourname')}
        ${field('Portfolio or website', 'website', state.website, 'yourwebsite.com')}
      </div>
      <div class="form-note">${icon('shield')}<span>Tip: use a professional email and text-based links. Avoid putting your contact details inside an image.</span></div>
    `;
  }

  if (section === 'summary') {
    return `
      <div class="ai-assist-banner">
        <div class="ai-assist-title">${icon('sparkle')} Smart writing helper</div>
        <span>On-device wording tips · your facts stay yours</span>
      </div>
      <div class="textarea-container">
        <label class="form-field"><span>Professional summary</span><textarea data-field="summary" rows="7" maxlength="600" placeholder="Summarize your role, strongest skills, and the impact you have made.">${escapeHtml(state.summary)}</textarea></label>
        <span class="char-count" id="summaryCount">${state.summary.length} / 600</span>
      </div>
      <div class="assist-actions">
        <button class="assist-button" type="button" id="polishSummaryButton">${icon('wand')} Tighten wording</button>
        <small>Quick local edits only; review every change for accuracy.</small>
      </div>
      <div class="tip-box"><span class="tip-box-icon" aria-hidden="true">↗</span><p><strong>Make it specific.</strong> Include your role, years of experience, strongest skills, and a result you can support. Keep it concise and skip first-person pronouns.</p></div>
    `;
  }

  if (section === 'experience') {
    const entries = state.experiences.map((item, index) => `
      <article class="repeat-entry">
        <div class="repeat-entry-head">
          <div class="repeat-entry-label"><span>${String(index + 1).padStart(2, '0')}</span> POSITION</div>
          <button class="remove-entry" type="button" data-remove-collection="experiences" data-index="${index}" aria-label="Remove experience ${index + 1}">${icon('trash')} Remove</button>
        </div>
        <div class="form-grid">
          ${field('Job title', 'role', item.role, 'e.g. Product Designer', { collection: 'experiences', index })}
          ${field('Company', 'company', item.company, 'Company name', { collection: 'experiences', index })}
        </div>
        <div class="form-grid">
          ${field('Start date', 'start', item.start, 'e.g. Jan 2021', { collection: 'experiences', index })}
          ${field('End date', 'end', item.end, 'e.g. Present', { collection: 'experiences', index })}
        </div>
        <div class="form-grid">
          ${field('Location', 'location', item.location, 'City, state / country', { collection: 'experiences', index })}
          <div class="field-spacer" aria-hidden="true"></div>
        </div>
        <div class="form-grid">
          ${field('Achievements', 'description', item.description, 'Add one achievement per line. Start with a strong verb and include a result when you can.', { collection: 'experiences', index, multiline: true, rows: 4, spanFull: true })}
        </div>
      </article>
    `).join('');
    return `
      <div class="repeat-stack">${entries || '<div class="empty-entry-note">No experience added yet. Include paid work, internships, freelance projects, or relevant volunteer work.</div>'}</div>
      <button class="add-entry-button" type="button" data-add-collection="experiences">${icon('plus')} Add another position</button>
      <div class="tip-box"><span class="tip-box-icon" aria-hidden="true">↗</span><p><strong>Lead with outcomes.</strong> “Improved checkout conversion by 18%” is stronger than a list of responsibilities. Never add a metric you cannot verify.</p></div>
    `;
  }

  if (section === 'projects') {
    const entries = state.projects.map((item, index) => `
      <article class="repeat-entry">
        <div class="repeat-entry-head">
          <div class="repeat-entry-label"><span>${String(index + 1).padStart(2, '0')}</span> PROJECT</div>
          <button class="remove-entry" type="button" data-remove-collection="projects" data-index="${index}" aria-label="Remove project ${index + 1}">${icon('trash')} Remove</button>
        </div>
        <div class="form-grid">
          ${field('Project name', 'name', item.name, 'e.g. Attendance tracking app', { collection: 'projects', index })}
          ${field('Tools and technologies', 'technologies', item.technologies, 'e.g. Python, OpenCV, SQLite', { collection: 'projects', index })}
        </div>
        <div class="form-grid">
          ${field('What you built', 'description', item.description, 'Describe the problem, your contribution, and the result.', { collection: 'projects', index, multiline: true, rows: 3, spanFull: true })}
        </div>
      </article>
    `).join('');
    return `
      <div class="repeat-stack">${entries || '<div class="empty-entry-note">Add coursework, personal projects, research, or open-source work that shows your skills in action.</div>'}</div>
      <button class="add-entry-button" type="button" data-add-collection="projects">${icon('plus')} Add a project</button>
      <div class="tip-box"><span class="tip-box-icon" aria-hidden="true">↗</span><p><strong>Show the build.</strong> Name the project, list the tools, and describe your own contribution. Keep the wording factual and concise.</p></div>
    `;
  }

  if (section === 'education') {
    const entries = state.education.map((item, index) => `
      <article class="repeat-entry">
        <div class="repeat-entry-head">
          <div class="repeat-entry-label"><span>${String(index + 1).padStart(2, '0')}</span> EDUCATION</div>
          <button class="remove-entry" type="button" data-remove-collection="education" data-index="${index}" aria-label="Remove education ${index + 1}">${icon('trash')} Remove</button>
        </div>
        <div class="form-grid">
          ${field('Degree or qualification', 'degree', item.degree, 'e.g. B.S. Computer Science', { collection: 'education', index })}
          ${field('School or institution', 'school', item.school, 'Institution name', { collection: 'education', index })}
        </div>
        <div class="form-grid">
          ${field('Location', 'location', item.location, 'City, state / country', { collection: 'education', index })}
          ${field('Graduation year or dates', 'year', item.year, 'e.g. 2020 or 2022 – Present', { collection: 'education', index })}
        </div>
        <div class="form-grid">
          ${field('Additional details', 'details', item.details, 'Optional: GPA, honors, coursework, or academic notes.', { collection: 'education', index, multiline: true, rows: 2, spanFull: true })}
        </div>
      </article>
    `).join('');
    return `
      <div class="repeat-stack">${entries || '<div class="empty-entry-note">Add a degree, diploma, certification, or other relevant training.</div>'}</div>
      <button class="add-entry-button" type="button" data-add-collection="education">${icon('plus')} Add education</button>
      <div class="tip-box"><span class="tip-box-icon" aria-hidden="true">↗</span><p><strong>Keep it relevant.</strong> Recent graduates can add coursework or honors. More experienced candidates can keep this section brief.</p></div>
    `;
  }

  if (section === 'skills') {
    const chips = state.skills.map((skill, index) => `<span class="skill-chip">${escapeHtml(skill)}<button type="button" class="skill-chip-remove" data-remove-skill="${index}" aria-label="Remove ${escapeHtml(skill)}">×</button></span>`).join('');
    const suggested = ['TypeScript', 'Project management', 'SQL', 'Communication', 'AWS', 'Figma'];
    return `
      <p class="skills-intro">Add specific tools, technologies, and capabilities that are relevant to your target role.</p>
      <div class="skill-list" aria-label="Current skills">${chips || '<span class="empty-skills">Your added skills will appear here.</span>'}</div>
      <div class="skill-entry"><input class="text-input" type="text" id="newSkillInput" placeholder="Type a skill and press Enter" maxlength="40" aria-label="Add a skill" /><button class="add-skill-button" type="button" id="addSkillButton">${icon('plus')} Add skill</button></div>
      <p class="quick-skill-label">QUICK ADD</p>
      <div class="quick-skills">${suggested.map((skill) => `<button type="button" class="quick-skill" data-quick-skill="${escapeHtml(skill)}">${escapeHtml(skill)} <span aria-hidden="true">+</span></button>`).join('')}</div>
      <div class="tip-box"><span class="tip-box-icon" aria-hidden="true">↗</span><p><strong>Be accurate and focused.</strong> Mirror language from a job post only when it genuinely describes your skills. Your experience should back up every claim.</p></div>
    `;
  }

  return '';
}

function renderEditor() {
  const section = sections.find((item) => item.key === activeSection) || sections[0];
  const stepNumber = String(sections.findIndex((item) => item.key === section.key) + 1).padStart(2, '0');
  const currentIndex = sections.findIndex((item) => item.key === section.key);
  const empty = !state.name && !state.email && !state.targetRole;
  const note = section.key === 'contact' && empty
    ? '<button class="load-sample-button" type="button" data-action="load-sample">Try a sample</button>'
    : '<span>Fields marked <b>*</b> are recommended</span>';
  editorCard.innerHTML = `
    <div class="editor-card-head">
      <div class="editor-head-copy"><p class="editor-overline">SECTION ${stepNumber} <span>·</span> ${escapeHtml(section.label.toUpperCase())}</p><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p></div>
      <div class="head-note">${note}</div>
    </div>
    <div class="editor-fields">${editorFieldsFor(section.key)}</div>
    <div class="editor-actions">
      <span class="editor-actions-left">Changes save automatically on this device.</span>
      <div class="editor-actions-right">
        ${currentIndex > 0 ? `<button class="nav-step-button" type="button" data-go-section="${sections[currentIndex - 1].key}">${icon('arrowLeft')} Back</button>` : ''}
        ${currentIndex < sections.length - 1
          ? `<button class="nav-step-button is-next" type="button" data-go-section="${sections[currentIndex + 1].key}">Continue ${icon('arrowRight')}</button>`
          : '<button class="nav-step-button is-next" type="button" data-action="print">Review &amp; export ' + icon('arrowRight') + '</button>'}
      </div>
    </div>
  `;
  updateProgress();
}

function renderSectionNav() {
  sectionNav.innerHTML = sections.map((section, index) => `
    <button class="section-step" type="button" data-section="${section.key}" aria-label="Go to ${escapeHtml(section.title)}">
      <span class="step-index">${String(index + 1).padStart(2, '0')}</span><span class="step-name">${escapeHtml(section.label)}</span>
    </button>
  `).join('');
  updateProgress();
}

function splitAchievements(value = '') {
  return String(value).split(/\n+/).map((line) => line.replace(/^\s*[•*–—-]\s*/, '').trim()).filter(Boolean);
}

function visibleEntry(item, keys) {
  return keys.some((key) => String(item[key] || '').trim());
}

function renderResume() {
  const contactItems = [state.email, state.phone, state.location, state.linkedin, state.github, state.website].filter((item) => String(item || '').trim());
  const experienceItems = state.experiences.filter((item) => visibleEntry(item, ['role', 'company', 'description']));
  const projectItems = state.projects.filter((item) => visibleEntry(item, ['name', 'technologies', 'description']));
  const educationItems = state.education.filter((item) => visibleEntry(item, ['degree', 'school']));
  const fullName = state.name.trim() || 'Your name';
  const nameClass = state.name.trim() ? '' : ' class="is-placeholder"';
  const contact = contactItems.length
    ? contactItems.map((item) => `<span class="contact-item">${escapeHtml(item)}</span>`).join('')
    : '<span class="preview-empty">Add your email, phone, and location</span>';

  const summarySection = `<section class="resume-section ${state.summary.trim() ? '' : 'is-empty'}"><h2>Professional Summary</h2>${state.summary.trim()
    ? `<p>${escapeHtml(state.summary.trim()).replace(/\n/g, '<br>')}</p>`
    : '<p class="preview-empty">Add a short summary of your experience and strengths.</p>'}</section>`;

  const experienceSection = `<section class="resume-section ${experienceItems.length ? '' : 'is-empty'}"><h2>Experience</h2>${experienceItems.length ? experienceItems.map((item) => {
    const heading = [item.role, item.company].filter((part) => String(part || '').trim()).map((part) => escapeHtml(part.trim())).join(' — ');
    const dates = [item.start, item.end].filter((part) => String(part || '').trim()).map((part) => escapeHtml(part.trim())).join(' – ');
    const meta = [item.location].filter((part) => String(part || '').trim()).map((part) => escapeHtml(part.trim())).join('');
    const bullets = splitAchievements(item.description);
    return `<div class="resume-entry"><div class="resume-entry-top"><span class="resume-entry-title">${heading || '<span class="preview-empty">Position title</span>'}</span>${dates ? `<span class="resume-entry-date">${dates}</span>` : ''}</div>${meta ? `<div class="resume-entry-subline"><span>${meta}</span></div>` : ''}${bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>` : ''}</div>`;
  }).join('') : '<p class="preview-empty">Your roles and achievements will appear here.</p>'}</section>`;

  const projectsSection = `<section class="resume-section ${projectItems.length ? '' : 'is-empty'}"><h2>Projects</h2>${projectItems.length ? projectItems.map((item) => {
    const technologies = String(item.technologies || '').trim();
    const description = String(item.description || '').trim();
    return `<div class="resume-entry"><div class="resume-entry-top"><span class="resume-entry-title">${escapeHtml(item.name || 'Project')}</span></div>${technologies ? `<div class="resume-entry-subline"><span>${escapeHtml(technologies)}</span></div>` : ''}${description ? `<ul><li>${escapeHtml(description)}</li></ul>` : ''}</div>`;
  }).join('') : '<p class="preview-empty">Add selected projects that demonstrate your skills.</p>'}</section>`;

  const educationSection = `<section class="resume-section ${educationItems.length ? '' : 'is-empty'}"><h2>Education</h2>${educationItems.length ? educationItems.map((item) => {
    const heading = [item.degree, item.school].filter((part) => String(part || '').trim()).map((part) => escapeHtml(part.trim())).join(' — ');
    const meta = [item.location, item.year].filter((part) => String(part || '').trim()).map((part) => escapeHtml(part.trim())).join(' · ');
    const details = String(item.details || '').trim();
    return `<div class="resume-entry"><div class="resume-entry-top"><span class="resume-entry-title">${heading || '<span class="preview-empty">Degree or institution</span>'}</span></div>${meta ? `<div class="resume-entry-subline"><span>${meta}</span></div>` : ''}${details ? `<ul>${splitAchievements(details).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}</div>`;
  }).join('') : '<p class="preview-empty">Add your most relevant education or training.</p>'}</section>`;

  const skills = state.skills.filter((skill) => String(skill).trim());
  const skillsSection = `<section class="resume-section ${skills.length ? '' : 'is-empty'}"><h2>Skills</h2>${skills.length
    ? `<p class="resume-skills">${skills.map((skill) => escapeHtml(skill)).join(', ')}</p>`
    : '<p class="preview-empty">Your selected skills will appear here.</p>'}</section>`;

  resumePaper.innerHTML = `
    <header class="resume-header">
      <h1${nameClass}>${escapeHtml(fullName)}</h1>
      ${state.targetRole.trim() ? `<div class="resume-role">${escapeHtml(state.targetRole.trim())}</div>` : ''}
      <div class="resume-contact ${contactItems.length ? '' : 'is-empty'}">${contact}</div>
    </header>
    ${summarySection}${experienceSection}${projectsSection}${educationSection}${skillsSection}
  `;
  renderReadiness();
}

function calculateReadiness() {
  let score = 0;
  const hasName = Boolean(state.name.trim());
  const hasRole = Boolean(state.targetRole.trim());
  const hasEmail = Boolean(state.email.trim());
  const hasPhone = Boolean(state.phone.trim());
  const hasLocation = Boolean(state.location.trim());
  const hasSummary = Boolean(state.summary.trim());
  const hasExperience = state.experiences.some((item) => item.role.trim() && item.company.trim() && item.description.trim());
  const hasEducation = state.education.some((item) => item.degree.trim() && item.school.trim());
  const skillCount = state.skills.filter((skill) => String(skill).trim()).length;
  const experienceText = state.experiences.map((item) => item.description).join(' ');
  const hasNumbers = /(?:\d|%|\$|\b(?:million|thousand|hundred)\b)/i.test(experienceText);

  score += (hasName ? 8 : 0) + (hasRole ? 8 : 0) + (hasEmail ? 9 : 0);
  score += (hasPhone ? 4 : 0) + (hasLocation ? 4 : 0);
  score += hasSummary ? 15 : 0;
  score += hasExperience ? 20 : 0;
  score += hasEducation ? 10 : 0;
  score += skillCount >= 4 ? 10 : skillCount > 0 ? 5 : 0;
  score += hasNumbers ? 12 : 0;
  return {
    score,
    checks: [
      { label: 'Name and target title', complete: hasName && hasRole },
      { label: 'Contact details included', complete: hasEmail && (hasPhone || hasLocation) },
      { label: 'Standard sections filled', complete: hasSummary && hasExperience && hasEducation },
      { label: 'Measurable result included', complete: hasNumbers },
    ],
  };
}

function renderReadiness() {
  const readiness = calculateReadiness();
  readinessCard.innerHTML = `
    <div class="readiness-top">
      <div class="readiness-copy"><span class="small-label">QUICK CONTENT CHECK</span><strong>Resume readiness</strong><p>Structure and content coverage</p></div>
      <div class="score-circle" style="--score:${readiness.score}%" aria-label="${readiness.score} out of 100"><span>${readiness.score}</span></div>
    </div>
    <div class="readiness-checks">${readiness.checks.map((check) => `<div class="check-item ${check.complete ? '' : 'is-pending'}">${check.complete ? icon('check') : '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 6.5v4m0 2.5v.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'}<span>${escapeHtml(check.label)}</span></div>`).join('')}</div>
  `;
}

const knownKeywords = [
  'TypeScript', 'JavaScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Python', 'C++', 'Java', 'C#', 'Go',
  'Tailwind CSS', 'Pygame', 'OpenCV', 'TensorFlow', 'SQLite', 'Git', 'GitHub', 'AWS', 'Azure', 'Google Cloud',
  'Docker', 'Kubernetes', 'PostgreSQL', 'SQL', 'MongoDB', 'GraphQL', 'REST APIs', 'CI/CD', 'Terraform', 'Jest',
  'Cypress', 'Agile', 'Scrum', 'Microservices', 'Data analysis', 'Machine learning', 'Computer vision',
  'Accessibility', 'Performance optimization', 'Project management', 'Team leadership', 'Cross-functional collaboration',
  'Web development', 'Database development', 'Application development', 'Socket programming', 'Object-oriented programming',
];

function containsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i').test(text);
}

function analyzeJob() {
  const description = state.jobDescription.trim();
  const targetKeywords = knownKeywords.filter((keyword) => containsTerm(description, keyword));
  const candidateText = [
    state.targetRole, state.summary, state.skills.join(' '),
    ...state.experiences.flatMap((item) => [item.role, item.company, item.description]),
    ...state.projects.flatMap((item) => [item.name, item.technologies, item.description]),
    ...state.education.flatMap((item) => [item.degree, item.school, item.details]),
  ].join(' ');
  const matched = targetKeywords.filter((keyword) => containsTerm(candidateText, keyword));
  const missing = targetKeywords.filter((keyword) => !matched.includes(keyword));
  const score = targetKeywords.length ? Math.round((matched.length / targetKeywords.length) * 100) : 0;
  return { targetKeywords, matched, missing, score };
}

function renderImportView() {
  const source = state.importText || '';
  importView.innerHTML = `
    <div class="import-intro">
      <p class="import-overline">SMART IMPORT · AUTOFILL</p>
      <h2>Start with the resume you already have.</h2>
      <p>Paste plain text from a document. CraftCV will map familiar headings into editable contact, summary, skills, experience, projects, and education fields.</p>
    </div>
    <div class="import-card">
      <div class="import-card-head"><div><span class="import-step">01</span><strong>Paste your resume text</strong></div><span class="import-card-hint">Plain text works best</span></div>
      <textarea class="resume-source-text" id="resumeSourceText" maxlength="20000" placeholder="Paste your resume here…\n\nFor best results, keep headings such as Professional Summary, Technical Skills, Work Experience, Projects, and Education.">${escapeHtml(source)}</textarea>
      <div class="import-utility-row"><span id="importCharacterCount">${source.length.toLocaleString()} / 20,000 characters</span><button class="import-clear-button" id="clearImportText" type="button" ${source ? '' : 'disabled'}>Clear text</button></div>
      <div class="import-submit-row"><span class="local-note">${icon('lock')} Parsed in this browser · no upload</span><button class="import-submit" id="parseResumeButton" type="button">${icon('sparkle')} Autofill my resume</button></div>
      <p class="import-warning">Importing replaces the current resume draft. Review names, dates, and any details the parser could not identify before exporting.</p>
    </div>
    <div class="import-info-card">
      <div class="import-info-icon">${icon('shield')}</div>
      <div><strong>Local smart parser</strong><p>This demo uses heading and text patterns in your browser; a live AI provider is not connected. Nothing you paste is sent to an AI service.</p></div>
      <div class="import-section-pills"><span>CONTACT</span><span>SUMMARY</span><span>SKILLS</span><span>EXPERIENCE</span><span>PROJECTS</span><span>EDUCATION</span></div>
    </div>
  `;
}

function importResumeText() {
  const textarea = document.querySelector('#resumeSourceText');
  const source = textarea?.value || '';
  state.importText = source;
  const imported = parseResumeText(source);
  const hasContent = Boolean(imported.name || imported.email || imported.summary || imported.experiences.length || imported.projects.length || imported.education.length || imported.skills.length);
  if (!hasContent) {
    saveState();
    showToast('I could not find common resume sections. Paste more of your resume, including its headings.');
    textarea?.focus();
    return;
  }

  const sectionCount = [
    imported.name || imported.email || imported.phone ? 'contact details' : '',
    imported.summary ? 'summary' : '',
    imported.skills.length ? 'skills' : '',
    imported.experiences.length ? 'experience' : '',
    imported.projects.length ? 'projects' : '',
    imported.education.length ? 'education' : '',
  ].filter(Boolean).length;
  state = { ...emptyState(), ...imported, importText: source };
  activeSection = 'contact';
  hasScanned = false;
  renderAll();
  setMode('build');
  saveState();
  showToast(`Filled ${sectionCount} resume sections. Review the extracted details before exporting.`);
}

function renderMatchView() {
  const report = hasScanned ? analyzeJob() : null;
  const placeholder = !hasScanned
    ? '<div class="match-placeholder"><strong>Your report will appear here.</strong>Paste the job description above to see which role-specific terms already appear in your resume.</div>'
    : '';
  let reportMarkup = placeholder;

  if (report) {
    if (!report.targetKeywords.length) {
      reportMarkup = `<div class="match-report"><div class="report-heading"><strong>Keyword coverage</strong><span>Local scan complete</span></div><p class="keyword-empty">No skills from the built-in keyword list were found. Try pasting a more detailed job description with specific tools or capabilities.</p><p class="match-disclaimer">This lightweight scan checks a small set of common skills. It does not predict ATS results or hiring decisions.</p></div>`;
    } else {
      const matchText = `${report.matched.length} of ${report.targetKeywords.length} listed terms found in your resume`;
      const matchedMarkup = report.matched.length
        ? report.matched.map((keyword) => `<span class="keyword-tag">${escapeHtml(keyword)}</span>`).join('')
        : '<p class="keyword-empty">No matched terms yet. Review your resume and include relevant skills only when accurate.</p>';
      const missingMarkup = report.missing.length
        ? report.missing.map((keyword) => `<span class="keyword-tag is-missing">${escapeHtml(keyword)}<button type="button" data-add-keyword="${escapeHtml(keyword)}" aria-label="Add ${escapeHtml(keyword)} to skills if accurate">+ add if accurate</button></span>`).join('')
        : '<p class="keyword-empty">Great — every detected term appears somewhere in your resume.</p>';
      reportMarkup = `
        <div class="match-report">
          <div class="report-heading"><strong>Keyword coverage</strong><span>Local scan complete</span></div>
          <div class="report-score-row"><div class="report-score">${report.score}%</div><div class="report-score-copy"><strong>${matchText}</strong><p>Keyword overlap only — not a hiring prediction.</p><div class="report-progress"><span style="width:${report.score}%"></span></div></div></div>
          <div class="keyword-group"><div class="keyword-heading">Already in your resume <span class="count">${report.matched.length}</span></div><div class="keyword-tags">${matchedMarkup}</div></div>
          <div class="keyword-group"><div class="keyword-heading">Not found <span class="count">${report.missing.length}</span></div><div class="keyword-tags">${missingMarkup}</div></div>
          <p class="match-disclaimer">Only add a missing term if it truthfully reflects your skills or experience. This scan checks a limited set of common keywords.</p>
        </div>
      `;
    }
  }

  matchView.innerHTML = `
    <div class="match-intro"><p class="match-overline">TAILOR YOUR APPLICATION</p><h2>See how your resume lines up.</h2><p>Compare a job description with your resume. The scan runs locally in your browser; your text is not sent to a server.</p></div>
    <div class="match-form">
      <div class="match-label-row"><label for="jobDescription">Job description</label><span>Paste the full role or key requirements</span></div>
      <textarea class="job-description" id="jobDescription" placeholder="Paste a job description here…">${escapeHtml(state.jobDescription)}</textarea>
      <div class="match-form-footer"><span class="local-note">${icon('lock')} Your resume stays on this device</span><button class="match-submit" type="button" id="analyzeJobButton">${icon('sparkle')} Analyze keywords</button></div>
    </div>
    ${reportMarkup}
  `;
}

function renderAll() {
  resumeTitleInput.value = state.resumeTitle || 'My resume';
  renderSectionNav();
  renderEditor();
  renderResume();
  if (activeMode === 'import') renderImportView();
  if (activeMode === 'match') renderMatchView();
}

function updateField(target) {
  const key = target.dataset.field;
  if (!key) return;
  const collection = target.dataset.collection;
  if (collection) {
    const index = Number(target.dataset.index);
    if (Array.isArray(state[collection]) && state[collection][index]) state[collection][index][key] = target.value;
  } else {
    state[key] = target.value;
  }
}

function updateSummaryCounter() {
  const counter = document.querySelector('#summaryCount');
  const summaryField = editorCard.querySelector('[data-field="summary"]');
  if (counter && summaryField) counter.textContent = `${summaryField.value.length} / 600`;
}

function addSkill(value) {
  const cleaned = String(value || '').trim().replace(/[;,]+$/, '').trim();
  if (!cleaned) return false;
  if (state.skills.some((skill) => String(skill).toLowerCase() === cleaned.toLowerCase())) {
    showToast(`${cleaned} is already in your skills.`);
    return false;
  }
  state.skills.push(cleaned);
  return true;
}

function addEntry(collection) {
  if (collection === 'experiences') state.experiences.push({ role: '', company: '', location: '', start: '', end: '', description: '' });
  if (collection === 'projects') state.projects.push({ name: '', technologies: '', description: '' });
  if (collection === 'education') state.education.push({ degree: '', school: '', location: '', year: '', details: '' });
  activeSection = collection === 'experiences' ? 'experience' : collection === 'projects' ? 'projects' : 'education';
  renderEditor();
  const firstField = editorCard.querySelector('.repeat-entry:last-child input');
  firstField?.focus();
  saveState();
}

function polishSummary() {
  const before = state.summary.trim();
  if (!before) {
    showToast('Add a few notes first; the writing helper will make small, factual edits.');
    return;
  }
  const after = before
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bworked on\b/gi, 'developed')
    .replace(/\bhelped\b/gi, 'supported')
    .replace(/\bvarious\b/gi, 'multiple')
    .replace(/\bI am an?\s+/i, '')
    .replace(/^\s*I am\s+/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
  if (after === before) {
    showToast('No safe wording change suggested. Add role-specific skills or a verified result to make this stronger.');
    return;
  }
  state.summary = after;
  const summaryField = editorCard.querySelector('[data-field="summary"]');
  if (summaryField) summaryField.value = after;
  updateSummaryCounter();
  renderResume();
  updateProgress();
  saveState();
  showToast('Wording tightened locally. Please check that every detail is accurate.');
}

function buildPlainText() {
  const lines = [];
  if (state.name.trim()) lines.push(state.name.trim());
  if (state.targetRole.trim()) lines.push(state.targetRole.trim());
  const contact = [state.email, state.phone, state.location, state.linkedin, state.github, state.website].map((part) => String(part || '').trim()).filter(Boolean);
  if (contact.length) lines.push(contact.join(' | '));

  if (state.summary.trim()) lines.push('', 'PROFESSIONAL SUMMARY', state.summary.trim());
  const experiences = state.experiences.filter((item) => visibleEntry(item, ['role', 'company', 'description']));
  if (experiences.length) {
    lines.push('', 'EXPERIENCE');
    experiences.forEach((item) => {
      const heading = [item.role, item.company].map((part) => String(part || '').trim()).filter(Boolean).join(' — ');
      if (heading) lines.push(heading);
      const dates = [item.start, item.end].map((part) => String(part || '').trim()).filter(Boolean).join(' – ');
      const meta = [item.location, dates].map((part) => String(part || '').trim()).filter(Boolean).join(' | ');
      if (meta) lines.push(meta);
      splitAchievements(item.description).forEach((achievement) => lines.push(`- ${achievement}`));
      lines.push('');
    });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
  }
  const projects = state.projects.filter((item) => visibleEntry(item, ['name', 'technologies', 'description']));
  if (projects.length) {
    lines.push('', 'PROJECTS');
    projects.forEach((item) => {
      if (item.name.trim()) lines.push(item.name.trim());
      if (item.technologies.trim()) lines.push(`Technologies: ${item.technologies.trim()}`);
      splitAchievements(item.description).forEach((description) => lines.push(`- ${description}`));
    });
  }
  const education = state.education.filter((item) => visibleEntry(item, ['degree', 'school']));
  if (education.length) {
    lines.push('', 'EDUCATION');
    education.forEach((item) => {
      const heading = [item.degree, item.school].map((part) => String(part || '').trim()).filter(Boolean).join(' — ');
      if (heading) lines.push(heading);
      const meta = [item.location, item.year].map((part) => String(part || '').trim()).filter(Boolean).join(' | ');
      if (meta) lines.push(meta);
      splitAchievements(item.details).forEach((detail) => lines.push(`- ${detail}`));
    });
  }
  const skills = state.skills.map((skill) => String(skill || '').trim()).filter(Boolean);
  if (skills.length) lines.push('', 'SKILLS', skills.join(', '));
  return lines.join('\n').trim() + '\n';
}

function downloadText() {
  const content = buildPlainText();
  if (!content.trim()) {
    showToast('Add some resume details before downloading a text copy.');
    return;
  }
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileBase = (state.name || state.resumeTitle || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume';
  link.href = url;
  link.download = `${fileBase}-resume.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Plain-text resume downloaded.');
}

function printResume() {
  if (!buildPlainText().trim()) {
    showToast('Add at least one resume detail before saving a PDF.');
    return;
  }
  window.print();
}

function goToSection(key) {
  if (!sections.some((section) => section.key === key)) return;
  activeSection = key;
  renderEditor();
  if (window.matchMedia('(max-width: 740px)').matches) editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleClick(event) {
  const modeButton = event.target.closest('[data-mode]');
  if (modeButton) {
    setMode(modeButton.dataset.mode);
    return;
  }

  const sectionButton = event.target.closest('[data-section]');
  if (sectionButton) {
    goToSection(sectionButton.dataset.section);
    return;
  }

  const goButton = event.target.closest('[data-go-section]');
  if (goButton) {
    goToSection(goButton.dataset.goSection);
    return;
  }

  const addCollectionButton = event.target.closest('[data-add-collection]');
  if (addCollectionButton) {
    addEntry(addCollectionButton.dataset.addCollection);
    return;
  }

  const removeEntryButton = event.target.closest('[data-remove-collection]');
  if (removeEntryButton) {
    const collection = removeEntryButton.dataset.removeCollection;
    const index = Number(removeEntryButton.dataset.index);
    if (Array.isArray(state[collection])) state[collection].splice(index, 1);
    renderEditor();
    renderResume();
    saveState();
    return;
  }

  const removeSkillButton = event.target.closest('[data-remove-skill]');
  if (removeSkillButton) {
    state.skills.splice(Number(removeSkillButton.dataset.removeSkill), 1);
    renderEditor();
    renderResume();
    saveState();
    return;
  }

  const quickSkill = event.target.closest('[data-quick-skill]');
  if (quickSkill) {
    if (addSkill(quickSkill.dataset.quickSkill)) {
      renderEditor();
      renderResume();
      updateProgress();
      saveState();
    }
    return;
  }

  const addKeywordButton = event.target.closest('[data-add-keyword]');
  if (addKeywordButton) {
    const keyword = addKeywordButton.dataset.addKeyword;
    if (addSkill(keyword)) {
      renderEditor();
      renderResume();
      updateProgress();
      saveState();
      hasScanned = true;
      renderMatchView();
      showToast(`Added ${keyword}. Keep it only if it accurately describes your experience.`);
    }
    return;
  }

  if (event.target.closest('#addSkillButton')) {
    const input = document.querySelector('#newSkillInput');
    if (addSkill(input?.value)) {
      renderEditor();
      renderResume();
      updateProgress();
      saveState();
    } else if (input && !input.value.trim()) {
      input.focus();
    }
    return;
  }

  if (event.target.closest('#polishSummaryButton')) {
    polishSummary();
    return;
  }

  if (event.target.closest('#analyzeJobButton')) {
    const input = document.querySelector('#jobDescription');
    state.jobDescription = input?.value || '';
    if (!state.jobDescription.trim()) {
      showToast('Paste a job description to run the keyword scan.');
      input?.focus();
      return;
    }
    hasScanned = true;
    saveState();
    renderMatchView();
    return;
  }

  if (event.target.closest('#parseResumeButton')) {
    importResumeText();
    return;
  }
  if (event.target.closest('#clearImportText')) {
    state.importText = '';
    saveState();
    renderImportView();
    document.querySelector('#resumeSourceText')?.focus();
    return;
  }
  if (event.target.closest('#downloadTxtButton')) {
    downloadText();
    return;
  }
  if (event.target.closest('#printButton') || event.target.closest('[data-action="print"]')) {
    printResume();
    return;
  }
  if (event.target.closest('[data-action="load-sample"]')) {
    state = copy(sampleState);
    activeSection = 'contact';
    hasScanned = false;
    saveState();
    renderAll();
    showToast('Sample loaded. Replace it with your own accurate details.');
    return;
  }
  if (event.target.closest('#startFreshButton')) {
    if (!window.confirm('Start a blank resume? Your current draft will be replaced in this browser.')) return;
    state = emptyState();
    activeSection = 'contact';
    hasScanned = false;
    saveState();
    renderAll();
    setMode('build');
    showToast('Blank resume created. Your changes will save on this device.');
    return;
  }
  if (event.target.closest('[data-action="show-tip"]')) {
    showToast('Use standard section headings, simple text formatting, and role-specific keywords you can support.');
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.id === 'resumeTitle') {
    state.resumeTitle = target.value;
    saveState();
    return;
  }
  if (target.id === 'jobDescription') {
    state.jobDescription = target.value;
    saveState();
    return;
  }
  if (target.id === 'resumeSourceText') {
    state.importText = target.value;
    const counter = document.querySelector('#importCharacterCount');
    const clearButton = document.querySelector('#clearImportText');
    if (counter) counter.textContent = `${target.value.length.toLocaleString()} / 20,000 characters`;
    if (clearButton) clearButton.disabled = !target.value;
    saveState();
    return;
  }
  if (target.dataset.field) {
    updateField(target);
    if (target.dataset.field === 'summary') updateSummaryCounter();
    renderResume();
    updateProgress();
    saveState();
  }
}

function handleKeydown(event) {
  if (event.target.id === 'newSkillInput' && (event.key === 'Enter' || event.key === ',')) {
    event.preventDefault();
    const input = event.target;
    if (addSkill(input.value)) {
      renderEditor();
      renderResume();
      updateProgress();
      saveState();
    }
  }
}

document.addEventListener('click', handleClick);
document.addEventListener('input', handleInput);
document.addEventListener('keydown', handleKeydown);

renderAll();
setMode('build');
