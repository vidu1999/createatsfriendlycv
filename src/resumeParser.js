const SECTION_PATTERNS = [
  ['summary', /^(?:professional\s+summary|career\s+summary|summary|profile|objective)$/i],
  ['skills', /^(?:technical\s+skills|core\s+skills|skills|areas\s+of\s+expertise)$/i],
  ['experience', /^(?:work\s+experience|professional\s+experience|employment\s+history|experience)$/i],
  ['projects', /^(?:key\s+projects|selected\s+projects|personal\s+projects|projects|project\s+experience)$/i],
  ['education', /^(?:education|academic\s+background|education\s+and\s+training|qualifications)$/i],
];

const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_RANGE = new RegExp(`((?:(?:${MONTHS})\\s+)?(?:19|20)\\d{2}|present|current|now)\\s*(?:–|—|-|to)\\s*((?:(?:${MONTHS})\\s+)?(?:19|20)\\d{2}|present|current|now)`, 'i');

function cleanLine(line) {
  return String(line)
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*(?:[•●▪◦*-]\s+)+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/&amp;/gi, '&')
    .trim();
}

function normalizeLines(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\[([^\]]+)\]\(mailto:[^)]+\)/gi, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1 $2')
    .split('\n')
    .map(cleanLine);
}

function identifyHeading(line) {
  const cleaned = line.replace(/:$/, '').replace(/\s+/g, ' ').trim();
  return SECTION_PATTERNS.find(([, pattern]) => pattern.test(cleaned))?.[0] || '';
}

function collectSections(lines) {
  const blocks = { before: [], summary: [], skills: [], experience: [], projects: [], education: [] };
  let current = 'before';
  for (const line of lines) {
    const heading = identifyHeading(line);
    if (heading) {
      current = heading;
    } else if (line) {
      blocks[current].push(line);
    }
  }
  return blocks;
}

function cleanLink(value = '') {
  return String(value).replace(/[.,;)>\]}]+$/g, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
}

function extractUrl(text, domain) {
  const pattern = new RegExp(`(?:https?://)?(?:www\\.)?${domain}/[^\\s|,)]+`, 'i');
  return cleanLink(text.match(pattern)?.[0] || '');
}

function isLikelyContactLine(line) {
  return /@|linkedin\.com|github\.com|https?:\/\/|www\.|\|/.test(line) || (line.match(/\d/g) || []).length >= 7;
}

function extractPhone(lines) {
  const contactText = lines.join(' ')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ')
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:linkedin|github)\.com\/[^\s|,)]+/gi, ' ');
  const matches = contactText.match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  const candidate = matches.find((match) => (match.match(/\d/g) || []).length >= 8);
  return candidate ? candidate.replace(/\s+/g, ' ').trim() : '';
}

function extractLocation(lines, name, email, phone) {
  const contactLine = lines.find((line) => (email && line.includes(email)) || (phone && line.replace(/\D/g, '').includes(phone.replace(/\D/g, ''))));
  if (!contactLine) return '';
  const parts = contactLine.split(/[|•]/).map((part) => part.trim());
  for (const part of parts) {
    if (!part || part === name || (email && part.includes(email)) || /(?:linkedin|github)\.com|https?:\/\//i.test(part)) continue;
    if (phone && part.replace(/\D/g, '').includes(phone.replace(/\D/g, ''))) continue;
    if (/^[+\d\s().-]+$/.test(part)) continue;
    return part.replace(/^[,:;\s]+|[,:;\s]+$/g, '');
  }
  const remainder = contactLine
    .replace(email, '')
    .replace(phone, '')
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:linkedin|github)\.com\/[^\s|,)]+/gi, '')
    .replace(/[|•]/g, ' ')
    .trim();
  return remainder && remainder !== name ? remainder : '';
}

function looksLikeTitle(line) {
  return /\b(?:engineer|developer|designer|analyst|intern|student|undergraduate|scientist|architect|specialist|manager|consultant|coordinator|researcher|administrator|technician)\b/i.test(line);
}

function parseSkills(lines) {
  const categoryOnly = /^(?:programming languages|frameworks?(?:\s*&\s*libraries)?|libraries|databases?(?:\s*&\s*tools)?|tools|core competencies|competencies|technical skills)$/i;
  const results = [];
  for (const line of lines) {
    const colon = line.indexOf(':');
    const value = colon >= 0 ? line.slice(colon + 1) : line;
    if (!value.trim() || categoryOnly.test(value.trim())) continue;
    value.split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean).forEach((skill) => {
      if (!results.some((existing) => existing.toLowerCase() === skill.toLowerCase())) results.push(skill);
    });
  }
  return results;
}

function looksLikeLocation(line = '') {
  return line.length <= 55
    && line.split(',').length >= 2
    && !/\b(?:university|college|institute|engineering|company|co\.?|ltd\.?|pvt\.?|inc\.?|llc|corp\.?|limited)\b/i.test(line)
    && !/[.!?]$/.test(line);
}

function splitCompanyLocation(companyLine = '') {
  const parts = companyLine.split(',').map((part) => part.trim()).filter(Boolean);
  const hasCompanySuffix = /\b(?:company|co\.?|ltd\.?|pvt\.?|inc\.?|llc|corp\.?|limited)\b/i.test(companyLine);
  if (parts.length >= 3 && hasCompanySuffix) {
    return { company: parts.slice(0, -2).join(', '), location: parts.slice(-2).join(', ') };
  }
  if (parts.length === 2 && looksLikeLocation(parts[1])) {
    return { company: parts[0], location: parts[1] };
  }
  return { company: companyLine.trim(), location: '' };
}

function parseDateRange(line = '') {
  const match = line.match(DATE_RANGE);
  return match ? { start: match[1].trim(), end: match[2].trim() } : { start: '', end: '' };
}

function headerCount(lines) {
  const compact = lines.filter(Boolean);
  if (compact.length >= 3 && looksLikeLocation(compact[compact.length - 1])) return 3;
  return Math.min(2, compact.length);
}

function parseExperience(lines) {
  const dateIndexes = [];
  lines.forEach((line, index) => { if (DATE_RANGE.test(line)) dateIndexes.push(index); });
  if (!dateIndexes.length) {
    const compact = lines.filter(Boolean);
    if (compact.length < 3) return [];
    const companyParts = splitCompanyLocation(compact[1]);
    return [{ role: compact[0], company: companyParts.company, location: companyParts.location, start: '', end: '', description: compact.slice(2).join('\n') }];
  }

  return dateIndexes.map((dateIndex, entryIndex) => {
    const priorDateIndex = entryIndex > 0 ? dateIndexes[entryIndex - 1] : -1;
    const beforeDate = lines.slice(priorDateIndex + 1, dateIndex).filter(Boolean);
    const count = headerCount(beforeDate);
    const header = beforeDate.slice(-count);
    let role = '';
    let companyLine = '';
    let location = '';
    if (header.length >= 3 && looksLikeLocation(header[header.length - 1])) {
      role = header[header.length - 3];
      companyLine = header[header.length - 2];
      location = header[header.length - 1];
    } else if (header.length >= 2) {
      role = header[header.length - 2];
      companyLine = header[header.length - 1];
    } else if (header.length === 1) {
      role = header[0];
    }
    const companyLocation = splitCompanyLocation(companyLine);
    if (!location) location = companyLocation.location;
    const nextDateIndex = dateIndexes[entryIndex + 1] ?? lines.length;
    let descriptionEnd = nextDateIndex;
    if (nextDateIndex < lines.length) {
      const between = lines.slice(dateIndex + 1, nextDateIndex);
      descriptionEnd = nextDateIndex - headerCount(between);
    }
    const description = lines.slice(dateIndex + 1, Math.max(dateIndex + 1, descriptionEnd)).filter(Boolean).join('\n');
    const dates = parseDateRange(lines[dateIndex]);
    return { role, company: companyLocation.company, location, ...dates, description };
  }).filter((item) => item.role || item.company || item.description);
}

function looksLikeInstitution(line = '') {
  return /\b(?:university|college|institute|school|academy|polytechnic|esoft|campus|training center)\b/i.test(line);
}

function looksLikeDegree(line = '') {
  return /\b(?:bachelor|b\.?s\.?|bsc|master|m\.?s\.?|msc|diploma|degree|certificate|undergraduate|phd|doctor|associate|computer science|engineering)\b/i.test(line);
}

function stripDate(line = '') {
  return line.replace(DATE_RANGE, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[()[\]]/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
}

function parseEducation(lines) {
  const anchors = [];
  lines.forEach((line, index) => {
    const range = line.match(DATE_RANGE);
    const year = !range && line.match(/\b(?:19|20)\d{2}\b/);
    if (range || year) anchors.push({ index, year: range ? `${range[1].trim()} – ${range[2].trim()}` : year[0] });
  });

  if (!anchors.length) {
    const records = [];
    for (let index = 0; index < lines.length - 1; index += 1) {
      if (looksLikeDegree(lines[index]) && !looksLikeInstitution(lines[index + 1])) continue;
      if (looksLikeDegree(lines[index]) && lines[index + 1]) {
        records.push({ degree: lines[index], school: lines[index + 1], location: '', year: '', details: '' });
        index += 1;
      }
    }
    return records;
  }

  const records = anchors.map(({ index, year }) => {
    const lineText = stripDate(lines[index]);
    let school = lineText;
    let schoolIndex = index;
    let degreeIndex = index - 1;
    let degree = '';

    if (!lineText) {
      schoolIndex = Math.max(0, index - 1);
      school = lines[schoolIndex] || '';
      degreeIndex = schoolIndex - 1;
      degree = lines[degreeIndex] || '';
    } else if (looksLikeDegree(lineText) && !looksLikeInstitution(lineText)) {
      degree = lineText;
      degreeIndex = index;
      schoolIndex = index + 1;
      school = lines[schoolIndex] || '';
    } else {
      degree = lines[degreeIndex] || '';
    }

    if (!looksLikeDegree(degree) && degreeIndex >= 0) {
      const previous = lines[degreeIndex];
      if (previous && !/^gpa\s*:/i.test(previous) && !parseDateRange(previous).start) degree = previous;
    }
    return { degree, school, schoolIndex, dateIndex: index, degreeIndex, year, details: '' };
  }).filter((item) => item.degree || item.school);

  records.forEach((record, index) => {
    const next = records[index + 1];
    const detailsStart = Math.max(record.dateIndex, record.schoolIndex) + 1;
    const detailsEnd = next ? next.degreeIndex : lines.length;
    record.details = lines.slice(detailsStart, Math.max(detailsStart, detailsEnd)).filter((line) => !looksLikeDegree(line)).join('\n');
    delete record.schoolIndex;
    delete record.dateIndex;
    delete record.degreeIndex;
  });
  return records;
}

function parseProjects(lines) {
  return lines.filter(Boolean).map((line) => {
    const colon = line.indexOf(':');
    const heading = colon >= 0 ? line.slice(0, colon).trim() : line.trim();
    const description = colon >= 0 ? line.slice(colon + 1).trim() : '';
    const withTech = heading.match(/^(.+?)\s*\(([^()]*)\)\s*$/);
    return {
      name: withTech ? withTech[1].trim() : heading,
      technologies: withTech ? withTech[2].trim() : '',
      description,
    };
  }).filter((item) => item.name || item.description);
}

export function parseResumeText(rawText) {
  const lines = normalizeLines(rawText);
  const blocks = collectSections(lines);
  const allText = lines.join('\n');
  const preamble = blocks.before;
  const name = preamble.find((line) => line.length <= 70 && !isLikelyContactLine(line) && !line.includes(':') && !/^(?:resume|curriculum vitae|cv)$/i.test(line)) || '';
  const email = allText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const linkedin = extractUrl(allText, 'linkedin\\.com');
  const github = extractUrl(allText, 'github\\.com');
  const phone = extractPhone(preamble);
  const location = extractLocation(preamble, name, email, phone);
  const experience = parseExperience(blocks.experience);
  const education = parseEducation(blocks.education);
  const projects = parseProjects(blocks.projects);
  const summary = blocks.summary.join(' ').replace(/\s+/g, ' ').trim();
  const skills = parseSkills(blocks.skills);
  const targetRole = preamble.find((line) => line !== name && !isLikelyContactLine(line) && looksLikeTitle(line))
    || (experience[0]?.role || '').replace(/\b(?:intern|internship)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  const websitePattern = /(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|me|lk|co|app|ai|tech)(?:\/[^\s|,)]*)?/ig;
  const websiteText = allText.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
  const website = (websiteText.match(websitePattern) || []).map(cleanLink).find((url) => !/^(?:linkedin|github)\.com\//i.test(url)) || '';
  const resumeTitle = name ? `Resume · ${name}` : 'Imported resume';

  return {
    resumeTitle, name, targetRole, email, phone, location, linkedin, github, website,
    summary, experiences: experience, projects, education, skills,
  };
}
