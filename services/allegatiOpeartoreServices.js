const db = require('../db')

module.exports.creaAllegati = async (allegati, idOperatore) => {
  const sql = `
      INSERT INTO allegati (
        idOperatore,
        carta_identita_ndocumento,
        carta_identita_data_scadenza,
        tessera_sanitaria_ndocumento,
        tessera_sanitaria_data_scadenza,
        permesso_soggiorno_ndocumento,
        permesso_soggiorno_data_scadenza,
        antincendio_livello,
        antincendio_data_conseguimento,
        primo_soccorso_livello,
        primo_soccorso_data_conseguimento,
        passaporto_ndocumento,
        passaporto_data_scadenza,
        formazione_sicurezza_lavoro_livello,
        formazione_sicurezza_lavoro_data_conseguimento,
        blsd_livello,
        blsd_data_conseguimento,
        attestato_preposto_livello,
        attestato_preposto_data_conseguimento,
        attestato_security_manager_data_conseguimento
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const params = [
    idOperatore,
    allegati.cartaIdentitaNdocumento,
    allegati.cartaIdentitaDataScadenza,
    allegati.tesseraSanitariaNdocumento,
    allegati.tesseraSanitariaDataScadenza,
    allegati.permessoSoggiornoNdocumento,
    allegati.permessoSoggiornoDataScadenza,
    allegati.antincendioLivello,
    allegati.antincendioDataConseguimento,
    allegati.primoSoccorsoLivello,
    allegati.primoSoccorsoDataConseguimento,
    allegati.passaportoNdocumento,
    allegati.passaportoDataScadenza,
    allegati.formazioneSicurezzaLavoroLivello,
    allegati.formazioneSicurezzaLavoroDataConseguimento,
    allegati.blsdLivello,
    allegati.blsdDataConseguimento,
    allegati.attestatoPrepostoLivello,
    allegati.attestatoPrepostoDataConseguimento,
    allegati.attestatoSecurityManagerDataConseguimento
  ];

  await db.query(sql, params);
};


module.exports.aggiornaAllegati = async (allegati, idOperatore) => {
  const sql = `
      UPDATE allegati 
      set            
      carta_identita_ndocumento = ? ,
      carta_identita_data_scadenza = ? ,
      tessera_sanitaria_ndocumento = ? ,
      tessera_sanitaria_data_scadenza = ? ,
      permesso_soggiorno_ndocumento = ? ,
      permesso_soggiorno_data_scadenza = ?,
      antincendio_livello = ?,
      antincendio_data_conseguimento = ?,
      primo_soccorso_livello = ?,
      primo_soccorso_data_conseguimento = ?,
      passaporto_ndocumento = ?,
      passaporto_data_scadenza = ?,
      formazione_sicurezza_lavoro_livello = ?,
      formazione_sicurezza_lavoro_data_conseguimento = ?,
      blsd_livello = ?,
      blsd_data_conseguimento = ?,
      attestato_preposto_livello = ?,
      attestato_preposto_data_conseguimento = ?,
      attestato_security_manager_data_conseguimento = ?
      WHERE idOperatore = ?
    `;
  const params = [
    allegati.cartaIdentitaNdocumento,
    allegati.cartaIdentitaDataScadenza,
    allegati.tesseraSanitariaNdocumento,
    allegati.tesseraSanitariaDataScadenza,
    allegati.permessoSoggiornoNdocumento,
    allegati.permessoSoggiornoDataScadenza,
    allegati.antincendioLivello,
    allegati.antincendioDataConseguimento,
    allegati.primoSoccorsoLivello,
    allegati.primoSoccorsoDataConseguimento,
    allegati.passaportoNdocumento,
    allegati.passaportoDataScadenza,
    allegati.formazioneSicurezzaLavoroLivello,
    allegati.formazioneSicurezzaLavoroDataConseguimento,
    allegati.blsdLivello,
    allegati.blsdDataConseguimento,
    allegati.attestatoPrepostoLivello,
    allegati.attestatoPrepostoDataConseguimento,
    allegati.attestatoSecurityManagerDataConseguimento,
    idOperatore
  ];
  await db.query(sql, params);

}

module.exports.inserisciFileAllegati = async (nomeFileAllegato, extension, idOperatore) => {
  const mappaColonne = {
    carta_identita_img_fronte: 'carta_identita_img_fronte',
    carta_identita_img_retro: 'carta_identita_img_retro',
    tessera_sanitaria_img_fronte: 'tessera_sanitaria_img_fronte',
    tessera_sanitaria_img_retro: 'tessera_sanitaria_img_retro',
    permesso_soggiorno_img_fronte: 'permesso_soggiorno_img_fronte',
    permesso_soggiorno_img_retro: 'permesso_soggiorno_img_retro',
    antincendio_doc_fronte: 'antincendio_doc_fronte',
    antincendio_doc_retro: 'antincendio_doc_retro',
    primo_soccorso_attestato_fronte: 'primo_soccorso_attestato_fronte',
    primo_soccorso_attestato_retro: 'primo_soccorso_attestato_retro',
    passaporto_img_fronte: 'passaporto_img_fronte',
    passaporto_img_retro: 'passaporto_img_retro',
    formazione_sicurezza_lavoro_attestato_fronte: 'formazione_sicurezza_lavoro_attestato_fronte',
    formazione_sicurezza_lavoro_attestato_retro: 'formazione_sicurezza_lavoro_attestato_retro',
    blsd_attestato_fronte: 'blsd_attestato_fronte',
    blsd_attestato_retro: 'blsd_attestato_retro',
    attestato_preposto_fronte: 'attestato_preposto_fronte',
    attestato_preposto_retro: 'attestato_preposto_retro',
    attestato_security_manager_fronte: 'attestato_security_manager_fronte'
  };

  const colonna = mappaColonne[nomeFileAllegato];

  if (!colonna) {
    throw new Error('Tipo di allegato non valido');
  }

  const nomeFileCompleto = `${nomeFileAllegato}${extension}`;

  const sql = `
    INSERT INTO allegati (${colonna}, idOperatore)
    VALUES (?, ?)
  `;

  const params = [
    nomeFileCompleto,
    idOperatore
  ];

  await db.query(sql, params);
};


module.exports.aggiornaFileAllegati = async (nomeFileAllegato, extension, idOperatore) => {
  const mappaColonne = {
    carta_identita_img_fronte: 'carta_identita_img_fronte',
    carta_identita_img_retro: 'carta_identita_img_retro',
    tessera_sanitaria_img_fronte: 'tessera_sanitaria_img_fronte',
    tessera_sanitaria_img_retro: 'tessera_sanitaria_img_retro',
    permesso_soggiorno_img_fronte: 'permesso_soggiorno_img_fronte',
    permesso_soggiorno_img_retro: 'permesso_soggiorno_img_retro',
    antincendio_doc_fronte: 'antincendio_doc_fronte',
    antincendio_doc_retro: 'antincendio_doc_retro',
    primo_soccorso_attestato_fronte: 'primo_soccorso_attestato_fronte',
    primo_soccorso_attestato_retro: 'primo_soccorso_attestato_retro',
    passaporto_img_fronte: 'passaporto_img_fronte',
    passaporto_img_retro: 'passaporto_img_retro',
    formazione_sicurezza_lavoro_attestato_fronte: 'formazione_sicurezza_lavoro_attestato_fronte',
    formazione_sicurezza_lavoro_attestato_retro: 'formazione_sicurezza_lavoro_attestato_retro',
    blsd_attestato_fronte: 'blsd_attestato_fronte',
    blsd_attestato_retro: 'blsd_attestato_retro',
    attestato_preposto_fronte: 'attestato_preposto_fronte',
    attestato_preposto_retro: 'attestato_preposto_retro',
    attestato_security_manager_fronte: 'attestato_security_manager_fronte'
  };

  const colonna = mappaColonne[nomeFileAllegato];

  if (!colonna) {
    throw new Error('Tipo di allegato non valido');
  }

  const sql = `
    UPDATE allegati
    SET ${colonna} = ?
    WHERE idOperatore = ?
  `;

  const nomeFileCompleto = `${nomeFileAllegato}${extension}`;
  const params = [
    nomeFileCompleto,
    idOperatore
  ];

  await db.query(sql, params);
};


module.exports.eliminaFileAllegato = async (idOperatore, tipoDocumento) => {
  const mappaColonne = {
    carta_identita_img_fronte: 'carta_identita_img_fronte',
    carta_identita_img_retro: 'carta_identita_img_retro',
    tessera_sanitaria_img_fronte: 'tessera_sanitaria_img_fronte',
    tessera_sanitaria_img_retro: 'tessera_sanitaria_img_retro',
    permesso_soggiorno_img_fronte: 'permesso_soggiorno_img_fronte',
    permesso_soggiorno_img_retro: 'permesso_soggiorno_img_retro',
    antincendio_doc_fronte: 'antincendio_doc_fronte',
    antincendio_doc_retro: 'antincendio_doc_retro',
    primo_soccorso_attestato_fronte: 'primo_soccorso_attestato_fronte',
    primo_soccorso_attestato_retro: 'primo_soccorso_attestato_retro',
    passaporto_img_fronte: 'passaporto_img_fronte',
    passaporto_img_retro: 'passaporto_img_retro',
    formazione_sicurezza_lavoro_attestato_fronte: 'formazione_sicurezza_lavoro_attestato_fronte',
    formazione_sicurezza_lavoro_attestato_retro: 'formazione_sicurezza_lavoro_attestato_retro',
    blsd_attestato_fronte: 'blsd_attestato_fronte',
    blsd_attestato_retro: 'blsd_attestato_retro',
    attestato_preposto_fronte: 'attestato_preposto_fronte',
    attestato_preposto_retro: 'attestato_preposto_retro',
    attestato_security_manager_fronte: 'attestato_security_manager_fronte'
  };

  const colonna = mappaColonne[tipoDocumento];

  if (!colonna) {
    throw new Error('Tipo di allegato non valido');
  }

  const sql = `
    UPDATE allegati
    SET ${colonna} = NULL
    WHERE idOperatore = ?
  `;

  await db.query(sql, [idOperatore]);
};

module.exports.ottieniAllegatiByOperatore = async (idOperatore) => {
  const sql = `
      SELECT
        carta_identita_ndocumento   AS cartaIdentitaNdocumento , 
        carta_identita_data_scadenza AS cartaIdentitaDataScadenza,
        carta_identita_img_fronte AS cartaIdentitaImgFronte,
        carta_identita_img_retro AS cartaIdentitaImgRetro,
        tessera_sanitaria_ndocumento AS tesseraSanitariaNdocumento,
        tessera_sanitaria_data_scadenza AS tesseraSanitariaDataScadenza,
        tessera_sanitaria_img_fronte AS tesseraSanitariaImgFronte,
        tessera_sanitaria_img_retro AS tesseraSanitariaImgRetro,
        permesso_soggiorno_ndocumento AS permessoSoggiornoNdocumento,
        permesso_soggiorno_data_scadenza AS permessoSoggiornoDataScadenza,
        permesso_soggiorno_img_fronte AS permessoSoggiornoImgFronte,
        permesso_soggiorno_img_retro AS permessoSoggiornoImgRetro,
        antincendio_livello AS antincendioLivello,
        antincendio_data_conseguimento AS antincendioDataConseguimento,
        antincendio_doc_fronte AS antincendioDocFronte,
        antincendio_doc_retro AS antincendioDocRetro,
        primo_soccorso_livello AS primoSoccorsoLivello,
        primo_soccorso_data_conseguimento AS primoSoccorsoDataConseguimento,
        primo_soccorso_attestato_fronte AS primoSoccorsoAttestatoFronte,
        primo_soccorso_attestato_retro AS primoSoccorsoAttestatoRetro,
        passaporto_ndocumento AS passaportoNdocumento,
        passaporto_data_scadenza AS passaportoDataScadenza,
        passaporto_img_fronte AS passaportoImgFronte,
        passaporto_img_retro AS passaportoImgRetro,
        formazione_sicurezza_lavoro_livello AS formazioneSicurezzaLavoroLivello,
        formazione_sicurezza_lavoro_data_conseguimento AS formazioneSicurezzaLavoroDataConseguimento,
        formazione_sicurezza_lavoro_attestato_fronte AS formazioneSicurezzaLavoroAttestatoFronte,
        formazione_sicurezza_lavoro_attestato_retro AS formazioneSicurezzaLavoroAttestatoRetro,
        blsd_livello AS blsdLivello,
        blsd_data_conseguimento AS blsdDataConseguimento,
        blsd_attestato_fronte AS blsdAttestatoFronte,
        blsd_attestato_retro AS blsdAttestatoRetro,
        attestato_preposto_livello AS attestatoPrepostoLivello,
        attestato_preposto_data_conseguimento AS attestatoPrepostoDataConseguimento,
        attestato_preposto_fronte AS attestatoPrepostoFronte,
        attestato_preposto_retro AS attestatoPrepostoRetro,
        attestato_security_manager_fronte AS attestatoSecurityManagerFronte,
        attestato_security_manager_data_conseguimento AS attestatoSecurityManagerDataConseguimento
      FROM allegati
      WHERE idOperatore = ?
    `;
  const [[record]] = await db.query(sql, [idOperatore]);
  return record;
};

module.exports.verificaPresenzaDatiAllegati = async (idOperatore) => {
  const sql = `
    SELECT 1
    FROM allegati
    WHERE idOperatore = ?
    LIMIT 1
  `;
  const [rows] = await db.query(sql, [idOperatore]);
  return rows.length > 0;
};


module.exports.ottieniNomeFileAllegato = async (idOperatore, tipoDocumento) => {

  const mappaColonne = {
    carta_identita_img_fronte: 'carta_identita_img_fronte',
    carta_identita_img_retro: 'carta_identita_img_retro',
    tessera_sanitaria_img_fronte: 'tessera_sanitaria_img_fronte',
    tessera_sanitaria_img_retro: 'tessera_sanitaria_img_retro',
    permesso_soggiorno_img_fronte: 'permesso_soggiorno_img_fronte',
    permesso_soggiorno_img_retro: 'permesso_soggiorno_img_retro',
    antincendio_doc_fronte: 'antincendio_doc_fronte',
    antincendio_doc_retro: 'antincendio_doc_retro',
    primo_soccorso_attestato_fronte: 'primo_soccorso_attestato_fronte',
    primo_soccorso_attestato_retro: 'primo_soccorso_attestato_retro',
    passaporto_img_fronte: 'passaporto_img_fronte',
    passaporto_img_retro: 'passaporto_img_retro',
    formazione_sicurezza_lavoro_attestato_fronte: 'formazione_sicurezza_lavoro_attestato_fronte',
    formazione_sicurezza_lavoro_attestato_retro: 'formazione_sicurezza_lavoro_attestato_retro',
    blsd_attestato_fronte: 'blsd_attestato_fronte',
    blsd_attestato_retro: 'blsd_attestato_retro',
    attestato_preposto_fronte: 'attestato_preposto_fronte',
    attestato_preposto_retro: 'attestato_preposto_retro',
    attestato_security_manager_fronte: 'attestato_security_manager_fronte'
  };

  const colonna = mappaColonne[tipoDocumento];
  if (!colonna) return null;

  const query = `
        SELECT ${colonna} AS documento
        FROM allegati
        WHERE idOperatore = ?
    `;

  const [[record]] = await db.query(query, [idOperatore]);

  if (!record) return null;

  return record.documento;
};

//Mockup corretto

//Carta d’identità ok
//Tessera sanitaria   --> da fare
//Passaporto ok
//Permesso di soggiorno ok
//Attestato antincendio ok
//Attestato primo soccorso --> da fare
//Attestato formazione sicurezza sul lavoro --> da fare
//Attestato BLSD --> da fare


//Mockup attuale

//Carta d’identità
//Permesso di Soggiorno
//Attestato Antincendio
//Primo Soccorso & BLSD --> diviso in due
//Passaporto
//Attestato di altro genere --> no



