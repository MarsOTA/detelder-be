const db = require('../db')

module.exports.creaPayroll = async (payroll) => {
    const sql = `
      INSERT INTO payroll(
        idTurno,
        oraInizioDefinitivo,
        oraFineDefinitivo,
        orePausaDefinitivo,
        stato,
        dataInserimento
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const values = [
        payroll.idTurno,
        payroll.oraInizioDefinitivo,
        payroll.oraFineDefinitivo,
        payroll.orePausaDefinitivo,
        payroll.stato
    ];

    await db.query(sql, values);
};

module.exports.aggiornaStatoPayroll = async (stato, idPayroll) => {
    const [{ affectedRows }] = await db.query("UPDATE payroll set stato = ? WHERE idPayroll = ?", [stato, idPayroll])
    return affectedRows;
}

module.exports.modificaPayroll = async (payroll) => {
    const sql = `
        UPDATE payroll
        SET
            oraInizioDefinitivo = ?,
            oraFineDefinitivo = ?,
            orePausaDefinitivo = ?,
            stato = ?
        WHERE idTurno = ?
    `;

    const values = [
        payroll.oraInizioDefinitivo,
        payroll.oraFineDefinitivo,
        payroll.orePausaDefinitivo,
        payroll.stato,
        payroll.idTurno,
    ];

    const [{ affectedRows }] = await db.query(sql, values);

    return affectedRows;
};


module.exports.eliminaPayroll = async (idTurno) => {
    const sql = `
        DELETE FROM payroll
        WHERE idTurno = ?
    `;

    const [{ affectedRows }] = await db.query(sql, [idTurno]);

    return affectedRows;
};



module.exports.getGestionePayroll = async (dataInizio, dataFine, statoElaborazione) => {

    let sql = `
        SELECT
            ckIn.dataInserimento  AS dataInserimentoCheckIn,
            ckOut.dataInserimento AS dataInserimentoCheckOut,

            toper.idTurno,
            toper.dataTurno,
            toper.oraInizio,
            toper.oraFine,
            COALESCE(toper.orePausa, 0.0) AS orePausa,

            CASE
                WHEN dip.nickname IS NOT NULL AND dip.nickname <> ''
                    THEN dip.nickname
                ELSE CONCAT(dip.nome, ' ', dip.cognome)
            END AS operatore,

            ev.nomeEvento,
            cli.ragioneSociale,
            bra.nome AS nomeBrand,
            indbr.via,
            COALESCE(pr.oraInizioDefinitivo, toper.oraInizio) AS oraInizioDefinitivo,
            COALESCE(pr.oraFineDefinitivo, toper.oraFine) AS oraFineDefinitivo,
            COALESCE(pr.orePausaDefinitivo, toper.orePausa, 0.0) AS orePausaDefinitiva,

            COALESCE(pr.stato, 'DA_ELABORARE') AS statoPayroll,
            toper.motivazioneRitardo,
            toper.motivazioneContestazione

        FROM turnoOperatore toper

        LEFT JOIN payroll pr
            ON toper.idTurno = pr.idTurno

        LEFT JOIN checkInCheckOut ckIn
            ON ckIn.idTurno = toper.idTurno
            AND ckIn.checkIn = true

        LEFT JOIN checkInCheckOut ckOut
            ON ckOut.idCheckIn = ckIn.idCheckInCheckOut
            AND ckOut.checkIn = false

        LEFT JOIN evento ev
            ON toper.idEvento = ev.idEvento

        LEFT JOIN cliente cli
            ON cli.idCliente = ev.idCliente

        LEFT JOIN brand bra
            ON bra.idBrand = ev.idBrand

        LEFT JOIN dipendenti dip
            ON toper.idOperatore = dip.id

        LEFT JOIN inidirizzo_brand indbr
            ON ev.idIndirizzo = indbr.idIndirizzo

        WHERE toper.dataTurno >= ?
          AND toper.dataTurno <= ?
    `;

    const values = [dataInizio, dataFine];

    if (statoElaborazione != null) {
        sql += `
          AND COALESCE(pr.stato, 'DA_ELABORARE') = ?
        `;
        values.push(statoElaborazione);
    }

    sql += `
        ORDER BY
            toper.dataTurno ASC,
            ev.nomeEvento ASC,
            toper.oraInizio ASC,
            ckIn.dataInserimento ASC
    `;

    const [records] = await db.query(sql, values);
    return records;
};


module.exports.ottieniRendicontazione = async (idOperatore) => {
    await db.query("SET lc_time_names = 'it_IT'");

    const query = `
        SELECT
            p.idPayroll,
            p.idTurno,
            p.stato,
            c.ragioneSociale,
            b.nome AS nomeBrand,
            i.via AS indirizzoEvento,
            DATE_FORMAT(t.dataTurno, '%a %e %b %Y') AS dataTurno,
            p.oraInizioDefinitivo,
            p.oraFineDefinitivo,
            p.orePausaDefinitivo
        FROM payroll p
        LEFT JOIN turnoOperatore t
            ON t.idTurno = p.idTurno
        LEFT JOIN evento e
            ON e.idEvento = t.idEvento
        LEFT JOIN cliente c
            ON c.idCliente = e.idCliente
            AND c.disabilitato = 0
        LEFT JOIN brand b
            ON b.idBrand = e.idBrand
            AND b.disabilitato = 0
        LEFT JOIN inidirizzo_brand i
            ON i.idIndirizzo = e.idIndirizzo
        WHERE t.idOperatore = ?
        AND YEAR(t.dataTurno) = YEAR(
            CASE
                WHEN DAY(CURDATE()) < 6 
                THEN DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ELSE CURDATE()
            END
        )
        AND MONTH(t.dataTurno) = MONTH(
            CASE
                WHEN DAY(CURDATE()) < 6 
                THEN DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
                ELSE CURDATE()
            END
        )
        ORDER BY
            t.dataTurno ASC,
            p.oraInizioDefinitivo ASC
    `;

    const [records] = await db.query(query, [idOperatore]);

    return records;
};





