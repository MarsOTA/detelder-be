const db = require('../db')

module.exports.creaCliente = async (cliente) => {
    await db.query("INSERT INTO cliente(ragioneSociale, short_name , piva_cfiscale, disabilitato, dataInserimento) VALUES (?,?,?,false,NOW())", [cliente.ragioneSociale, cliente.shortName, cliente.piva_cfiscale]);
    await db.query("SELECT ROW_COUNT() AS 'affectedRows'");
    return 1;
}

module.exports.creaReferente = async (referente) => {
    await db.query("INSERT INTO referente(idCliente, nome, email, telefono, disabilitato, dataInserimento) VALUES (?,?,?,?,false,NOW())", [referente.idCliente, referente.nome, referente.email, referente.telefono]);
    await db.query("SELECT ROW_COUNT() AS 'affectedRows'");
    return 1;
}

module.exports.creaBrand = async (brand) => {
    await db.query("INSERT INTO brand(idCliente, nome, short_name, disabilitato, dataInserimento) VALUES (?,?,?,false,NOW())", [brand.idCliente, brand.nome , brand.shortName]);
    await db.query("SELECT ROW_COUNT() AS 'affectedRows'");
    return 1;
}

module.exports.creaInidirizzoBrand = async (idBrand, via) => {
    const query = `
      INSERT INTO inidirizzo_brand (
        idBrand,
        via,
        disabilitato,
        dataInserimento
      )
      VALUES (
        ?,
        ?,
        false,
        NOW()
      )
    `;

    const params = [
        idBrand,
        via,
    ];

    const [result] = await db.query(query, params);

    const idIndirizzoCreato = result.insertId;
    console.log("Id indirizzo creato:", idIndirizzoCreato);

    return idIndirizzoCreato;
};


module.exports.ottieniClienteByPiva_cfiscale = async (piva_cfiscale) => {
    console.log("piva_cfiscale: ", piva_cfiscale);
    const [[record]] = await db.query("SELECT * FROM cliente WHERE piva_cfiscale = ?", [piva_cfiscale]);
    return record;
}

module.exports.ottieniListaClienti = async () => {
    const [records] = await db.query("SELECT idCliente,  ragioneSociale , piva_cfiscale , short_name as shortName  FROM cliente where disabilitato = false order by ragioneSociale asc");
    return records;
}

module.exports.disabilitaCliente = async (idCliente) => {
    const [records] = await db.query("UPDATE cliente set disabilitato = true WHERE idCliente = ?", [idCliente]);
    return records;
}

module.exports.ottieniListaReferentiCliente = async (selectedClientId) => {
    const [records] = await db.query("SELECT * FROM referente WHERE disabilitato = false and idCliente = ?", [selectedClientId]);
    return records;
}

module.exports.ottieniListaBrandsCliente = async (selectedClientId) => {
    const [records] = await db.query(`
        SELECT 
            b.idBrand, 
            b.nome as brandNome, 
            b.short_name as brandShortName,
            i.idIndirizzo, 
            i.via, 
            i.disabilitato 
        FROM brand b  
        LEFT JOIN inidirizzo_brand i 
            ON b.idBrand = i.idBrand 
            AND i.disabilitato = 0
        WHERE 
            b.disabilitato = 0 
            AND b.idCliente = ?
        ORDER BY 
            b.nome ASC,
            i.via ASC
    `, [selectedClientId]);
    return records;
}

module.exports.disabilitaReferente = async (idReferente) => {
    const [records] = await db.query("UPDATE referente set disabilitato = true WHERE idReferente = ?", [idReferente]);
    return records;
}

module.exports.disabilitaBrand = async (idBrand) => {
    const [records] = await db.query("UPDATE brand set disabilitato = true WHERE idBrand = ?", [idBrand]);
    return records;
}

module.exports.disabilitaInidirizzoBrand = async (idIndirizzo) => {
    const [records] = await db.query("UPDATE inidirizzo_brand set disabilitato = true WHERE idIndirizzo = ?", [idIndirizzo]);
    return records;
}

module.exports.aggiornaReferente = async (refernte, idReferente) => {
    const [records] = await db.query("UPDATE referente set nome = ?, email = ?, telefono = ? WHERE idReferente = ?", [refernte.nome, refernte.email, refernte.telefono, idReferente]);
    return records;
}

module.exports.aggiornaBrand = async (brand, idBrand) => {
    const [records] = await db.query("UPDATE brand set nome = ?, short_name = ? WHERE idBrand = ?", [brand.nome, brand.shortName, idBrand]);
    return records;
}

module.exports.aggiornaCliente = async (cliente, idCliente) => {
    const [records] = await db.query("UPDATE cliente set ragioneSociale = ?, short_name = ? , piva_cfiscale = ? WHERE idCliente = ?", [cliente.ragioneSociale, cliente.shortName, cliente.piva_cfiscale, idCliente]);
    return records;
}
