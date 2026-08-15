-- Final test schema for ezystaff. Run this file while connected to ezystaff_test.
-- It is intentionally data-free and safe to apply to a newly created database.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS dipendenti (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(45) NOT NULL,
  cognome VARCHAR(45) NOT NULL,
  nickname VARCHAR(45) NULL,
  matricola VARCHAR(45) NULL,
  email VARCHAR(254) NULL,
  codice_fiscale VARCHAR(45) NULL,
  prefisso VARCHAR(10) NOT NULL DEFAULT '+39',
  telefono VARCHAR(45) NOT NULL,
  sesso VARCHAR(45) NULL,
  data_nascita VARCHAR(20) NULL,
  luogo_nascita VARCHAR(100) NULL,
  provincia_nascita VARCHAR(5) NULL,
  stato_nascita VARCHAR(30) NULL,
  cittadinanza VARCHAR(30) NULL,
  indirizzo_residenza VARCHAR(200) NULL,
  numero_civico_residenza VARCHAR(10) NULL,
  comune_residenza VARCHAR(100) NULL,
  provincia_residenza VARCHAR(100) NULL,
  cap_residenza VARCHAR(100) NULL,
  residenza_uguale_domicilio BOOLEAN NULL,
  indirizzo_domicilio VARCHAR(200) NULL,
  numero_civico_domicilio VARCHAR(10) NULL,
  comune_domicilio VARCHAR(100) NULL,
  provincia_domicilio VARCHAR(100) NULL,
  cap_domicilio VARCHAR(100) NULL,
  altezza DECIMAL(5,2) NULL,
  peso DECIMAL(5,2) NULL,
  numero_scarpe DECIMAL(5,2) NULL,
  taglia_vestiti VARCHAR(100) NULL,
  livello_istruzione VARCHAR(100) NULL,
  tesserino VARCHAR(100) NULL,
  gpg BOOLEAN NOT NULL DEFAULT FALSE,
  username VARCHAR(50) NULL,
  password VARCHAR(100) NOT NULL,
  ruolo VARCHAR(20) NOT NULL,
  stato VARCHAR(50) NULL,
  refreshToken VARCHAR(500) NULL,
  lista_mansioni JSON NULL,
  img_profilo_primo_piano VARCHAR(255) NULL,
  img_profilo_mezzo_busto VARCHAR(255) NULL,
  img_profilo_fig_intera VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dipendenti_telefono (telefono),
  KEY idx_dipendenti_email (email),
  KEY idx_dipendenti_refresh_token (refreshToken(191)),
  KEY idx_dipendenti_ruolo_cognome (ruolo, cognome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente (
  idCliente INT NOT NULL AUTO_INCREMENT,
  ragioneSociale VARCHAR(200) NOT NULL,
  short_name VARCHAR(200) NULL,
  piva_cfiscale VARCHAR(200) NOT NULL,
  disabilitato BOOLEAN NOT NULL DEFAULT FALSE,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idCliente),
  UNIQUE KEY uq_cliente_piva_cfiscale (piva_cfiscale),
  KEY idx_cliente_attivo_ragione_sociale (disabilitato, ragioneSociale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referente (
  idReferente INT NOT NULL AUTO_INCREMENT,
  idCliente INT NOT NULL,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(254) NULL,
  telefono VARCHAR(30) NULL,
  disabilitato BOOLEAN NOT NULL DEFAULT FALSE,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idReferente),
  KEY idx_referente_cliente_attivo (idCliente, disabilitato),
  CONSTRAINT fk_referente_cliente FOREIGN KEY (idCliente) REFERENCES cliente (idCliente)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brand (
  idBrand INT NOT NULL AUTO_INCREMENT,
  idCliente INT NOT NULL,
  nome VARCHAR(200) NOT NULL,
  short_name VARCHAR(200) NULL,
  disabilitato BOOLEAN NOT NULL DEFAULT FALSE,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idBrand),
  KEY idx_brand_cliente_attivo (idCliente, disabilitato),
  CONSTRAINT fk_brand_cliente FOREIGN KEY (idCliente) REFERENCES cliente (idCliente)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inidirizzo_brand (
  idIndirizzo INT NOT NULL AUTO_INCREMENT,
  idBrand INT NOT NULL,
  via VARCHAR(1000) NOT NULL,
  disabilitato BOOLEAN NOT NULL DEFAULT FALSE,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idIndirizzo),
  KEY idx_indirizzo_brand_attivo (idBrand, disabilitato),
  CONSTRAINT fk_indirizzo_brand FOREIGN KEY (idBrand) REFERENCES brand (idBrand)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evento (
  idEvento INT NOT NULL AUTO_INCREMENT,
  nomeEvento VARCHAR(300) NULL,
  idCliente INT NOT NULL,
  idBrand INT NOT NULL,
  idIndirizzo INT NOT NULL,
  indirizzo VARCHAR(800) NULL,
  dataIniziale DATE NOT NULL,
  dataFinale DATE NOT NULL,
  codiceAttivita VARCHAR(50) NULL,
  note VARCHAR(1500) NULL,
  nomeCognomeReferente VARCHAR(100) NULL,
  telefonoReferente VARCHAR(30) NULL,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idEvento),
  KEY idx_evento_date (dataIniziale, dataFinale),
  KEY idx_evento_cliente (idCliente),
  KEY idx_evento_brand (idBrand),
  KEY idx_evento_indirizzo (idIndirizzo),
  CONSTRAINT fk_evento_cliente FOREIGN KEY (idCliente) REFERENCES cliente (idCliente)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_evento_brand FOREIGN KEY (idBrand) REFERENCES brand (idBrand)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_evento_indirizzo FOREIGN KEY (idIndirizzo) REFERENCES inidirizzo_brand (idIndirizzo)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS turnoOperatore (
  idTurno INT NOT NULL AUTO_INCREMENT,
  idOperatore INT NULL,
  idCheckInCheckOut INT NULL,
  idEvento INT NOT NULL,
  teamLeader BOOLEAN NOT NULL DEFAULT FALSE,
  dataTurno DATE NOT NULL,
  oraInizio VARCHAR(10) NOT NULL,
  oraFine VARCHAR(10) NOT NULL,
  orePausa DECIMAL(3,1) NULL,
  tipologiaTurno VARCHAR(100) NOT NULL,
  tipoMansione VARCHAR(100) NOT NULL,
  noteTurno VARCHAR(500) NULL,
  promemoriaTimbraturaInviata BOOLEAN NOT NULL DEFAULT FALSE,
  promemoriaCeckInNonEffettuato BOOLEAN NOT NULL DEFAULT FALSE,
  promemoriaCeckOutNonEffettuato BOOLEAN NOT NULL DEFAULT FALSE,
  alertCheckinMancante BOOLEAN NOT NULL DEFAULT FALSE,
  alertCheckOutMancante BOOLEAN NOT NULL DEFAULT FALSE,
  motivazioneRitardo VARCHAR(500) NULL,
  motivazioneContestazione VARCHAR(500) NULL,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idTurno),
  KEY idx_turno_operatore_data (idOperatore, dataTurno, oraInizio),
  KEY idx_turno_evento_data (idEvento, dataTurno),
  KEY idx_turno_check (idCheckInCheckOut),
  CONSTRAINT fk_turno_operatore FOREIGN KEY (idOperatore) REFERENCES dipendenti (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_turno_evento FOREIGN KEY (idEvento) REFERENCES evento (idEvento)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkInCheckOut (
  idCheckInCheckOut INT NOT NULL AUTO_INCREMENT,
  idOperatore INT NOT NULL,
  idTurno INT NULL,
  checkIn BOOLEAN NOT NULL,
  latitudine DECIMAL(15,12) NOT NULL,
  longitudine DECIMAL(15,12) NOT NULL,
  idCheckIn INT NULL,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idCheckInCheckOut),
  KEY idx_check_operatore_data (idOperatore, dataInserimento),
  KEY idx_check_turno_tipo (idTurno, checkIn),
  KEY idx_check_parent (idCheckIn),
  CONSTRAINT fk_check_operatore FOREIGN KEY (idOperatore) REFERENCES dipendenti (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_check_turno FOREIGN KEY (idTurno) REFERENCES turnoOperatore (idTurno)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_check_parent FOREIGN KEY (idCheckIn) REFERENCES checkInCheckOut (idCheckInCheckOut)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll (
  idPayroll INT NOT NULL AUTO_INCREMENT,
  idTurno INT NOT NULL,
  oraInizioDefinitivo VARCHAR(10) NOT NULL,
  oraFineDefinitivo VARCHAR(10) NOT NULL,
  orePausaDefinitivo DECIMAL(3,1) NOT NULL,
  stato VARCHAR(50) NOT NULL,
  dataInserimento DATETIME NOT NULL,
  PRIMARY KEY (idPayroll),
  UNIQUE KEY uq_payroll_turno (idTurno),
  KEY idx_payroll_stato (stato),
  CONSTRAINT fk_payroll_turno FOREIGN KEY (idTurno) REFERENCES turnoOperatore (idTurno)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contratto (
  idContratto INT NOT NULL AUTO_INCREMENT,
  idOperatore INT NULL,
  tipologia VARCHAR(100) NULL,
  qualifica VARCHAR(50) NULL,
  livello_inquadramento VARCHAR(20) NULL,
  data_inizio DATE NULL,
  data_fine DATE NULL,
  data_firma_contratto DATE NULL,
  citta_predefinita VARCHAR(100) NULL,
  indirizzo_predefinito VARCHAR(500) NULL,
  citta_alternativa VARCHAR(100) NULL,
  indirizzo_alternativo VARCHAR(500) NULL,
  lista_mansioni JSON NULL,
  compenso_totale_lordo DECIMAL(10,2) NULL DEFAULT 0,
  giorni_periodo_prova DECIMAL(3,0) NULL DEFAULT 0,
  contenuti_formazione VARCHAR(500) NULL,
  beni_strumentali VARCHAR(500) NULL,
  path_contratto VARCHAR(255) NULL,
  path_contratto_firmato VARCHAR(255) NULL,
  path_contratto_unilav VARCHAR(255) NULL,
  PRIMARY KEY (idContratto),
  KEY idx_contratto_operatore (idOperatore),
  CONSTRAINT fk_contratto_operatore FOREIGN KEY (idOperatore) REFERENCES dipendenti (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS allegati (
  idOperatore INT NOT NULL,
  carta_identita_ndocumento VARCHAR(50) NULL,
  carta_identita_data_scadenza VARCHAR(20) NULL,
  carta_identita_img_fronte VARCHAR(255) NULL,
  carta_identita_img_retro VARCHAR(255) NULL,
  tessera_sanitaria_ndocumento VARCHAR(50) NULL,
  tessera_sanitaria_data_scadenza VARCHAR(20) NULL,
  tessera_sanitaria_img_fronte VARCHAR(255) NULL,
  tessera_sanitaria_img_retro VARCHAR(255) NULL,
  permesso_soggiorno_ndocumento VARCHAR(50) NULL,
  permesso_soggiorno_data_scadenza VARCHAR(20) NULL,
  permesso_soggiorno_img_fronte VARCHAR(255) NULL,
  permesso_soggiorno_img_retro VARCHAR(255) NULL,
  antincendio_livello VARCHAR(50) NULL,
  antincendio_data_conseguimento VARCHAR(20) NULL,
  antincendio_doc_fronte VARCHAR(255) NULL,
  antincendio_doc_retro VARCHAR(255) NULL,
  primo_soccorso_livello VARCHAR(50) NULL,
  primo_soccorso_data_conseguimento VARCHAR(20) NULL,
  primo_soccorso_attestato_fronte VARCHAR(255) NULL,
  primo_soccorso_attestato_retro VARCHAR(255) NULL,
  formazione_sicurezza_lavoro_livello VARCHAR(100) NULL,
  formazione_sicurezza_lavoro_data_conseguimento VARCHAR(20) NULL,
  formazione_sicurezza_lavoro_attestato_fronte VARCHAR(255) NULL,
  formazione_sicurezza_lavoro_attestato_retro VARCHAR(255) NULL,
  blsd_livello VARCHAR(50) NULL,
  blsd_data_conseguimento VARCHAR(20) NULL,
  blsd_attestato_fronte VARCHAR(255) NULL,
  blsd_attestato_retro VARCHAR(255) NULL,
  passaporto_ndocumento VARCHAR(50) NULL,
  passaporto_data_scadenza VARCHAR(20) NULL,
  passaporto_img_fronte VARCHAR(255) NULL,
  passaporto_img_retro VARCHAR(255) NULL,
  attestato_preposto_livello VARCHAR(50) NULL,
  attestato_preposto_data_conseguimento VARCHAR(20) NULL,
  attestato_preposto_fronte VARCHAR(255) NULL,
  attestato_preposto_retro VARCHAR(255) NULL,
  attestato_security_manager_data_conseguimento VARCHAR(20) NULL,
  attestato_security_manager_fronte VARCHAR(255) NULL,
  PRIMARY KEY (idOperatore),
  CONSTRAINT fk_allegati_operatore FOREIGN KEY (idOperatore) REFERENCES dipendenti (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessione (
  idSessione INT NOT NULL AUTO_INCREMENT,
  idDipendente INT NOT NULL,
  sessione VARCHAR(200) NOT NULL,
  dataInserimento DATETIME NOT NULL,
  dataAggiornamento DATETIME NULL,
  PRIMARY KEY (idSessione),
  UNIQUE KEY uq_sessione_valore (sessione),
  KEY idx_sessione_dipendente (idDipendente),
  CONSTRAINT fk_sessione_dipendente FOREIGN KEY (idDipendente) REFERENCES dipendenti (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default table used by express-mysql-session.
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT NULL,
  PRIMARY KEY (session_id),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW view_turnoOperatore AS
SELECT
  idTurno, idOperatore, idEvento, teamLeader, orePausa, tipologiaTurno,
  tipoMansione, noteTurno, dataInserimento,
  STR_TO_DATE(CONCAT(dataTurno, ' ', oraInizio), '%Y-%m-%d %H:%i') AS dataInizio,
  STR_TO_DATE(CONCAT(
    CASE WHEN STR_TO_DATE(oraFine, '%H:%i') > STR_TO_DATE(oraInizio, '%H:%i')
      THEN dataTurno ELSE DATE_ADD(dataTurno, INTERVAL 1 DAY) END,
    ' ', oraFine), '%Y-%m-%d %H:%i') AS dataFine
FROM turnoOperatore;

DELIMITER //
CREATE PROCEDURE saveOrUpdateSessione (
  IN _idSessione INT,
  IN _idDipendente INT,
  IN _sessione VARCHAR(200)
)
BEGIN
  IF _idSessione = 0 THEN
    INSERT INTO sessione (idDipendente, sessione, dataInserimento)
    VALUES (_idDipendente, _sessione, NOW());
  ELSE
    UPDATE sessione
    SET sessione = _sessione, dataAggiornamento = NOW()
    WHERE idSessione = _idSessione AND idDipendente = _idDipendente;
  END IF;
  SELECT ROW_COUNT() AS affectedRows;
END//
DELIMITER ;
