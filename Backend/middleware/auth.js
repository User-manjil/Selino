const bycrypt = require("bcryptjs")

async function hashPassword(password){
   return await bycrypt.hash(password,10);
}

// async function verifyPassword(password,hashed){
//     const isMatch = await bycrypt.compare(password,hashed);
//     return isMatch;
// }

module.exports = { hashPassword };