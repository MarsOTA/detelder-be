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

// Aiven richiede TLS.
// Su Vercel la CA viene fornita tramite DB_CA_CERT.
if (isAiven) {
    if (!process.env.DB_CA_CERT) {
        throw new Error('DB_CA_CERT is required for Aiven MySQL connections')
    }

    mysqlConfig.ssl = {
        ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n'),
        rejectUnauthorized: true
    }
}

const mysqlPool = mysql.createPool(mysqlConfig)

module.exports = mysqlPool
