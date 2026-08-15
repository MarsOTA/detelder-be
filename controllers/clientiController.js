
const service = require('../services/clientiServices')

const creaNuovoUtente = async (req, res) => {
    const cliente = await service.ottieniClienteByPiva_cfiscale(req.body.piva_cfiscale);
    console.log("cliente: ", cliente);
    if (cliente == undefined) {
        await service.creaCliente(req.body);
        res.status(201).send({ 'message': 'created successfully.' });
    } else {
        res.status(409).send({ 'message': `client ${req.body.ragioneSociale} con P_iva / C_fiscale ${req.body.piva_cfiscale} già esistente` })
    }
}

const creaReferente = async (req, res) => {
    await service.creaReferente(req.body);
    res.status(201).send({ 'message': 'created successfully.' });
}

const creaBrand = async (req, res) => {
    await service.creaBrand(req.body);
    res.status(201).send({ 'message': 'created successfully.' });
}

const creaIndirizzoBrand = async (req, res) => {
    console.log("req.body: " , req.body)
    await service.creaInidirizzoBrand(req.body.idBrand, req.body.via);
    res.status(201).send({ 'message': 'created successfully.' });
}

const disabilitaCliente = async (req, res) => {
    await service.disabilitaCliente(req.params.selectedClientId);
    res.status(201).send({ 'message': 'Cliente disabilitato.' });
}

const disabilitaReferente = async (req, res) => {
    await service.disabilitaReferente(req.params.idReferente);
    res.status(201).send({ 'message': 'Referente disabilitato.' });
}

const disabilitaBrand = async (req, res) => {
    await service.disabilitaBrand(req.params.idBrand);
    res.status(201).send({ 'message': 'Brand disabilitato.' });
}

const disabilitaIndirizzo = async (req, res) => {
    await service.disabilitaInidirizzoBrand(req.params.idIndirizzo);
    res.status(201).send({ 'message': 'Indirizzo disabilitato.' });
}

const getClienti = async (req, res) => {
    const cliente = await service.ottieniListaClienti();
    res.send(cliente);
}

const getReferentiCliente = async (req, res) => {
    res.send(await service.ottieniListaReferentiCliente(req.params.selectedClientId));
}


const getBrandsCliente = async (req, res) => {
    const rows = await service.ottieniListaBrandsCliente(req.params.selectedClientId);
    const mappaBrand = new Map();

    rows.forEach((row) => {
        const { idBrand, brandNome, brandShortName, idIndirizzo, via, disabilitato } = row;

        if (!mappaBrand.has(idBrand)) {
            mappaBrand.set(idBrand, {
                idBrand,
                nome: brandNome,
                shortName: brandShortName,
                listaIndirizzi: [],
            });
        }

        if (idIndirizzo != null && !disabilitato) {
            mappaBrand.get(idBrand).listaIndirizzi.push({
                idIndirizzo,
                via,
            });
        }
    });

    const risultato = Array.from(mappaBrand.values());
    res.send(risultato);
};

const aggiornaReferente = async (req, res) => {
    await service.aggiornaReferente(req.body, req.params.idReferente);
    res.status(201).send({ 'message': 'Referente aggiornato.' });
}

const aggiornaBrand = async (req, res) => {
    await service.aggiornaBrand(req.body, req.params.idBrand);
    res.status(201).send({ 'message': 'Brand aggiornato.' });
}

const aggiornaCliente = async (req, res) => {
    await service.aggiornaCliente(req.body, req.params.idCliente);
    res.status(201).send({ 'message': 'Cliente aggiornato.' });
}



module.exports = {
    creaNuovoUtente,
    getClienti,
    creaReferente,
    getReferentiCliente,
    disabilitaCliente,
    disabilitaReferente,
    aggiornaReferente,
    creaBrand,
    getBrandsCliente,
    disabilitaBrand,
    aggiornaBrand,
    aggiornaCliente,
    creaIndirizzoBrand,
    disabilitaIndirizzo

}