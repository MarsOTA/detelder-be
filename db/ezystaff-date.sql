-- insert admin stage
DELIMITER //
LOCK TABLES `ezystaff`.`dipendenti` WRITE;
-- INSERT INTO `ezystaff`.`dipendenti` (nome, cognome, telefono, username, gpg, ruolo, password) VALUES ('','','','admin@example.com',false,'ADMIN','$2b$10$iAoPI60Of65rC6OaCRIfx.Zy6pGVfdJnBTS8DHrTU4KloYx8.y2Ce');
INSERT INTO `ezystaff`.`dipendenti` (nome, cognome, telefono, username, gpg, ruolo, password) VALUES ('','','admin@example.com','',false,'ADMIN','$2b$10$iAoPI60Of65rC6OaCRIfx.Zy6pGVfdJnBTS8DHrTU4KloYx8.y2Ce');
INSERT INTO `ezystaff`.`dipendenti` (nome, cognome, telefono, gpg, username, password, ruolo) VALUES ( 'Luca', 'Carletti', '3331234567', 0, 'l.carletti@hotmail.it', '$2b$10$iAoPI60Of65rC6OaCRIfx.Zy6pGVfdJnBTS8DHrTU4KloYx8.y2Ce', 'OPERATORE');
INSERT INTO `ezystaff`.`dipendenti` (nome, cognome, telefono, gpg, username, password, ruolo) VALUES ( 'Luca2', 'Carletti2', '3331234567', 0, 'l.carletti2@hotmail.it', '$2b$10$iAoPI60Of65rC6OaCRIfx.Zy6pGVfdJnBTS8DHrTU4KloYx8.y2Ce', 'OPERATORE');
UNLOCK TABLES;
//


-- insert admin prod
DELIMITER //
LOCK TABLES `ezystaff`.`dipendenti` WRITE;
INSERT INTO `ezystaff`.`dipendenti` (nome, cognome, telefono, gpg, username, password, ruolo) VALUES ('','','admin@detelder.com',0,'','$2b$10$ZlERcCpN7efQKyCEspMm2unHWTeGEy3jon4pCFOG4ixDIhppPKsFW','ADMIN');
UNLOCK TABLES;
//


SET SQL_SAFE_UPDATES = 0;
UPDATE `ezystaff`.`dipendenti` SET `email` = `username`;


UPDATE contratto SET citta_predefinita = citta_alternativa;
UPDATE contratto SET indirizzo_predefinito = indirizzo_alternativo;
UPDATE contratto SET citta_alternativa = null;
UPDATE contratto SET indirizzo_alternativo = null;