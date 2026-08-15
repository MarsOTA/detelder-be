-- dipendenti
DELIMITER //
DROP TABLE `ezystaff`.`dipendenti`;
CREATE TABLE `ezystaff`.`dipendenti` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(45)  NOT NULL,
  `cognome` varchar(45)  NOT NULL,
  `telefono` varchar(45)  NOT NULL,
  `gpg` BOOLEAN  NOT NULL,
  `username` varchar(50)  NOT NULL,
  `password` varchar(100)  NOT NULL,
  `ruolo` varchar(20)  NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE dipendenti ADD COLUMN nickname VARCHAR(45) AFTER cognome;
ALTER TABLE dipendenti ADD COLUMN matricola VARCHAR(45) AFTER nickname;
ALTER TABLE dipendenti ADD COLUMN email VARCHAR(45) AFTER matricola;
ALTER TABLE dipendenti MODIFY `username` varchar(50) NULL;
ALTER TABLE dipendenti ADD COLUMN codice_fiscale VARCHAR(45) AFTER email;
ALTER TABLE dipendenti ADD COLUMN sesso VARCHAR(45) AFTER telefono;
ALTER TABLE dipendenti ADD COLUMN data_nascita VARCHAR(20) AFTER sesso;
ALTER TABLE dipendenti ADD COLUMN luogo_nascita VARCHAR(100) AFTER data_nascita;
ALTER TABLE dipendenti ADD COLUMN provincia_nascita VARCHAR(5) AFTER luogo_nascita;

ALTER TABLE dipendenti ADD COLUMN stato_nascita VARCHAR(20) AFTER provincia_nascita;
ALTER TABLE dipendenti MODIFY COLUMN stato_nascita VARCHAR(30);

ALTER TABLE dipendenti ADD COLUMN cittadinanza VARCHAR(30) AFTER stato_nascita;
ALTER TABLE dipendenti ADD COLUMN indirizzo_residenza VARCHAR(200) AFTER cittadinanza;
ALTER TABLE dipendenti ADD COLUMN numero_civico_residenza VARCHAR(10) AFTER indirizzo_residenza;
ALTER TABLE dipendenti ADD COLUMN comune_residenza VARCHAR(100) AFTER numero_civico_residenza;
ALTER TABLE dipendenti ADD COLUMN provincia_residenza VARCHAR(100) AFTER comune_residenza;
ALTER TABLE dipendenti ADD COLUMN cap_residenza VARCHAR(100) AFTER provincia_residenza;
ALTER TABLE dipendenti ADD COLUMN indirizzo_domicilio VARCHAR(200) AFTER cap_residenza;
ALTER TABLE dipendenti ADD COLUMN numero_civico_domicilio VARCHAR(10) AFTER indirizzo_domicilio;
ALTER TABLE dipendenti ADD COLUMN comune_domicilio VARCHAR(100) AFTER numero_civico_domicilio;
ALTER TABLE dipendenti ADD COLUMN provincia_domicilio VARCHAR(100) AFTER comune_domicilio;
ALTER TABLE dipendenti ADD COLUMN cap_domicilio VARCHAR(100) AFTER provincia_domicilio;


ALTER TABLE dipendenti ADD COLUMN residenza_uguale_domicilio BOOLEAN AFTER cap_residenza;
ALTER TABLE dipendenti ADD COLUMN altezza DECIMAL(5,2) NULL AFTER cap_domicilio;
ALTER TABLE dipendenti ADD COLUMN peso DECIMAL(5,2) NULL AFTER altezza;
ALTER TABLE dipendenti ADD COLUMN numero_scarpe DECIMAL(5,2) NULL AFTER peso;
ALTER TABLE dipendenti ADD COLUMN taglia_vestiti VARCHAR(100) NULL AFTER numero_scarpe;
ALTER TABLE dipendenti ADD COLUMN livello_istruzione VARCHAR(100) NULL AFTER taglia_vestiti;
ALTER TABLE dipendenti ADD COLUMN tesserino VARCHAR(100) NULL AFTER livello_istruzione;

ALTER TABLE dipendenti ADD COLUMN immagine_profilo VARCHAR(50) AFTER ruolo;
ALTER TABLE dipendenti DROP COLUMN immagine_profilo;

ALTER TABLE dipendenti ADD COLUMN img_profilo_primo_piano VARCHAR(50) AFTER ruolo;
ALTER TABLE dipendenti ADD COLUMN img_profilo_mezzo_busto VARCHAR(50) AFTER img_profilo_primo_piano;
ALTER TABLE dipendenti ADD COLUMN img_profilo_fig_intera VARCHAR(50) AFTER img_profilo_mezzo_busto;

ALTER TABLE dipendenti DROP COLUMN lista_mansioni;
ALTER TABLE dipendenti ADD COLUMN lista_mansioni JSON AFTER immagine_profilo;


ALTER TABLE ezystaff.dipendenti ADD COLUMN prefisso VARCHAR(10) AFTER cognome;
UPDATE ezystaff.dipendenti SET prefisso = '+39';
ALTER TABLE ezystaff.dipendenti MODIFY COLUMN prefisso VARCHAR(10) NOT NULL;


DELIMITER //
DROP TABLE `ezystaff`.`allegati`;
CREATE TABLE `ezystaff`.`allegati` (
  `idOperatore` int NOT NULL,
  `carta_identita_ndocumento` varchar(50) NULL,
  `carta_identita_data_scadenza` VARCHAR(20) NULL,
  `carta_identita_img_fronte` VARCHAR(50) NULL,
  `carta_identita_img_retro` VARCHAR(50) NULL,
  `tessera_sanitaria_ndocumento` varchar(50) NULL,
  `tessera_sanitaria_data_scadenza` VARCHAR(20) NULL,
  `tessera_sanitaria_img_fronte` VARCHAR(50) NULL,
  `tessera_sanitaria_img_retro` VARCHAR(50) NULL,
  `permesso_soggiorno_ndocumento` varchar(50) NULL,
  `permesso_soggiorno_data_scadenza` VARCHAR(20) NULL,
  `permesso_soggiorno_img_fronte` VARCHAR(50) NULL,
  `permesso_soggiorno_img_retro` VARCHAR(50) NULL, 
  `antincendio_livello` VARCHAR(50) NULL, 
  `antincendio_data_conseguimento` VARCHAR(20) NULL,
  `antincendio_doc_fronte` VARCHAR(50) NULL, 
  `antincendio_doc_retro` VARCHAR(50) NULL, 
  `primo_soccorso_livello` varchar(50) NULL,
  `primo_soccorso_data_conseguimento` VARCHAR(20) NULL,
  `primo_soccorso_attestato_fronte` VARCHAR(50) NULL, 
  `primo_soccorso_attestato_retro` VARCHAR(50) NULL, 
  `formazione_sicurezza_lavoro_livello` varchar(100) NULL,
  `formazione_sicurezza_lavoro_data_conseguimento` VARCHAR(20) NULL,
  `formazione_sicurezza_lavoro_attestato_fronte` VARCHAR(50) NULL, 
  `formazione_sicurezza_lavoro_attestato_retro` VARCHAR(50) NULL, 
  `blsd_livello` varchar(50) NULL,
  `blsd_data_conseguimento` VARCHAR(20) NULL,
  `blsd_attestato_fronte` VARCHAR(50) NULL, 
  `blsd_attestato_retro` VARCHAR(50) NULL, 
  `passaporto_ndocumento` varchar(50) NULL,
  `passaporto_data_scadenza` VARCHAR(20) NULL,
  `passaporto_img_fronte` VARCHAR(50) NULL, 
  `passaporto_img_retro` VARCHAR(50) NULL,    
  PRIMARY KEY (`idOperatore`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//


ALTER TABLE allegati ADD COLUMN `attestato_preposto_livello` VARCHAR(50) NULL;
ALTER TABLE allegati ADD COLUMN `attestato_preposto_data_conseguimento` VARCHAR(20) NULL;
ALTER TABLE allegati ADD COLUMN `attestato_preposto_fronte` VARCHAR(50) NULL;
ALTER TABLE allegati ADD COLUMN `attestato_preposto_retro` VARCHAR(50) NULL;

ALTER TABLE allegati ADD COLUMN `attestato_security_manager_data_conseguimento` VARCHAR(20) NULL;
ALTER TABLE allegati ADD COLUMN `attestato_security_manager_fronte` VARCHAR(50) NULL;


DELIMITER //
DROP TABLE `ezystaff`.`turnoOperatore`;
CREATE TABLE `ezystaff`.`turnoOperatore` (
  `idTurno` int NOT NULL AUTO_INCREMENT,
  `idOperatore` int NULL,
  `idEvento` int NOT NULL,
  `teamLeader` BOOLEAN  NOT NULL,
  `dataTurno` DATE NOT NULL,
  `oraInizio` varchar(10) NOT NULL,
  `oraFine` varchar(10) NOT NULL,
  `orePausa` DECIMAL(3,1) NULL,
  `tipologiaTurno` varchar(100) NOT NULL,  
  `tipoMansione` varchar(100) NOT NULL, 
  `noteTurno` varchar(500) NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idTurno`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE turnoOperatore ADD COLUMN idCheckInCheckOut INT NULL AFTER idOperatore;
ALTER TABLE turnoOperatore ADD COLUMN promemoriaTimbraturaInviata BOOLEAN NOT NULL DEFAULT FALSE AFTER noteTurno;

ALTER TABLE turnoOperatore ADD COLUMN promemoriaCeckInNonEffettuato BOOLEAN NOT NULL DEFAULT FALSE AFTER promemoriaTimbraturaInviata;
ALTER TABLE turnoOperatore ADD COLUMN alertCheckinMancante BOOLEAN NOT NULL DEFAULT FALSE AFTER promemoriaCeckInNonEffettuato;
ALTER TABLE turnoOperatore ADD COLUMN promemoriaCeckOutNonEffettuato BOOLEAN NOT NULL DEFAULT FALSE AFTER promemoriaCeckInNonEffettuato;
ALTER TABLE turnoOperatore ADD COLUMN alertCheckOutMancante BOOLEAN NOT NULL DEFAULT FALSE AFTER alertCheckinMancante;

ALTER TABLE turnoOperatore ADD COLUMN motivazioneRitardo varchar(500) NULL AFTER alertCheckOutMancante;
ALTER TABLE turnoOperatore ADD COLUMN motivazioneContestazione varchar(500) NULL AFTER motivazioneRitardo;

DELIMITER //
DROP TABLE `ezystaff`.`payroll`;
CREATE TABLE `ezystaff`.`payroll` (
  `idPayroll` int NOT NULL AUTO_INCREMENT,
  `idTurno` int NOT NULL,
  `oraInizioDefinitivo` varchar(10) NOT NULL,
  `oraFineDefinitivo` varchar(10) NOT NULL,
  `orePausaDefinitivo` DECIMAL(3,1) NOT NULL,  
  `stato` varchar(50)  NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idPayroll`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;  
//

DELIMITER //
CREATE OR REPLACE VIEW ezystaff.view_turnoOperatore AS
SELECT
    idTurno,
    idOperatore,
    idEvento,
    teamLeader,
    orePausa,
    tipologiaTurno,
    tipoMansione,
    noteTurno,
    dataInserimento,
    -- Calcolo dataInizio come DATETIME
    STR_TO_DATE(CONCAT(dataTurno, ' ', oraInizio), '%Y-%m-%d %H:%i') AS dataInizio,
    -- Calcolo dataFine come DATETIME considerando mezzanotte
    STR_TO_DATE(
        CONCAT(
            CASE 
                WHEN STR_TO_DATE(oraFine, '%H:%i') > STR_TO_DATE(oraInizio, '%H:%i') 
                THEN dataTurno
                ELSE DATE_ADD(dataTurno, INTERVAL 1 DAY)
            END,
            ' ',
            oraFine
        ),
        '%Y-%m-%d %H:%i'
    ) AS dataFine
FROM turnoOperatore;
//

DELIMITER //
DROP TABLE `ezystaff`.`checkInCheckOut`;
CREATE TABLE `ezystaff`.`checkInCheckOut` (
  `idCheckInCheckOut` int NOT NULL AUTO_INCREMENT,
  `idOperatore` int NOT NULL,
  `checkIn` BOOLEAN  NOT NULL,
  `latitudine` DECIMAL(15,12)  NOT NULL,
  `longitudine` DECIMAL(15,12)  NOT NULL, 
  `idCheckIn` int  NULL, 
  `dataInserimento` DATETIME NOT NULL,  
  PRIMARY KEY (`idCheckInCheckOut`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE checkInCheckOut ADD COLUMN idTurno INT NULL AFTER idOperatore;

DELIMITER //
DROP TABLE `ezystaff`.`sessione`;
CREATE TABLE `ezystaff`.`sessione` (
  `idSessione` int NOT NULL AUTO_INCREMENT,
  `idDipendente` int NOT NULL,
  `sessione` varchar(200) NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  `dataAggiornamento` DATETIME DEFAULT NULL,
  PRIMARY KEY (`idSessione`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

-- in produzione
DELIMITER //
DROP TABLE `ezystaff`.`sessions`;
CREATE TABLE `ezystaff`.`sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

-- per test
DELIMITER //
DROP TABLE `ezystaff`.`sessions`;
CREATE TABLE `ezystaff`.`sessions` (
  `session_id` varchar(128) COLLATE utf8_general_ci NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text COLLATE utf8_general_ci,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
//


DELIMITER //
DROP TABLE `ezystaff`.`cliente`;
CREATE TABLE `ezystaff`.`cliente` (
  `idCliente` int NOT NULL AUTO_INCREMENT,
  `ragioneSociale` varchar(200) NOT NULL,
  `piva_cfiscale` varchar(200) NOT NULL,
  `disabilitato` BOOLEAN  NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idCliente`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE cliente ADD COLUMN short_name VARCHAR(200) NULL AFTER ragioneSociale;

DELIMITER //
DROP TABLE `ezystaff`.`referente`;
CREATE TABLE `ezystaff`.`referente` (
  `idReferente` int NOT NULL AUTO_INCREMENT,
  `idCliente` int NOT NULL,
  `nome` varchar(200) NOT NULL,
  `email` varchar(80)  NULL,
  `telefono` varchar(30) NULL,
  `disabilitato` BOOLEAN  NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idReferente`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

DELIMITER //
DROP TABLE `ezystaff`.`brand`;
CREATE TABLE `ezystaff`.`brand` (
  `idBrand` int NOT NULL AUTO_INCREMENT,
  `idCliente` int NOT NULL,
  `nome` varchar(200) NOT NULL,
  `disabilitato` BOOLEAN  NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idBrand`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE brand ADD COLUMN short_name VARCHAR(200) NULL AFTER nome;

DELIMITER //
DROP TABLE `ezystaff`.`inidirizzo_brand`;
CREATE TABLE `ezystaff`.`inidirizzo_brand` (
  `idIndirizzo` int NOT NULL AUTO_INCREMENT,
  `idBrand` int NOT NULL,
  `via` varchar(1000) NOT NULL,
  `disabilitato` BOOLEAN  NOT NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idIndirizzo`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

DELIMITER //
DROP TABLE `ezystaff`.`evento`;
CREATE TABLE `ezystaff`.`evento` (
  `idEvento` int NOT NULL AUTO_INCREMENT,
  `nomeEvento` varchar(300) NULL,
  `idCliente` int NOT NULL,
  `idBrand` int NOT NULL,
  `idIndirizzo` int NOT NULL,  
  `indirizzo` varchar(800) NULL,
  `dataIniziale` DATE NOT NULL,
  `dataFinale` DATE NOT NULL,
  `codiceAttivita` varchar(50) NULL, 
  `note` varchar(1500) NULL,
  `nomeCognomeReferente` varchar(50) NULL,
  `telefonoReferente` varchar(20) NULL,
  `dataInserimento` DATETIME NOT NULL,
  PRIMARY KEY (`idEvento`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

UPDATE ezystaff.evento SET nomeEvento = NULL;

DELIMITER //
DROP TABLE `ezystaff`.`contratto`;
CREATE TABLE `ezystaff`.`contratto` (
  `idContratto` int NOT NULL AUTO_INCREMENT,
  `idOperatore` int NULL,
  `tipologia` varchar(100) NOT NULL, 
  `qualifica` varchar(50) NOT NULL, 
  `livello_inquadramento` varchar(20) NULL,
  `data_inizio` DATE NOT NULL,
  `data_fine` DATE NOT NULL,
  `lista_mansioni` JSON,
  `compenso_totale_lordo` DECIMAL(10,2) NULL DEFAULT 0,
  `giorni_periodo_prova` DECIMAL(3) NULL DEFAULT 0,
  `path_contratto` varchar(200) NULL, 
  PRIMARY KEY (`idContratto`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
//

ALTER TABLE contratto ADD COLUMN contenuti_formazione VARCHAR(500) AFTER giorni_periodo_prova;
ALTER TABLE contratto ADD COLUMN beni_strumentali VARCHAR(500) AFTER contenuti_formazione;
ALTER TABLE contratto MODIFY tipologia varchar(100) NULL;
ALTER TABLE contratto MODIFY qualifica varchar(50) NULL;
ALTER TABLE contratto MODIFY data_inizio DATE NULL;
ALTER TABLE contratto MODIFY data_fine DATE NULL;
ALTER TABLE contratto ADD COLUMN path_contratto_firmato VARCHAR(200) AFTER path_contratto;

ALTER TABLE contratto ADD COLUMN data_firma_contratto DATE NULL AFTER data_fine;

ALTER TABLE contratto ADD COLUMN citta_alternativa varchar(100) NULL AFTER data_firma_contratto;
ALTER TABLE contratto ADD COLUMN indirizzo_alternativo varchar(500) NULL AFTER citta_alternativa;

ALTER TABLE contratto ADD COLUMN path_contratto_unilav VARCHAR(200) AFTER path_contratto_firmato;

ALTER TABLE contratto ADD COLUMN citta_predefinita varchar(100) NULL AFTER data_firma_contratto;
ALTER TABLE contratto ADD COLUMN indirizzo_predefinito varchar(500) NULL AFTER citta_predefinita;

//Per vecchio mysql
ALTER TABLE `ezystaff`.`contratto` ADD COLUMN `lista_mansioni` TEXT AFTER `data_fine`;

DELIMITER //
DROP PROCEDURE IF EXISTS `ezystaff`.`saveOrUpdateSessione`;
CREATE PROCEDURE `ezystaff`.`saveOrUpdateSessione` (
    IN _idSessione INT,
    IN _idDipendente INT,
    IN _sessione VARCHAR(200)
)
BEGIN
	IF _idSessione = 0 THEN
		INSERT INTO sessione(idDipendente, sessione, dataInserimento) VALUES (_idDipendente,_sessione,NOW());        
	ELSE
		UPDATE sessione 
      SET dataAggiornamento = NOW() WHERE idSessione = _idSessione;
	END IF;
    
    SELECT ROW_COUNT() AS 'affectedRows';
END;
//

SHOW PROCEDURE STATUS WHERE Db = 'ezystaff';