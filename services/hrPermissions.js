'use strict';
// A role is an entitlement, not a string supplied by the client.
// ADMIN_HR grants both existing ADMIN and HR privileges without changing
// the semantics of either legacy role.
const grants=Object.freeze({
 ADMIN:Object.freeze(['ADMIN']),
 HR:Object.freeze(['HR']),
 ADMIN_HR:Object.freeze(['ADMIN','HR'])
});
function effectiveRole(primary,assigned) {
 if(primary==='ADMIN'&&assigned==='HR') return 'ADMIN_HR';
 if(assigned&&Object.prototype.hasOwnProperty.call(grants,assigned))return assigned;
 return primary==='ADMIN'?'ADMIN':null;
}
const hasRole=(role,allowed)=>Array.isArray(allowed)&&allowed.some(requested=>grants[role]?.includes(requested));
module.exports={effectiveRole,hasRole};
