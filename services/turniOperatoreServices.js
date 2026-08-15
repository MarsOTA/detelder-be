const db = require('../db')
const mysql = require('mysql2/promise')

module.exports.creaTurnoOperatore = async (turno, dataTurno) => {
    const query = `
      INSERT INTO turnoOperatore (
        idEvento,
        teamLeader,
        dataTurno,
        oraInizio,
        oraFine,
        tipologiaTurno,
        tipoMansione,
        orePausa,
        noteTurno,
        dataInserimento
      ) VALUES (?, false, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
        turno.idEvento,
        new Date(dataTurno),
        turno.oraInizio,
        turno.oraFine,
        turno.tipologiaTurno,
        turno.tipoMansione,
        turno.orePausa,
        turno.noteTurno
    ];

    await db.query(query, params);
};

module.exports.modificaTurnoOperatore = async (operatore, idTurno) => {
    const sql = "UPDATE turnoOperatore SET  idOperatore = ?, teamLeader = ?, dataTurno = ?, oraInizio = ?, oraFine = ?, orePausa = ?, tipologiaTurno = ?, tipoMansione = ? WHERE idTurno = ?";
    const values = [operatore.idOperatore, operatore.teamLeader, operatore.dataTurno, operatore.oraInizio, operatore.oraFine, operatore.orePausa, operatore.tipologiaTurno, operatore.tipoMansione, idTurno];
    await db.query(sql, values);
}

module.exports.modificaTurniOperatoreBatch = async (turni) => {

    const sql = `
        UPDATE turnoOperatore 
        SET  
            idOperatore = ?, 
            teamLeader = ?, 
            dataTurno = ?, 
            oraInizio = ?, 
            oraFine = ?, 
            orePausa = ?, 
            tipologiaTurno = ?, 
            tipoMansione = ? 
        WHERE idTurno = ?
    `;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const operatore of turni) {

            const values = [
                operatore.idOperatore,
                operatore.teamLeader,
                operatore.dataTurnoFormattato,
                operatore.oraInizio,
                operatore.oraFine,
                operatore.orePausa,
                operatore.tipologiaTurno,
                operatore.tipoMansione,
                operatore.idTurno
            ];

            await connection.query(sql, values);
        }

        await connection.commit();


    } catch (error) {

        await connection.rollback();

        console.error("Errore update batch turni:", error);

    } finally {
        connection.release();
    }
};

module.exports.ottieniListaTurniOperatore = async (idOperatore) => {
    const [records] = await db.query("SELECT toper.idTurno ,  toper.dataTurno, toper.oraInizo, toper.oraFine, toper.teamLeader, ev.titoloEvento FROM turnoOperatore toper join evento ev on toper.idEvento = ev.idEvento  where idOperatore = ? order by toper.dataInserimento desc"
        , [idOperatore])
    return records;
}

module.exports.ottieniListaTurni = async (dataInizio, dataFine, keyword) => {
    let sql = `
        SELECT 
            toper.idTurno,
            toper.idCheckInCheckOut,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            toper.tipologiaTurno,
            toper.tipoMansione,
            COALESCE(toper.orePausa, 0.0) AS orePausa,
            CASE 
                WHEN dip.nickname IS NOT NULL AND dip.nickname <> ''
                    THEN dip.nickname
                    ELSE CONCAT(dip.nome, ' ', dip.cognome)
            END AS operatore,
            ev.nomeEvento,
            cli.ragioneSociale,
            bra.nome as nomeBrand,
            indbr.via,
            ev.idEvento
        FROM turnoOperatore toper
        LEFT JOIN evento ev ON toper.idEvento = ev.idEvento
        LEFT JOIN cliente cli ON cli.idCliente = ev.idCliente
        LEFT JOIN brand bra ON bra.idBrand = ev.idBrand
        LEFT JOIN dipendenti dip ON toper.idOperatore = dip.id
        LEFT JOIN inidirizzo_brand indbr ON ev.idIndirizzo = indbr.idIndirizzo
        WHERE toper.dataTurno >= ? AND toper.dataTurno <= ?
    `;

    const values = [dataInizio, dataFine];

    if (keyword && keyword.trim() !== '') {
        sql += `
            AND (
                ev.nomeEvento LIKE ? OR
                dip.nome LIKE ? OR
                dip.cognome LIKE ? OR
                toper.tipologiaTurno LIKE ? OR
                toper.tipoMansione LIKE ?
            )
        `;
        const likeKeyword = `%${keyword}%`;
        values.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    sql += ` ORDER BY  toper.dataTurno ASC, ev.nomeEvento ASC, toper.oraInizio ASC`;

    const [records] = await db.query(sql, values);
    return records;
};

module.exports.ottieniTurnoConTimbraturaInRitardo = async (idOperatore, dateTime) => {
    const sql =
        `SELECT 
          toper.idTurno,
          toper.dataInizio,
          toper.dataFine,
          ev.nomeEvento
       FROM view_turnoOperatore toper
       JOIN evento ev ON toper.idEvento = ev.idEvento
       WHERE toper.idOperatore = ?
         AND toper.dataInizio <= ?
         AND toper.dataFine >= ?
       ORDER BY toper.dataInizio ASC
       LIMIT 1`;

    const values = [idOperatore, dateTime, dateTime];
    const [records] = await db.query(sql, values);

    const fullQuery = mysql.format(sql, values);
    console.log('[SQL]', fullQuery);

    // Ritorna il primo record se esiste, altrimenti null
    return records[0] || null;
};

module.exports.ottieniTurnoConTimbraturaInAnticipo = async (idOperatore, dateTime) => {
    const sql = `
    SELECT 
        toper.idTurno,
        toper.dataInizio,
        toper.dataFine,
        ev.nomeEvento
    FROM view_turnoOperatore toper
    JOIN evento ev ON toper.idEvento = ev.idEvento
    WHERE toper.idOperatore = ?
         AND toper.dataInizio > ?
         AND DATE_SUB(toper.dataInizio, INTERVAL 30 MINUTE) <= ?
    ORDER BY toper.dataInizio ASC
    LIMIT 1
  `;

    const values = [idOperatore, dateTime, dateTime];
    const [records] = await db.query(sql, values);

    // const fullQuery = mysql.format(sql, values);
    // console.log('[SQL]', fullQuery);

    // Ritorna il primo record se esiste, altrimenti null
    return records[0] || null;
};


module.exports.ottieniTurnoAssociato = async (idOperatore, dateTime) => {
    const sql = `
        SELECT 
            toper.idTurno,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            toper.teamLeader,
            ev.nomeEvento,
            CASE 
                WHEN toper.oraInizio <= TIME(?) AND toper.oraFine >= TIME(?) THEN 1
                WHEN toper.oraInizio > TIME(?) THEN 2
                ELSE 3
            END AS priorita
        FROM turnoOperatore toper
        JOIN evento ev ON toper.idEvento = ev.idEvento
        WHERE toper.idOperatore = ?
          AND toper.dataTurno = DATE(?)
          AND (
              (toper.oraInizio <= TIME(?) AND toper.oraFine >= TIME(?))
              OR toper.oraInizio > TIME(?)
          )
        ORDER BY priorita ASC, toper.oraInizio ASC
        LIMIT 1
    `;

    const values = [
        dateTime, dateTime, dateTime,  // per il CASE
        idOperatore,
        dateTime,
        dateTime, dateTime, dateTime   // per il WHERE
    ];

    const [records] = await db.query(sql, values);
    const fullQuery = mysql.format(sql, values);
    console.log('[SQL]', fullQuery);

    return records[0] || null;
};


module.exports.ottieniTurnoConTimbratura = async (idOperatore, dateTime) => {
    const sql = `
      (
        SELECT 
          toper.idTurno,
          toper.dataTurno,
          toper.oraInizio,
          toper.oraFine,
          toper.teamLeader,
          ev.nomeEvento
       FROM turnoOperatore toper
       JOIN evento ev ON toper.idEvento = ev.idEvento
       WHERE toper.idOperatore = ?
         AND toper.dataTurno = DATE(?)
         AND toper.oraInizio <= TIME(?)
         AND toper.oraFine >= TIME(?)
       LIMIT 1
      )
      UNION ALL
      (
    SELECT 
        toper.idTurno,
        toper.dataTurno,
        toper.oraInizio,
        toper.oraFine,
        toper.teamLeader,
        ev.nomeEvento
    FROM turnoOperatore toper
    JOIN evento ev ON toper.idEvento = ev.idEvento
    WHERE toper.idOperatore = ?
         AND toper.dataTurno = DATE(?)
         AND toper.oraInizio > TIME(?)
    ORDER BY toper.dataTurno ASC
    LIMIT 1
      )
    `;

    const values = [
        idOperatore, dateTime, dateTime, dateTime, // primi 4 per il primo SELECT
        idOperatore, dateTime, dateTime            // ultimi 3 per il secondo SELECT
    ];

    const [records] = await db.query(sql, values);
    const fullQuery = mysql.format(sql, values);
    console.log('[SQL]', fullQuery);

    return records[0] || null;
};


module.exports.numeroTurniGiaAssagnatiOperatore = async (turno) => {
    const dataTurno = new Date(turno.dataTurno);
    const dataTurnoDate = dataTurno.toISOString().split('T')[0];
    const [records] = await db.query("select count(*) as totale from turnoOperatore where idOperatore = ? and dataTurno = ?  and oraFine > ? and oraInizo < ? ", [turno.idOperatore, dataTurnoDate, turno.oraInizo, turno.oraFine]);
    const turniTrovati = records[0].totale;
    return turniTrovati;
}

module.exports.ottieniListaTurniPerEvento = async (idEvento, dataInizio) => {
    const query = `
      SELECT 
        tro.idTurno,
        tro.idOperatore,
        dip.nome AS nomeOperatore,
        dip.cognome AS cognomeOperatore,
        dip.nickname AS nicknameOperatore,
        tro.dataTurno,
        tro.oraInizio,
        tro.oraFine,
        tro.orePausa,
        tro.tipologiaTurno,
        tro.tipoMansione,
        tro.teamLeader,
        CASE 
            WHEN tro.teamLeader = 1 THEN TRUE
            ELSE FALSE
        END AS teamLeader,        
        tro.noteTurno
      FROM turnoOperatore tro
      LEFT JOIN dipendenti AS dip 
        ON tro.idOperatore = dip.id
      WHERE idEvento = ? AND tro.dataTurno >= ?
      ORDER BY tro.dataTurno ASC, tro.oraInizio ASC
    `;

    const [records] = await db.query(query, [idEvento, dataInizio]);
    return records;
}

module.exports.ottieniDatiEvento = async (idEvento) => {
    const sql = `
        SELECT 
            ev.nomeEvento,
            ev.idEvento,
            DATE_FORMAT(ev.dataIniziale, '%Y-%m-%d') AS dataIniziale,
            DATE_FORMAT(ev.dataFinale, '%Y-%m-%d') AS dataFinale,
            ev.codiceAttivita,
            ev.nomeCognomeReferente,
            ev.telefonoReferente,
            ev.note,
            cli.ragioneSociale,
            brnd.nome AS nomeBrand,
            ind.via AS indirizzo,
            ev.idIndirizzo
        FROM evento ev
        JOIN cliente cli 
            ON ev.idCliente = cli.idCliente
        JOIN brand brnd 
            ON ev.idBrand = brnd.idBrand
        LEFT JOIN inidirizzo_brand ind
            ON ev.idIndirizzo = ind.idIndirizzo            
        WHERE ev.idEvento = ?
    `;

    const [rows] = await db.query(sql, [idEvento]);

    return rows[0]; // più chiaro di [[records]]
};


module.exports.ottieniListaIndirizzi = async (idEvento) => {
    const sql = `
        SELECT 
            ind.idIndirizzo, 
            ind.via
        FROM evento ev
        JOIN inidirizzo_brand ind
            ON ind.idBrand = ev.idBrand
        WHERE ev.idEvento = ?
          AND ind.disabilitato = 0
    `;

    const [rows] = await db.query(sql, [idEvento]);

    return rows;
};


module.exports.ottieniTurniDaCopiare = async (filtroData, idEvento) => {
    const sql = `
      SELECT
        idOperatore,
        idEvento,
        teamLeader,
        oraInizio,
        oraFine,
        orePausa,
        tipologiaTurno,
        tipoMansione,
        noteTurno
      FROM turnoOperatore
      WHERE dataTurno = ?
        AND idEvento = ?
    `;

    const [rows] = await db.query(sql, [filtroData, idEvento]);

    return rows;
};


module.exports.inserisciTurnoCopiato = async (turno, data) => {
    const sql = `
          INSERT INTO turnoOperatore (
            idOperatore,
            idEvento,
            teamLeader,
            dataTurno,
            oraInizio,
            oraFine,
            orePausa,
            tipologiaTurno,
            tipoMansione,
            noteTurno,
            dataInserimento
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [rows] = await db.query(sql, [
        turno.idOperatore,
        turno.idEvento,
        turno.teamLeader,
        data.toISOString().split("T")[0], // formato YYYY-MM-DD
        turno.oraInizio,
        turno.oraFine,
        turno.orePausa,
        turno.tipologiaTurno,
        turno.tipoMansione,
        turno.noteTurno,
    ]);

    return rows;
};


module.exports.ottieniTurniGiornalieriOperatore = async (idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = "SELECT toper.idOperatore , toper.idTurno ,  toper.dataTurno, toper.oraInizio, toper.oraFine, toper.noteTurno, ev.idCliente, cli.ragioneSociale, brnd.nome as nomeBrand, ev.indirizzo as indirizzoBrand , ev.nomeCognomeReferente, ev.telefonoReferente FROM turnoOperatore toper join evento ev on toper.idEvento = ev.idEvento join cliente cli on ev.idCliente = cli.idCliente join brand brnd on ev.idBrand = brnd.idBrand  where idOperatore = ? and toper.dataTurno = ? order by toper.oraInizio asc";
    const [records] = await db.query(sql, [idOperatore, dataTurno]);
    return records;
}

/*
module.exports.ottieniTurniGiornalieriOperatoreEvento = async (idEvento, idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = "SELECT toper.idOperatore , toper.idTurno ,  toper.dataTurno, toper.oraInizio, toper.oraFine, toper.tipologiaTurno, toper.tipoMansione, toper.noteTurno, toper.teamLeader, ev.idCliente, cli.ragioneSociale, brnd.nome as nomeBrand, ev.nomeEvento , ev.indirizzo as indirizzoBrand , ev.nomeCognomeReferente, ev.telefonoReferente FROM turnoOperatore toper join evento ev on toper.idEvento = ev.idEvento join cliente cli on ev.idCliente = cli.idCliente join brand brnd on ev.idBrand = brnd.idBrand  where ev.idEvento = ? and idOperatore = ? and toper.dataTurno = ?  order by toper.oraInizio asc";
    const [records] = await db.query(sql, [idEvento, idOperatore, dataTurno]);
    return records;
}
*/

module.exports.ottieniTurniGiornalieriOperatoreEvento = async (
    idEvento,
    idOperatore,
    dataTurno
) => {
    console.log(`idOperatore: ${idOperatore}, dataTurno: ${dataTurno}`);

    const query = `
        SELECT 
            toper.idOperatore,
            toper.idTurno,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            toper.tipologiaTurno,
            toper.tipoMansione,
            toper.noteTurno,
            toper.teamLeader,
            ev.idCliente,
            cli.ragioneSociale,
            brnd.nome AS nomeBrand,
            ev.nomeEvento,
            indirizzo.via AS indirizzoBrand,
            ev.nomeCognomeReferente,
            ev.telefonoReferente
        FROM turnoOperatore AS toper
        JOIN evento AS ev 
            ON toper.idEvento = ev.idEvento
        JOIN cliente AS cli 
            ON ev.idCliente = cli.idCliente
        JOIN brand AS brnd 
            ON ev.idBrand = brnd.idBrand
        LEFT JOIN inidirizzo_brand AS indirizzo
            ON ev.idIndirizzo = indirizzo.idIndirizzo
        WHERE 
            ev.idEvento = ?
            AND toper.idOperatore = ?
            AND toper.dataTurno = ?
        ORDER BY 
            toper.oraInizio ASC
    `;

    const params = [idEvento, idOperatore, dataTurno];

    const [records] = await db.query(query, params);

    return records;
};

/*
module.exports.ottieniTurniGiornoPrecedenteOperatoreEvento = async (idEvento, idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = "SELECT toper.idOperatore , toper.idTurno ,  toper.dataTurno, toper.oraInizio, toper.oraFine, toper.tipologiaTurno, toper.tipoMansione, toper.noteTurno, toper.teamLeader, ev.idCliente, cli.ragioneSociale, brnd.nome as nomeBrand, ev.nomeEvento , ev.indirizzo as indirizzoBrand , ev.nomeCognomeReferente, ev.telefonoReferente FROM turnoOperatore toper join evento ev on toper.idEvento = ev.idEvento join cliente cli on ev.idCliente = cli.idCliente join brand brnd on ev.idBrand = brnd.idBrand  where toper.oraInizio > toper.oraFine and ev.idEvento = ? and idOperatore = ? and toper.dataTurno = ?  order by toper.oraInizio asc";
    const [records] = await db.query(sql, [idEvento, idOperatore, dataTurno]);
    return records;
}
    */

module.exports.ottieniTurniGiornoPrecedenteOperatoreEvento = async (
    idEvento,
    idOperatore,
    dataTurno
) => {
    console.log(`idOperatore: ${idOperatore}, dataTurno: ${dataTurno}`);

    const query = `
        SELECT 
            toper.idOperatore,
            toper.idTurno,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            toper.tipologiaTurno,
            toper.tipoMansione,
            toper.noteTurno,
            toper.teamLeader,
            ev.idCliente,
            cli.ragioneSociale,
            brnd.nome AS nomeBrand,
            ev.nomeEvento,
            indirizzo.via AS indirizzoBrand,
            ev.nomeCognomeReferente,
            ev.telefonoReferente
        FROM turnoOperatore AS toper
        JOIN evento AS ev 
            ON toper.idEvento = ev.idEvento
        JOIN cliente AS cli 
            ON ev.idCliente = cli.idCliente
        JOIN brand AS brnd 
            ON ev.idBrand = brnd.idBrand
        JOIN inidirizzo_brand AS indirizzo
            ON ev.idIndirizzo = indirizzo.idIndirizzo
        WHERE 
            toper.oraInizio > toper.oraFine
            AND ev.idEvento = ?
            AND toper.idOperatore = ?
            AND toper.dataTurno = ?
        ORDER BY 
            toper.oraInizio ASC
    `;

    const params = [idEvento, idOperatore, dataTurno];

    const [records] = await db.query(query, params);

    return records;
};

/*
module.exports.ottieniTurniFuturiOperatoreEvento = async (idEvento, idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = "SELECT toper.idOperatore , toper.idTurno ,  toper.dataTurno, toper.oraInizio, toper.oraFine, toper.tipologiaTurno, toper.tipoMansione, toper.noteTurno, ev.idCliente, cli.ragioneSociale, brnd.nome as nomeBrand, ev.nomeEvento , ev.indirizzo as indirizzoBrand , ev.nomeCognomeReferente, ev.telefonoReferente FROM turnoOperatore toper join evento ev on toper.idEvento = ev.idEvento join cliente cli on ev.idCliente = cli.idCliente join brand brnd on ev.idBrand = brnd.idBrand  where ev.idEvento = ? and idOperatore = ? and toper.dataTurno = ? ORDER BY toper.dataTurno ASC, toper.oraInizio ASC";
    const [records] = await db.query(sql, [idEvento, idOperatore, dataTurno]);
    return records;
}
    */

module.exports.ottieniTurniFuturiOperatoreEvento = async (
    idEvento,
    idOperatore,
    dataTurno
) => {
    console.log(`idOperatore: ${idOperatore}, dataTurno: ${dataTurno}`);

    const sql = `
        SELECT 
            toper.idOperatore,
            toper.idTurno,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            toper.tipologiaTurno,
            toper.tipoMansione,
            toper.noteTurno,
            ev.idCliente,
            cli.ragioneSociale,
            brnd.nome AS nomeBrand,
            ev.nomeEvento,
            indirizzo.via AS indirizzoBrand,
            ev.nomeCognomeReferente,
            ev.telefonoReferente
        FROM turnoOperatore AS toper
        JOIN evento AS ev 
            ON toper.idEvento = ev.idEvento
        JOIN cliente AS cli 
            ON ev.idCliente = cli.idCliente
        JOIN brand AS brnd 
            ON ev.idBrand = brnd.idBrand
        JOIN inidirizzo_brand AS indirizzo
            ON ev.idIndirizzo = indirizzo.idIndirizzo
        WHERE 
            ev.idEvento = ?
            AND toper.idOperatore = ?
            AND toper.dataTurno = ?
        ORDER BY 
            toper.dataTurno ASC,
            toper.oraInizio ASC
    `;

    const params = [idEvento, idOperatore, dataTurno];

    const [records] = await db.query(sql, params);

    return records;
};


module.exports.ottieniEventiGiornalieriOperatore = async (idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = "select distinct idEvento from turnoOperatore where idOperatore = ? and dataTurno = ?";
    const [records] = await db.query(sql, [idOperatore, dataTurno]);
    return records;
}

module.exports.ottieniEventiGiornoPrecedenteOperatore = async (idOperatore, dataTurno) => {
    console.log("[ottieniEventiGiornoPrecedenteOperatore]");
    console.log("idOperatore:", idOperatore);
    console.log("dataTurno:", dataTurno);

    const sql = "select distinct idEvento from turnoOperatore where oraInizio > oraFine and idOperatore = ? and dataTurno = ?";

    const formattedQuery = sql
        .replace("?", `"${idOperatore}"`)
        .replace("?", `"${dataTurno}"`);

    console.log("FULL SQL: ", formattedQuery);

    const [records] = await db.query(sql, [idOperatore, dataTurno]);
    return records;
};


module.exports.ottieniEventiFuturiOperatore_old = async (idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = `
        SELECT idEvento
            FROM (
            SELECT idEvento, MIN(dataTurno) AS primaData
            FROM turnoOperatore
            WHERE idOperatore = ?
                AND dataTurno > ?
            GROUP BY idEvento
            ) AS eventi_ordinati
            ORDER BY primaData ASC
        `;

    const [records] = await db.query(sql, [idOperatore, dataTurno]);
    return records;
}


module.exports.ottieniEventiFuturiOperatore = async (idOperatore, dataTurno) => {
    console.log("idOperatore: " + idOperatore + " dataTurno " + dataTurno);
    const sql = `
            SELECT DISTINCT idEvento, DATE_FORMAT(dataTurno, '%Y-%m-%d') AS dataTurno
            FROM turnoOperatore
            WHERE idOperatore = ?
            AND dataTurno > ?
            ORDER BY dataTurno ASC
        `;

    const [records] = await db.query(sql, [idOperatore, dataTurno]);
    return records;
}



module.exports.cercaColleghiPerTurnoGiornaliero = async (idEvento, idOperatore, dataTurno) => {
    const [records] = await db.query("select di.nome, di.cognome, di.telefono, di.gpg, tu.oraInizio, tu.oraFine, tu.teamLeader from  turnoOperatore  tu join dipendenti di on tu.idOperatore = di.id  where tu.idEvento = ? and tu.idOperatore != ? and tu.dataTurno = ?"
        , [idEvento, idOperatore, dataTurno])
    return records;
}

module.exports.cancellaTurno = async (idTurno) => {
    const [{ affectedRows }] = await db.query("DELETE FROM turnoOperatore WHERE idTurno = ?", [idTurno])
    return affectedRows;
}

module.exports.aggiornaNotaTurno = async (nota, idTurno) => {
    const [{ affectedRows }] = await db.query("UPDATE turnoOperatore set noteTurno = ? WHERE idTurno = ?", [nota, idTurno])
    return affectedRows;
}

module.exports.aggiornaMotivazioneRitardoTurno = async (motivazione, idTurno) => {
    const [{ affectedRows }] = await db.query("UPDATE turnoOperatore set motivazioneRitardo = ? WHERE idTurno = ?", [motivazione, idTurno])
    return affectedRows;
}

module.exports.aggiornaMotivazioneContestazioneTurno = async (motivazione, idTurno) => {
    const [{ affectedRows }] = await db.query("UPDATE turnoOperatore set motivazioneContestazione = ? WHERE idTurno = ?", [motivazione, idTurno])
    return affectedRows;
}

module.exports.timbraturaTurno = async (idCheckInCheckOut, idTurno) => {
    const [{ affectedRows }] = await db.query("UPDATE turnoOperatore set idCheckInCheckOut = ? WHERE idTurno = ? AND idCheckInCheckOut IS NULL", [idCheckInCheckOut, idTurno])
    return affectedRows;
}


module.exports.duplicaRiga = async (idTurno) => {

    try {

        const query = `
            INSERT INTO turnoOperatore (
                idEvento,
                teamLeader,
                dataTurno,
                oraInizio,
                oraFine,
                orePausa,
                tipologiaTurno,
                tipoMansione,
                noteTurno,
                dataInserimento
            )
            SELECT
                idEvento,
                teamLeader,
                dataTurno,
                oraInizio,
                oraFine,
                orePausa,
                tipologiaTurno,
                tipoMansione,
                noteTurno,
                NOW()
            FROM turnoOperatore
            WHERE idTurno = ?
        `;

        const [result] = await db.query(query, [idTurno]);

        /*
        return {
            success: true,
            insertId: result.insertId
        };
        */

    } catch (error) {

        console.error(error);

        /*
        return {
            success: false,
            error: error.message
        };
        */
    }
};