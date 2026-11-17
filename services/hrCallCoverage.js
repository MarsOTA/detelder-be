'use strict';

// A communication can contain up to ten NON-contiguous ministerial prestations.
// The outer date interval is used for ordering, not as proof of every day within it.
// Keep this rule server-side; do not infer coverage from MIN(date)..MAX(date).
function normalizeDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 10);
  }
  const text=String(value||'').trim();
  let match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return text;
  match=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? match[3]+'-'+match[2]+'-'+match[1] : '';
}
function xmlField(xml, name) {
  // Compatible with Acrobat/XFA, which may insert whitespace before closing ">".
  const regex=new RegExp('<'+name+'\\s*>([^<]*)<\\/'+name+'\\s*>','i');
  return regex.exec(xml)?.[1]?.trim() || '';
}
function extractPeriods(xml) {
  if (typeof xml!=='string'||!xml.trim()) return [];
  const result=[];
  for (let i=1;i<=10;i++) {
    const start=normalizeDate(xmlField(xml,'DTdatainizio'+i));
    if (!start) continue;
    const end=normalizeDate(xmlField(xml,'DTdatafine'+i))||start;
    if (end>=start) result.push({inizio:start,fine:end});
  }
  return result;
}
function periodsForCall(call) {
  if (!call) return [];
  const xml=call.xml ?? call.xmlArchiviato;
  // If an XML is present, NEVER fall back to the outer date range when its
  // periods are missing or invalid: this could falsely mark gaps as covered.
  if (typeof xml==='string' && xml.trim()) return extractPeriods(xml);
  const start=normalizeDate(call.dal ?? call.dataInizio);
  const end=normalizeDate(call.al ?? call.dataFine)||start;
  return start && end>=start ? [{inizio:start,fine:end}] : [];
}
function coversDay(call, day) {
  const normalized=normalizeDate(day);
  if (!normalized) return false;
  return periodsForCall(call).some(p=>p.inizio<=normalized&&p.fine>=normalized);
}
function hasAnnulmentFlag(xml) {
  return typeof xml==='string' && /<ANannullamento\s*>\s*1\s*<\/ANannullamento\s*>/i.test(xml);
}
module.exports={normalizeDate,extractPeriods,periodsForCall,coversDay,hasAnnulmentFlag};
