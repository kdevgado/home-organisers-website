// Shared by both public mail endpoints. Never log the submitted body.
export function parseEnquiry(event) {
  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
  if (Buffer.byteLength(body, 'utf8') > 16000) return { status: 413, error: 'Form data is too large' };
  const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'];
  if (contentType && !/^application\/json(?:\s*;|$)/i.test(contentType)) return { status: 415, error: 'Please send JSON form data' };
  let data;
  try { data = JSON.parse(body); } catch { return { status: 400, error: 'Invalid JSON body' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 400, error: 'Invalid form data' };
  if (data.website || data['bot-field']) return { spam: true };
  const limits = { name: 120, email: 254, phone: 40, address: 300, suburb: 120, service: 250, contact_method: 20, referral_source: 120, enquiry_role: 80, message: 4000, booking_date: 100, form_type: 30 };
  for (const [key, limit] of Object.entries(limits)) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== 'string' || data[key].length > limit || (key !== 'message' && (/[\r\n]/.test(data[key]) || data[key].includes(String.fromCharCode(0))))) {
      return { status: 400, error: 'Please provide valid contact details and shorter notes' };
    }
    data[key] = data[key].trim();
  }
  // Accept one plain mailbox, never a recipient list, display name or group.
  if (!data.name || !/^[^\s@<>,;:()[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(data.email || '')) return { status: 400, error: 'Name and a valid email are required' };
  if (data.form_type && data.form_type !== 'follow-us') return { status: 400, error: 'Unknown form type' };
  if (data.form_type === 'follow-us') {
    if (data.consent !== true) return { status: 400, error: 'Please agree to receive promotional updates' };
    return { data };
  }
  if (data.service === 'Competition Entry') return { status: 410, error: 'This competition has closed' };
  if (!data.suburb && !data.address) return { status: 400, error: 'Please provide your suburb or town' };
  if (data.contact_method && !['Email', 'Phone', 'SMS'].includes(data.contact_method)) return { status: 400, error: 'Choose a valid contact method' };
  if (['Phone', 'SMS'].includes(data.contact_method) && (!/^[+()\d\s.-]{6,40}$/.test(data.phone || '') || (data.phone.match(/\d/g) || []).length < 6)) return { status: 400, error: 'Please provide a phone number for phone or SMS replies' };
  if (data.services !== undefined) {
    const services = Array.isArray(data.services) ? data.services : typeof data.services === 'string' ? data.services.split(',') : null;
    if (!services || services.length > 10 || services.some(s => typeof s !== 'string' || s.length > 120 || (/[\r\n]/.test(s) || s.includes(String.fromCharCode(0))))) return { status: 400, error: 'Invalid services' };
    data.services = services.map(s => s.trim()).filter(Boolean);
  }
  if (data.booking_date) {
    const date = data.booking_date;
    const parsed = new Date(`${date}T00:00:00Z`);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date || date < today) return { status: 400, error: 'Please choose today or a future date' };
  }
  return { data };
}
