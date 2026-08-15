const bcrypt = require('bcrypt');

function generaPassword(lunghezza = 6) {
    //const caratteri = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    const caratteri = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < lunghezza; i++) {
        const randIndex = Math.floor(Math.random() * caratteri.length);
        password += caratteri[randIndex];
    }
    return password;
}

const registraNuovoUtente = async () => {
    const password = generaPassword();
    console.log(password);
    const hashedPwd = await bcrypt.hash(password, 10);
    console.log(hashedPwd);
}

registraNuovoUtente();

//per eseguirlo
//node creaPassword.js
