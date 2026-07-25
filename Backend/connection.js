const mongoose =require("mongoose")
const MONGO_DB_URL = "mongodb://127.0.0.1:27017/selinoDB"
const ConnectionDB =async()=>{

    try{
        console.log(process.env.MONGO_DB_URL)
        const conn = await mongoose.connect(MONGO_DB_URL)

        console.log("Connection with Db established sucessfully")
    }
    catch(err){
        console.log("error while connecting with DB ",err)
    }
   
    
}

module.exports = ConnectionDB;