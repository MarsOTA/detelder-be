const db = require('../db')

module.exports.creaEvento = async (evento) => {
    const sql = `
      INSERT INTO evento(
        idCliente,
        idBrand,
        idIndirizzo,
        indirizzo,
        dataIniziale,
        dataFinale,
        note,
        dataInserimento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
        evento.idCliente,
        evento.idBrand,
        evento.idIndirizzo,
        evento.indirizzo,
        evento.dataIniziale,
        evento.dataFinale,
        evento.note
    ];

    const [result] = await db.query(sql, values);

    const idEventoCreato = result.insertId;
    console.log("Id evento Creato: " + idEventoCreato);

    // UPDATE nomeEvento
    const updateSql = `
    UPDATE evento ev
    LEFT JOIN cliente c ON c.idCliente = ev.idCliente
    LEFT JOIN brand b ON b.idBrand = ev.idBrand
    SET ev.nomeEvento = UPPER(
      CONCAT(
        COALESCE(NULLIF(c.short_name, ''), c.ragioneSociale),
        '-',
        COALESCE(NULLIF(b.short_name, ''), b.nome),
        '-id_',
        ?
      )
    )
    WHERE ev.idEvento = ?
    `;

    await db.query(updateSql, [idEventoCreato, idEventoCreato]);


    return idEventoCreato;
};

/*

  update evento ev
  LEFT JOIN cliente c ON c.idCliente = ev.idCliente
  LEFT JOIN brand b ON b.idBrand = ev.idBrand
  SET ev.nomeEvento = UPPER(
      CONCAT(
          c.ragioneSociale,
          '-',
          b.nome,
          '-id_',
          idEventoCreato
      )
  )

*/

module.exports.aggiornaEvento = async (evento, idEvento) => {
    const sql = `
        UPDATE evento 
        SET 
            idIndirizzo = ?,  
            dataIniziale = ?,  
            dataFinale = ?, 
            codiceAttivita = ?, 
            nomeCognomeReferente = ?, 
            telefonoReferente = ?, 
            note = ? 
        WHERE idEvento = ?
    `;

    const values = [
        evento.idIndirizzo,
        evento.dataIniziale,
        evento.dataFinale,
        evento.codiceAttivita,
        evento.nomeCognomeReferente,
        evento.telefonoReferente,
        evento.note,
        idEvento
    ];

    await db.query(sql, values);
};

module.exports.modificaNomeEvento = async (evento, idEvento) => {
    const sql = "UPDATE evento SET nomeEvento = ? WHERE idEvento = ?";
    const values = [evento.nomeEvento, idEvento];
    await db.query(sql, values);
}

module.exports.ottieniListaEventi = async () => {
    const query = "SELECT ev.nomeEvento, ev.idEvento, ev.dataIniziale, ev.dataFinale, cl.ragioneSociale, br.nome as nomeBrand  FROM evento ev  join cliente cl on ev.idCliente = cl.idCliente join brand br on br.idBrand = ev.idBrand ";
    const [records] = await db.query(query);
    return records;
}


module.exports.ottieniListaTurniEventi = async (dataInizio, dataFine, keyword) => {
    // Costruiamo la query base
    let sql = `
        SELECT 
            turOp.dataTurno,
            turOp.oraInizio,
            turOp.oraFine,
            turOp.tipologiaTurno,
            turOp.tipoMansione,
            turOp.orePausa,
            dip.id AS idDipendente,
            dip.nome,
            dip.cognome,
            dip.nickname,
            ev.nomeEvento,
            ev.idEvento,
            ev.dataIniziale,
            ev.dataFinale,
            cl.ragioneSociale,
            br.nome AS nomeBrand
        FROM evento ev
        LEFT JOIN turnoOperatore turOp ON turOp.idEvento = ev.idEvento
        LEFT JOIN dipendenti dip ON turOp.idOperatore = dip.id
        LEFT JOIN cliente cl ON ev.idCliente = cl.idCliente
        LEFT JOIN brand br ON br.idBrand = ev.idBrand
        WHERE ev.dataFinale >= ? AND ev.dataIniziale <= ?
    `;

    // Valori iniziali per la query
    const values = [dataInizio, dataFine];

    // Se è presente la keyword, aggiungiamo il filtro LIKE
    if (keyword && keyword.trim() !== '') {
        sql += `
            AND (
                ev.nomeEvento LIKE ? OR
                dip.nome LIKE ? OR
                dip.cognome LIKE ? OR
                cl.ragioneSociale LIKE ? OR
                br.nome LIKE ?
            )
        `;
        const likeKeyword = `%${keyword}%`;
        values.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    sql += ' ORDER BY ev.dataFinale DESC, turOp.dataTurno ASC';

    const [records] = await db.query(sql, values);
    return records;
};


module.exports.ottieniDatiReport = async (dataInizio, dataFine, keyword) => {
    // Costruiamo la query base
    let sql = `
        SELECT 
            turOp.dataTurno,  
            turOp.oraInizio as DA,  
            turOp.oraFine AS A, 
            cl.ragioneSociale AS Cliente, 
            br.nome AS Brand,  
            ev.indirizzo, 
            turOp.tipologiaTurno AS Attivita,
            CONCAT(dip.nome, ' ', dip.cognome) AS operatore,
            dip.telefono AS Cell                             
        FROM evento ev
        LEFT JOIN turnoOperatore turOp ON turOp.idEvento = ev.idEvento
        LEFT JOIN dipendenti dip ON turOp.idOperatore = dip.id
        LEFT JOIN cliente cl ON ev.idCliente = cl.idCliente
        LEFT JOIN brand br ON br.idBrand = ev.idBrand
        WHERE ev.dataFinale >= ? AND ev.dataIniziale <= ?
    `;

    // Valori iniziali per la query
    const values = [dataInizio, dataFine];

    // Se è presente la keyword, aggiungiamo il filtro LIKE
    if (keyword && keyword.trim() !== '') {
        sql += `
            AND (
                ev.nomeEvento LIKE ? OR
                dip.nome LIKE ? OR
                dip.cognome LIKE ? OR
                cl.ragioneSociale LIKE ? OR
                br.nome LIKE ?
            )
        `;
        const likeKeyword = `%${keyword}%`;
        values.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    sql += ' ORDER BY ev.dataFinale DESC, turOp.dataTurno ASC';

    const [records] = await db.query(sql, values);
    return records;
};




