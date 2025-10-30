import dotenv from "dotenv";

dotenv.config({
    path: "./.env"
});
import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
.then(()=> {
    app.on("error", (error) => {
        console.error("Error connecting to the database:", error);
        throw error;
    });
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`app is listening on port ${process.env.PORT}`);
    }  )
}

)
.catch((err)=>{
    console.error("Failed to connect to the database:", err);
})









// import express from "express";
// const app = express();

// (async () => { 
// try {
//    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//    app.on("error", (error) => {
//      console.error("Error connecting to the database:", error);
//      throw error;
//    });

//    app.listen(process.env.PORT, ()=> {
//      console.log(`app is listening on port ${process.env.PORT}`);
     
//    })


    
// } catch (error) {
//     console.error("Error connecting to the database:", error);
// }
// }) ()