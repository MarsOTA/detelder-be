'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {effectiveRole,hasRole}=require('../services/hrPermissions');
test('ADMIN_HR combines both workflows',()=>{
 assert.equal(hasRole('ADMIN_HR',['ADMIN']),true);
 assert.equal(hasRole('ADMIN_HR',['HR']),true);
});
test('legacy ADMIN and HR remain separate',()=>{
 assert.equal(hasRole('ADMIN',['HR']),false);
 assert.equal(hasRole('HR',['ADMIN']),false);
});
test('primary admin with HR assignment retains administrator privileges',()=>{
 assert.equal(effectiveRole('ADMIN','HR'),'ADMIN_HR');
 assert.equal(effectiveRole('ADMIN','ADMIN_HR'),'ADMIN_HR');
 assert.equal(effectiveRole('ADMIN',null),'ADMIN');
});
test('operator receives only explicitly granted module role',()=>{
 assert.equal(effectiveRole('OPERATORE',null),null);
 assert.equal(effectiveRole('OPERATORE','HR'),'HR');
 assert.equal(effectiveRole('OPERATORE','ADMIN_HR'),'ADMIN_HR');
});
test('unrecognized role cannot authorize protected actions',()=>{
 assert.equal(hasRole('OPERATORE',['HR','ADMIN']),false);
 assert.equal(hasRole(null,['HR']),false);
});
