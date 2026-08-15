const db = require('../db')
const mysql = require('mysql2/promise')

module.exports.ottieniListaDipendenti = async () => {
    const query = `
        SELECT 
            dip.*,
            COALESCE(tur.turniAttivi, 0) AS turniAttivi
        FROM dipendenti dip
        LEFT JOIN (
            SELECT 
                COUNT(*) AS turniAttivi,
                idOperatore
            FROM turnoOperatore
            WHERE NOW() < TIMESTAMP(dataTurno, oraFine)
            GROUP BY idOperatore
        ) tur ON dip.id = tur.idOperatore
        WHERE dip.ruolo = 'OPERATORE'
        order by dip.cognome ASC
    `;

    const [records] = await db.query(query);
    return records;
};


module.exports.ricercaDipendenti = async (filtroTurno) => {

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    };

    const formatTime = (date) => {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    //Tra la fine di un turno e l'inizio del turno successivo
    //deve passare almeno un'ora
    const oraInizio = parseTime(filtroTurno.oraInizio);
    oraInizio.setHours(oraInizio.getHours() - 1);

    const oraFine = parseTime(filtroTurno.oraFine);
    oraFine.setHours(oraFine.getHours() + 1);

    filtroTurno.oraInizio = formatTime(oraInizio);
    filtroTurno.oraFine = formatTime(oraFine);


    //*************Creazione dataInizo e dataFine***************
    const [year, month, day] = filtroTurno.dataTurno.split('-').map(Number);

    // DataInizio = dataTurno + oraInizio
    const dataInizio = new Date(year, month - 1, day, oraInizio.getHours(), oraInizio.getMinutes(), 0, 0);

    let dataFine = new Date(year, month - 1, day, oraFine.getHours(), oraFine.getMinutes(), 0, 0);

    // Se oraFine < oraInizio → significa che il turno passa al giorno successivo
    if (dataFine <= dataInizio) {
        dataFine.setDate(dataFine.getDate() + 1);
    }

    // **************FINO QUI****************

    console.log("filtroTurno.idTurno: ", filtroTurno.idTurno);

    const sql = `

            SELECT ut.id , ut.nome , ut.cognome , ut.nickname , ut.idTurno,  
                   tor.dataTurno, tor.oraInizio, tor.oraFine,
                   ev.nomeEvento, ev.indirizzo 
                FROM
            (
            SELECT 
                d.id,
                d.nome,
                d.cognome,
                d.nickname,
                MIN(v.idTurno) AS idTurno
            FROM dipendenti d
            LEFT JOIN view_turnoOperatore v
                ON v.idOperatore = d.id
                AND ? < v.dataFine
                AND ? > v.dataInizio
                AND v.idTurno <> ?
            WHERE d.ruolo = 'OPERATORE'
            GROUP BY d.id, d.nome, d.cognome
            ) as ut
            LEFT JOIN turnoOperatore tor
             ON tor.idTurno = ut.idTurno
            LEFT JOIN evento ev
             ON tor.idEvento = ev.idEvento             
            `;

    const values = [
        dataInizio, // EXISTS → ?
        dataFine,   // EXISTS → ?
        filtroTurno.idTurno
    ];


    const [record] = await db.query(sql, values);

    const fullQuery = mysql.format(sql, values);
    console.log('[SQL]', fullQuery);
    return record;
}

module.exports.ottieniDipendenteById = async (id) => {
    const sql = `
      SELECT
        id,
        nome,
        cognome,
        nickname,
        matricola,
        email,
        codice_fiscale   AS codiceFiscale,
        prefisso,
        telefono,
        sesso,
        gpg,
        username,
        password,
        ruolo,
        lista_mansioni AS listaMansioni,
        data_nascita     AS dataNascita,
        luogo_nascita    AS luogoNascita,
        provincia_nascita AS provinciaNascita,
        stato_nascita AS statoNascita,
        cittadinanza,
        indirizzo_residenza AS indirizzoResidenza,
        numero_civico_residenza AS numeroCivicoResidenza,
        comune_residenza AS comuneResidenza,
        provincia_residenza AS provinciaResidenza,
        cap_residenza AS capResidenza,
        residenza_uguale_domicilio AS residenzaUgualeDomicilio,
        indirizzo_domicilio AS indirizzoDomicilio,
        numero_civico_domicilio AS numeroCivicoDomicilio,
        comune_domicilio AS comuneDomicilio,
        provincia_domicilio AS provinciaDomicilio,
        cap_domicilio AS capDomicilio,
        altezza,
        peso,
        numero_scarpe AS numeroScarpe,
        taglia_vestiti AS tagliaVestiti,
        livello_istruzione AS livelloIstruzione, 
        tesserino

      FROM dipendenti
      WHERE id = ?
    `;

    const [[record]] = await db.query(sql, [id]);
    return record;
};


module.exports.ottieniDipendenteByUsername = async (telefono) => {
    const [[record]] = await db.query("SELECT * FROM dipendenti WHERE telefono = ?", [telefono])
    return record;
}

module.exports.ottieniDipendenteByRefreshToken = async (refreshToken) => {
    const [[record]] = await db.query("SELECT * FROM dipendenti WHERE refreshToken = ?", [refreshToken])
    return record;
}

module.exports.aggiornaStatoOperatore = async (stato, id) => {
    const [{ affectedRows }] = await db.query("UPDATE dipendenti set stato = ? WHERE id = ?", [stato, id])
    return affectedRows;
}

module.exports.aggiornaImmagineProfiloOperatore = async (
    tipoImmagine,
    immagineProfilo,
    id
) => {
    let colonna;

    console.log("tipoImmagine: " + tipoImmagine);
    console.log("immagineProfilo: " + immagineProfilo);

    switch (tipoImmagine) {
        case "primoPiano":
            colonna = "img_profilo_primo_piano";
            break;
        case "mezzoBusto":
            colonna = "img_profilo_mezzo_busto";
            break;
        case "figuraIntera":
            colonna = "img_profilo_fig_intera";
            break;
        default:
            throw new Error("Tipo immagine non valido");
    }

    const [result] = await db.query(
        `UPDATE dipendenti SET ${colonna} = ? WHERE id = ?`,
        [immagineProfilo, id]
    );

    return result.affectedRows;
};


module.exports.cancellaDipendente = async (id) => {
    const [{ affectedRows }] = await db.query("DELETE FROM dipendenti WHERE id = ?", [id])
    return affectedRows;
}

module.exports.cancellaTimbratura = async (idTimbratura) => {
    //Elimino checkOut se esiste
    await db.query("DELETE FROM checkInCheckOut WHERE idCheckIn = ?", [idTimbratura])
    //Elimino checkIn se esiste
    const [{ affectedRows }] = await db.query("DELETE FROM checkInCheckOut WHERE idCheckInCheckOut = ?", [idTimbratura])
    return affectedRows;
}

module.exports.aggiornaDipendente = async (dipendente, id) => {
    const sql = `
      UPDATE dipendenti 
      set nome = ? , 
      cognome = ?  ,
      nickname = ? ,
      matricola = ? ,
      email = ? ,
      prefisso = ? ,
      telefono = ? ,
      codice_fiscale = ? ,
      sesso = ?  ,
      data_nascita = ?  ,  
      luogo_nascita = ? ,
      provincia_nascita = ? ,
      stato_nascita = ? ,
      cittadinanza = ?       
      WHERE id = ?
    `;
    const params = [
        dipendente.nome,
        dipendente.cognome,
        dipendente.nickname,
        dipendente.matricola,
        dipendente.email,
        dipendente.prefisso,
        dipendente.telefono,
        dipendente.codiceFiscale,
        dipendente.sesso,
        dipendente.dataNascita,
        dipendente.luogoNascita,
        dipendente.provinciaNascita,
        dipendente.statoNascita,
        dipendente.cittadinanza,
        id
    ];

    await db.query(sql, params);

}

module.exports.aggiornaNascitaResidenza = async (dipendente, id) => {
    const sql = `
      UPDATE dipendenti 
      set            
      indirizzo_residenza = ? ,
      numero_civico_residenza = ? ,
      comune_residenza = ? ,
      provincia_residenza = ? ,
      cap_residenza = ? ,
      residenza_uguale_domicilio = ? ,
      indirizzo_domicilio = ? ,
      numero_civico_domicilio = ? ,
      comune_domicilio = ? ,
      provincia_domicilio = ? ,
      cap_domicilio = ?     
      WHERE id = ?
    `;

    const params = [
        dipendente.indirizzoResidenza,
        dipendente.numeroCivicoResidenza,
        dipendente.comuneResidenza,
        dipendente.provinciaResidenza,
        dipendente.capResidenza,
        dipendente.residenzaUgualeDomicilio,
        dipendente.indirizzoDomicilio,
        dipendente.numeroCivicoDomicilio,
        dipendente.comuneDomicilio,
        dipendente.provinciaDomicilio,
        dipendente.capDomicilio,
        id
    ];

    await db.query(sql, params);

}


module.exports.aggiornaDatiGenerici = async (dipendente, id) => {
    const sql = `
      UPDATE dipendenti 
      set            
      altezza = ? ,
      peso = ? , 
      numero_scarpe = ? ,
      taglia_vestiti = ? ,
      livello_istruzione = ? , 
      tesserino = ? 
      WHERE id = ?
    `;
    const params = [
        dipendente.altezza,
        dipendente.peso,
        dipendente.numeroScarpe,
        dipendente.tagliaVestiti,
        dipendente.livelloIstruzione,
        dipendente.tesserino,
        id
    ];
    await db.query(sql, params);

}

module.exports.aggiornaHeader = async (dipendente, id) => {
    const sql = `
      UPDATE dipendenti 
      set            
      lista_mansioni = ? 
      WHERE id = ?
    `;
    const params = [
        JSON.stringify(dipendente.listaMansioni),
        id
    ];
    await db.query(sql, params);

}

module.exports.aggiornaPassword = async (password, id) => {
    const [{ affectedRows }] = await db.query("UPDATE dipendenti set password = ? WHERE id = ?", [password, id])
    return affectedRows;
}

module.exports.creaOpertore = async (operatore, hashedPwd) => {
    //   await db.query("INSERT INTO dipendenti(nome, cognome, telefono, gpg, email, ruolo, password) VALUES (?,?,?,?,?,?,?)", [operatore.nome, operatore.cognome, operatore.telefono, operatore.gpg, operatore.email, 'OPERATORE', hashedPwd]);

    const dipendente = {
        nome: operatore.nome,
        cognome: operatore.cognome,
        nickname: `${operatore.nome} ${operatore.cognome}`,
        prefisso: operatore.prefisso,
        telefono: operatore.telefono,
        gpg: operatore.gpg,
        email: operatore.email,
        ruolo: 'OPERATORE',
        password: hashedPwd
    };

    await db.query("INSERT INTO dipendenti SET ?", dipendente);
    //const [[[{affectedRows}]]] = await db.query("SELECT ROW_COUNT() AS 'affectedRows'");
    //await db.query("SELECT ROW_COUNT() AS 'affectedRows'");
    return 1;
}

module.exports.creaContratto = async (contratto) => {

    console.log("contratto.dataFirmaContratto: " + contratto.dataFirmaContratto)

    // Se la tipologia è OCCASIONALE, forza il compenso a 100
    if (contratto.tipologia === "OCCASIONALE") {
        contratto.compensoTotaleLordo = 100;
    }

    // Se la tipologia è OCCASIONALE, forza il compenso a 100
    if (contratto.tipologia === "CHIAMATA") {
        contratto.compensoTotaleLordo = 1273.50;
    }

    // Query SQL
    const query = `
        INSERT INTO contratto (
            idOperatore,
            tipologia,
            data_inizio,
            data_fine,
            data_firma_contratto,
            compenso_totale_lordo,            
            contenuti_formazione,
            beni_strumentali,
            citta_predefinita,
            indirizzo_predefinito,            
            citta_alternativa,
            indirizzo_alternativo            
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Parametri della query
    const params = [
        contratto.idOperatore,
        contratto.tipologia,
        contratto.dataInizio,
        contratto.dataFine,
        contratto.dataFirmaContratto,
        contratto.compensoTotaleLordo,
        contratto.elencoContenutiFormazione,
        contratto.elencoBeniStrumentali,
        contratto.cittaPredefinita,
        contratto.indirizzoPredefinito,
        contratto.cittaAlternativa,
        contratto.indirizzoAlternativo,
    ];

    // Esecuzione query
    const [result] = await db.query(query, params);

    // Ritorna l'id del contratto appena creato
    return result.insertId;
};



module.exports.aggiornaPathContratto = async (pathContratto, idContratto) => {
    const [{ affectedRows }] = await db.query("UPDATE contratto set path_contratto = ? WHERE idContratto = ?", [pathContratto, idContratto])
    return affectedRows;
}

/*
module.exports.aggiornaPathContrattoFirmato = async (pathContrattoFirmato, idContratto, tipoContratto) => {
    const [{ affectedRows }] = await db.query("UPDATE contratto set path_contratto_firmato = ? WHERE idContratto = ?", [pathContrattoFirmato, idContratto])
    return affectedRows;
}
    */

module.exports.aggiornaPathContrattoFirmato = async (
    pathFile,
    idContratto,
    tipoContratto
) => {

    let campoDb;

    switch (tipoContratto) {

        case "contrattoFirmato":
            campoDb = "path_contratto_firmato";
            break;

        case "contrattoUnilav":
            campoDb = "path_contratto_unilav";
            break;

        default:
            throw new Error(
                `Tipo contratto non valido: ${tipoContratto}`
            );
    }

    const query = `
        UPDATE contratto
        SET ${campoDb} = ?
        WHERE idContratto = ?
    `;

    const params = [
        pathFile,
        idContratto
    ];

    const [result] = await db.query(query, params);

    return result.affectedRows;
};


module.exports.getDatiContratto = async (idContratto) => {
    const query = `
    SELECT 
      c.idContratto,
      d.nome,
      d.cognome,
      d.luogo_nascita,
      d.provincia_nascita,
      d.data_nascita,
      d.comune_residenza,
      d.stato_nascita,
      d.provincia_residenza,
      d.indirizzo_residenza,
      d.numero_civico_residenza,
      d.residenza_uguale_domicilio,
      d.comune_domicilio,
      d.provincia_domicilio,
      d.indirizzo_domicilio,
      d.numero_civico_domicilio,
      d.codice_fiscale,
      c.lista_mansioni,
      c.data_inizio,
      c.data_fine,
      c.data_firma_contratto,
      c.citta_predefinita,
      c.indirizzo_predefinito,      
      c.citta_alternativa,
      c.indirizzo_alternativo,
      c.qualifica,
      c.giorni_periodo_prova,
      c.livello_inquadramento,      
      c.compenso_totale_lordo,
      c.contenuti_formazione,
      c.beni_strumentali
    FROM contratto c
    JOIN dipendenti d ON c.idOperatore = d.id
    WHERE c.idContratto = ?;
  `;

    const [[record]] = await db.query(query, [idContratto]);
    return record;
};


module.exports.getIdOpetarore = async (idContratto) => {
    const query = `SELECT idOperatore FROM contratto WHERE idContratto = ?`;
    const [[record]] = await db.query(query, [idContratto]);
    return record?.idOperatore ?? null;
};

module.exports.getPathContratto = async (idContratto) => {
    const query = `SELECT path_contratto FROM contratto WHERE idContratto = ?`;
    const [[record]] = await db.query(query, [idContratto]);
    return record?.path_contratto ?? null;
};


module.exports.getImmagineProfiloOperatore = async (idOperatore, tipoImmagine) => {
    // Mappa tipoImmagine → colonna DB
    const colonne = {
        primoPiano: 'img_profilo_primo_piano',
        mezzoBusto: 'img_profilo_mezzo_busto',
        figuraIntera: 'img_profilo_fig_intera'
    };

    const colonna = colonne[tipoImmagine];

    // Controllo di sicurezza
    if (!colonna) {
        throw new Error(`Tipo immagine non valido: ${tipoImmagine}`);
    }

    const query = `
        SELECT ${colonna} AS immagine
        FROM dipendenti
        WHERE id = ?
    `;

    const [[record]] = await db.query(query, [idOperatore]);

    return record?.immagine ?? null;
};




module.exports.listaContrattiOperatore = async (idOperatore) => {

    const query = `
    SELECT     
      c.idContratto,
      c.tipologia,
      DATE_FORMAT(c.data_inizio, '%Y-%m-%d') AS dataInizio,
      DATE_FORMAT(c.data_fine, '%Y-%m-%d') AS dataFine,
      c.compenso_totale_lordo as compensoTotaleLordo,
      c.path_contratto_firmato as pathContrattoFirmato, 
      c.path_contratto_unilav as pathContrattoUnilav
    FROM contratto c
    WHERE c.idOperatore = ?;
  `;

    const [record] = await db.query(query, [idOperatore]);
    return record;

}

/*
module.exports.ottieniPdfContratto = async (idContratto, tipoContratto) => {
    const query = ` SELECT path_contratto as pathContratto  FROM contratto  WHERE idContratto = ? `;
    const [[record]] = await db.query(query, [idContratto]);

    if (!record) return null;

    return record.pathContratto;

}
    */

module.exports.ottieniPdfContratto = async (idContratto, tipoContratto) => {

    let campoDatabase;

    switch (tipoContratto) {
        case "downloadContratto":
            campoDatabase = "path_contratto";
            break;

        case "contrattoFirmato":
            campoDatabase = "path_contratto_firmato";
            break;

        case "contrattoUnilav":
            campoDatabase = "path_contratto_unilav";
            break;

        default:
            throw new Error(`tipoContratto non valido: ${tipoContratto}`);
    }

    console.log("campoDatabase:", campoDatabase);

    const query = `
        SELECT 
            ${campoDatabase} AS pathContratto
        FROM contratto
        WHERE idContratto = ?
    `;

    const [rows] = await db.query(query, [idContratto]);

    const [contratto] = rows;

    return contratto?.pathContratto ?? null;
};

/*
module.exports.ottieniPdfContrattoFirmato = async (idContratto) => {
    const query = ` SELECT path_contratto_firmato as pathContratto  FROM contratto  WHERE idContratto = ? `;
    const [[record]] = await db.query(query, [idContratto]);

    if (!record) return null;

    return record.pathContratto;

}
    */

module.exports.cancellaContratto = async (idContratto) => {
    const [{ affectedRows }] = await db.query("DELETE FROM contratto WHERE idContratto = ?", [idContratto])
    return affectedRows;
}


module.exports.cancellaContrattoFirmato = async (
    idContratto,
    tipoContratto
) => {

    let campoDatabase;

    switch (tipoContratto) {

        case "contrattoFirmato":
            campoDatabase = "path_contratto_firmato";
            break;

        case "contrattoUnilav":
            campoDatabase = "path_contratto_unilav";
            break;

        default:
            throw new Error(
                `tipoContratto non valido: ${tipoContratto}`
            );
    }

    const query = `
        UPDATE contratto
        SET ${campoDatabase} = NULL
        WHERE idContratto = ?
    `;

    const [result] = await db.query(query, [idContratto]);

    return result.affectedRows;
};

module.exports.creaCheckInCheckOut = async (posizioneOperatore, dataInserimento, idTurno, idCheckInCheckOut) => {


    const [result] = await db.query(
        `INSERT INTO checkInCheckOut
        (idOperatore, idTurno, checkIn, latitudine, longitudine, idCheckIn, dataInserimento)
        VALUES (?,?,?,?,?,?,?)`,
        [
            posizioneOperatore.idOperatore,
            idTurno,
            posizioneOperatore.checkIn,
            posizioneOperatore.latitudine,
            posizioneOperatore.longitudine,
            idCheckInCheckOut,
            dataInserimento
        ]
    );

    return result.insertId;
};

module.exports.agganciaTurnoAllaTimbratura = async (idTurno, idCheckInCheckOut) => {
    const [{ affectedRows }] = await db.query("UPDATE checkInCheckOut set idTurno = ? WHERE idCheckInCheckOut = ? ", [idTurno, idCheckInCheckOut])
    return affectedRows;
}


module.exports.recuperoTimbratura = async (posizioneOperatore, idCheckInCheckOut = null) => {
    const [result] = await db.query("INSERT INTO checkInCheckOut(idOperatore,  checkIn, latitudine, longitudine, idCheckIn, dataInserimento) VALUES (?,?,?,?,?,?)"
        , [posizioneOperatore.idOperatore, posizioneOperatore.checkIn, posizioneOperatore.latitudine, posizioneOperatore.longitudine, idCheckInCheckOut, posizioneOperatore.dataOraCheckInOut]);

    return result.insertId;
}


module.exports.ottieniCheckInCheckOutOperatore = async (idOperatore, dataInizio, dataFine) => {
    let whereCheckIn = `1 = 1`;

    // const params = [idOperatore];
    const params = [idOperatore];

    // Aggiungo i filtri solo se presenti
    if (dataInizio && dataFine) {
        whereCheckIn += ` AND ckIn.dataInserimento BETWEEN ? AND ?`;
        params.push(dataInizio, dataFine);
    }

    const sql = `
    SELECT 
        ckIn.idOperatore,
        ckIn.idCheckInCheckOut AS idCheckIn,
        ckOut.idCheckInCheckOut AS idCheckOut,
        ckIn.latitudine AS latitudineCheckIn,
        ckIn.longitudine AS longitudineCheckIn,
        ckIn.dataInserimento AS dataInserimentoCheckIn,
        ckOut.latitudine AS latitudineCheckOut,
        ckOut.longitudine AS longitudineCheckOut,
        ckOut.dataInserimento AS dataInserimentoCheckOut,
        CASE 
            WHEN ev.nomeEvento IS NULL OR ev.nomeEvento = '' 
            THEN 'Nessun evento associato'
            ELSE ev.nomeEvento
        END AS eventoAssociato        
    FROM checkInCheckOut ckIn
    LEFT JOIN checkInCheckOut ckOut        
        ON ckIn.idCheckInCheckOut = ckOut.idCheckIn
        AND ckOut.checkIn = false
        AND ckOut.idOperatore = ckIn.idOperatore
    LEFT JOIN turnoOperatore tuOp
        ON ckIn.idTurno = tuOp.idTurno
    LEFT JOIN evento ev
        ON tuOp.idEvento = ev.idEvento 
    WHERE 
        ckIn.idOperatore = ?
        AND ckIn.checkIn = true AND
        ${whereCheckIn}
    ORDER BY ckIn.dataInserimento DESC
    `;


    const finalParams = [...params];

    // 🔥 FULL QUERY LOG
    const fullQuery = mysql.format(sql, finalParams);
    console.log('-------------------');
    console.log('FULL QUERY OTTIENI CHECKIN/CHECKOUT OPERATORE');
    console.log(fullQuery);
    console.log('-------------------');


    const [records] = await db.query(sql, [...params]);
    return records;
};


module.exports.ottieniCheckInCheckOutGenerica = async (
    dataInizio,
    dataFine,
    titoloEvento,
    page,
    pageSize,
    sortOrderDataCeckIn,
    sortOrderNominativo,
    sortNomeEvento
) => {

    let whereCheckIn = `1 = 1`;

    const params = [];

    console.log('Aggiungo i filtri solo se presenti:');
    console.log('dataInizio:', dataInizio);
    console.log('dataFine:', dataFine);
    console.log('sortOrderDataCeckIn:', sortOrderDataCeckIn);
    console.log('sortOrderNominativo:', sortOrderNominativo);
    console.log('sortNomeEvento:', sortNomeEvento);

    // filtro date
    if (dataInizio && dataFine) {

        const dataInizioCompleta = `${dataInizio} 00:00:00`;
        const dataFineCompleta = `${dataFine} 23:59:59`;

        whereCheckIn += ` AND ckIn.dataInserimento BETWEEN ? AND ?`;

        params.push(dataInizioCompleta, dataFineCompleta);
    } else if (dataInizio && !dataFine) {

        const dataInizioCompleta = `${dataInizio} 00:00:00`;
        const dataFineCompleta = `${dataInizio} 23:59:59`;

        whereCheckIn += ` AND ckIn.dataInserimento BETWEEN ? AND ?`;

        params.push(dataInizioCompleta, dataFineCompleta);
    }

    // filtro titolo evento
    if (titoloEvento) {
        whereCheckIn += ` AND ev.nomeEvento LIKE ? `;
        params.push(`%${titoloEvento}%`);
    }

    const offset = (page - 1) * pageSize;

    // ORDER BY dinamico
    let orderBy = `ORDER BY ckIn.dataInserimento DESC`; // default

    if (sortOrderDataCeckIn) {
        orderBy = `ORDER BY ckIn.dataInserimento ${sortOrderDataCeckIn}`;
    }

    if (sortOrderNominativo) {
        orderBy = `ORDER BY nominativo ${sortOrderNominativo}`;
    }

    if (sortNomeEvento) {
        orderBy = `ORDER BY eventoAssociato ${sortNomeEvento}`;
    }

    const sql = `
        SELECT 
        ckIn.idOperatore,
        CASE 
            WHEN d.nickname IS NOT NULL AND d.nickname <> ''
                THEN d.nickname
                ELSE CONCAT(d.nome, ' ', d.cognome)
        END AS nominativo,
        ckIn.idCheckInCheckOut AS idCheckIn,
        ckOut.idCheckInCheckOut AS idCheckOut,
        ckIn.latitudine AS latitudineCheckIn,
        ckIn.longitudine AS longitudineCheckIn,
        ckIn.dataInserimento AS dataInserimentoCheckIn,
        ckOut.latitudine AS latitudineCheckOut,
        ckOut.longitudine AS longitudineCheckOut,
        ckOut.dataInserimento AS dataInserimentoCheckOut,
        CASE 
            WHEN ev.nomeEvento IS NULL OR ev.nomeEvento = '' 
            THEN 'Nessun evento associato'
            ELSE ev.nomeEvento
        END AS eventoAssociato        
        FROM checkInCheckOut ckIn
        LEFT JOIN checkInCheckOut ckOut
            ON ckIn.idCheckInCheckOut = ckOut.idCheckIn
            AND ckOut.checkIn = false
        INNER JOIN dipendenti d
            ON ckIn.idOperatore = d.id
        LEFT JOIN turnoOperatore tuOp
            ON ckIn.idTurno = tuOp.idTurno
        LEFT JOIN evento ev
            ON tuOp.idEvento = ev.idEvento            
        WHERE 
            ckIn.checkIn = true AND
            ${whereCheckIn}
    ${orderBy}
    LIMIT ? OFFSET ?
    `;

    const countSql = `
        SELECT COUNT(*) as total
        FROM checkInCheckOut ckIn
        LEFT JOIN turnoOperatore tuOp
            ON ckIn.idTurno = tuOp.idTurno
        LEFT JOIN evento ev
            ON tuOp.idEvento = ev.idEvento         
        WHERE ckIn.checkIn = true AND ${whereCheckIn}
    `;

    const [[{ total }]] = await db.query(countSql, params);
    const [records] = await db.query(sql, [...params, pageSize, offset]);

    const fullQuery = mysql.format(sql, [...params, pageSize, offset]);
    console.log('FULL QUERY ottieniCheckInCheckOutGenerica*********:', fullQuery);

    const fullCountQuery = mysql.format(countSql, params);
    console.log('FULL COUNT QUERY ottieniCheckInCheckOutGenerica*******:', fullCountQuery);

    return {
        data: records,
        total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page
    };
};


module.exports.ottieniStatoCheck = async (idOperatore) => {
    const [record] = await db.query("SELECT checkIn FROM checkInCheckOut WHERE idOperatore = ? order by dataInserimento desc LIMIT 1", [idOperatore])
    let valore = false; //significa che deve essere fatto il checkIn
    //  console.log("record********: " + record);
    //  console.log("record[0]********: " + record[0]);
    if (record[0]) {
        valore = record[0].checkIn;
    }
    return valore;
}

module.exports.ottieniIDCheckIn = async (idOperatore) => {
    console.log("idOperatore:", idOperatore);

    const [rows] = await db.query(
        `SELECT idCheckInCheckOut, idTurno
         FROM checkInCheckOut
         WHERE idOperatore = ?
           AND checkIn = true
         ORDER BY dataInserimento DESC
         LIMIT 1`,
        [idOperatore]
    );

    console.log("records:", JSON.stringify(rows));

    if (rows.length === 0) {
        return null;
    }

    return {
        idCheckInCheckOut: rows[0].idCheckInCheckOut,
        idTurno: rows[0].idTurno
    };
};


module.exports.verificaMotivazioneTimbratura = async (idOperatore) => {
    const [rows] = await db.query(
        `SELECT
            CASE
                WHEN NOW() >= DATE_ADD(v.dataFine, INTERVAL 3 HOUR)
                THEN TRUE
                ELSE FALSE
            END AS motivaTimbratura
         FROM checkInCheckOut c
         LEFT JOIN view_turnoOperatore v
            ON c.idTurno = v.idTurno
         WHERE c.idOperatore = ?
           AND c.checkIn = TRUE
         ORDER BY c.dataInserimento DESC
         LIMIT 1`,
        [idOperatore]
    );

    if (rows.length === 0) {
        return null; // oppure false, se preferisci
    }

    return !!rows[0].motivaTimbratura;
};

module.exports.checkInOutByid = async (idCheckInCheckOut) => {
    const [[record]] = await db.query("SELECT * FROM checkInCheckOut WHERE idCheckInCheckOut = ?", [idCheckInCheckOut])
    return record;
}

module.exports.aggiornaCheckInOut = async (dataInserimento, idCheckInCheckOut) => {
    const [{ affectedRows }] = await db.query("UPDATE checkInCheckOut set dataInserimento = ? WHERE idCheckInCheckOut = ?", [dataInserimento, idCheckInCheckOut])
    return affectedRows;
}
