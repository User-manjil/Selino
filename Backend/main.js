const express = require('express')
const connectionDB = require("./connection")
const Port = 4000
const app = express()
const User = require("./models/user")
const {hashPassword } = require("./middleware/auth")


app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.get('/:id',(req,res)=>{
    console.log(req.params.id)
    res.end("This is first server running")
})


// verifyPassword()


app.post("/user",(req,res)=>{
    const data= req.body
        try{    
                
               
                User.create({
                    name:data.name,
                    email:data.email,
                    password : data.password,
                    role:data.role
                })
                res.end("User Created Sucessfully")
        }
        catch(err){
            res.status(404).json({message:"error while creating user",err})
        }
})

app.get("/user/delete",(req,res)=>{
    User.deleteMany({}).then((data)=>{data ,"Deleted Sucessfully"})
    res.end("Deleted Sucessfully")
})

connectionDB()
app.listen(Port , (req ,res)=>{
    console.log("The server is running  at www.localhost:",Port);})