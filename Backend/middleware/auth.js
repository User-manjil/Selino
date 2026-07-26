const bycrypt = require("bcryptjs")

async function hashPassword(password){
   return await bycrypt.hash(password,10);
}

// async function verifyPassword(password,hashed){
//     const isMatch = await bycrypt.compare(password,hashed);
//     return isMatch;
// }

UserSchema.pre("save", function (next) {
    const user = this;
    if (!user.isModified("password")) return;

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = createHmac("sha256", salt).update(user.password).digest("hex");
    user.salt = salt; 
    user.password = hash;
    next()
})
module.exports = { hashPassword };