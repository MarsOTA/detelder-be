const mysql = require('mysql2/promise')

const isAiven = /(?:^|\.)aivencloud\.com$/i.test(process.env.DB_HOST || '')

const mysqlConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'user3zyStaff',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'ezystaff',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000
}

// Aiven presents a publicly trusted certificate and requires encrypted connections.
// Local development remains compatible with MySQL instances that do not expose TLS.
if (isAiven) {
    mysqlConfig.ssl = { rejectUnauthorized: true }
}

const mysqlPool = mysql.createPool(mysqlConfig)

module.exports = mysqlPool
