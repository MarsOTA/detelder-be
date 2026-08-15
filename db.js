const mysql = require('mysql2/promise')

const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: 'user3zyStaff',
    password: process.env.DB_PASS,
    database: 'ezystaff',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000
})

module.exports = mysqlPool