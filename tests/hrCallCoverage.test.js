'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {coversDay,extractPeriods,periodsForCall,hasAnnulmentFlag}=require('../services/hrCallCoverage');

const exampleXml=[
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<moduloIntermittenti><Campi>',
  '<DTdatainizio1\n>18/11/2026</DTdatainizio1\n>',
  '<DTdatafine1\n>19/11/2026</DTdatafine1\n>',
  '<DTdatainizio2>22/11/2026</DTdatainizio2>',
  '<DTdatafine2>22/11/2026</DTdatafine2>',
  '</Campi></moduloIntermittenti>'
].join('');

test('Acrobat XML: contiguous plus isolated day, never mark gap as covered',()=>{
  const call={dal:'2026-11-18',al:'2026-11-22',xml:exampleXml};
  assert.deepEqual(extractPeriods(exampleXml),[
    {inizio:'2026-11-18',fine:'2026-11-19'},
    {inizio:'2026-11-22',fine:'2026-11-22'}
  ]);
  for(const day of ['2026-11-18','2026-11-19','2026-11-22'])assert.equal(coversDay(call,day),true);
  for(const day of ['2026-11-20','2026-11-21','2026-11-23'])assert.equal(coversDay(call,day),false);
});
test('single-day call: date end equals start',()=>{
  const xml='<DTdatainizio1>18/11/2026</DTdatainizio1><DTdatafine1>18/11/2026</DTdatafine1>';
  assert.equal(coversDay({xml},'2026-11-18'),true);
  assert.equal(coversDay({xml},'2026-11-19'),false);
});
test('legacy Acrobat XML without date end also means one day',()=>{
  const xml='<DTdatainizio1>18/11/2026</DTdatainizio1>';
  assert.deepEqual(extractPeriods(xml),[{inizio:'2026-11-18',fine:'2026-11-18'}]);
});
test('legacy calls WITHOUT XML preserve original date range',()=>{
  assert.equal(coversDay({dal:'2026-11-18',al:'2026-11-20'},'2026-11-19'),true);
});
test('invalid XML never falls back to broad outer period',()=>{
  assert.deepEqual(periodsForCall({xml:'<broken>',dal:'2026-11-18',al:'2026-11-22'}),[]);
  assert.equal(coversDay({xml:'<broken>',dal:'2026-11-18',al:'2026-11-22'},'2026-11-20'),false);
});

test('Acrobat/XFA annullamento accepts whitespace before closing angle bracket',()=>{
 assert.equal(hasAnnulmentFlag('<moduloIntermittenti><Campi><ANannullamento\n>1</ANannullamento\n></Campi></moduloIntermittenti>'),true);
 assert.equal(hasAnnulmentFlag('<ANannullamento>0</ANannullamento>'),false);
});
