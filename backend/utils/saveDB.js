
const fs = require("fs");

function saveDB() {
    fs.writeFileSync("./backend/database.json", JSON.stringify(global.db, null, 2));
}

module.exports = saveDB;
