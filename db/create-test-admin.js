require('dotenv-flow').config()

const bcrypt = require('bcrypt')
const db = require('../db')

async function createTestAdmin() {
    const email = process.env.TEST_ADMIN_EMAIL
    const password = process.env.TEST_ADMIN_PASSWORD

    if (!email || !password) {
        throw new Error('Impostare TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await db.execute(
        `INSERT INTO dipendenti
            (nome, cognome, email, prefisso, telefono, gpg, username, password, ruolo, stato)
         VALUES ('Test', 'Admin', ?, '+39', ?, FALSE, ?, ?, 'ADMIN', 'ATTIVO')`,
        [email, `test-admin-${Date.now()}`, email, passwordHash]
    )

    console.log(`ADMIN di test creato con id ${result.insertId}`)
}

createTestAdmin()
    .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
    .finally(() => db.end())
