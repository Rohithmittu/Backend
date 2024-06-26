// require('dotenv').config({path: "./env"})  //instead use the down part
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.on("errror", (error) => {
        console.log("ERRR: ", error);
        throw error
    })

    app.listen(process.env.PORT || 4000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    })
  })
  .catch((e) => {
    console.log("MONGO DB connection failed!!!", e);
  });
