const config = require("./config");
const { Client } = require("pg");
const isProduction = (config.NODE_ENV === "production");
let CONNECTION;

if (!isProduction) { 
  CONNECTION = {
  host: config.DATABASE_URL,
  port: config.DATABASE_PORT,
  user: config.DATABASE_USER,
  database: config.DATABASE,
  // ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
} else {
  CONNECTION = {
    ssl: { rejectUnauthorized: false },  
  };
}

const logQuery = (statement, parameters) => {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
};

module.exports = {
  async dbQuery(statement, ...parameters) {
    let client = new Client(CONNECTION);
    await client.connect();
    logQuery(statement, parameters);
    let result = await client.query(statement, parameters);
    await client.end();

    return result;
  }
};