const db = require('../db')

module.exports.ottieniListaSessioni = async () => {
    const [records] = await db.query("SELECT * FROM sessione")
    return records;
}

module.exports.ottieniSessioneByAccessToken = async (sessione) => {
    const [[record]] = await db.query("SELECT * FROM sessione WHERE sessione = ?", [sessione])       
    return record;
}


module.exports.aggiornaScadenzaSessione = async (idSessione) => {
    const [{ affectedRows }] = await db.query("UPDATE sessione SET dataAggiornamento = NOW() WHERE idSessione = ?", [idSessione])
    return affectedRows;
}

module.exports.saveOrUpdateSessione = async (idDipendente, sessione, idSessione = 0) => {
    const [[[{affectedRows}]]] = await db.query("CALL saveOrUpdateSessione(?,?,?)", [idSessione, idDipendente, sessione])
    return affectedRows;
}