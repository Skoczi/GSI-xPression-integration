const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const net = require("net");

const config = require("./config.json");

const app = express();
const port = config.webServerPort;
let allowCommands = true;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const dataFilePath = path.join(__dirname, "round_data.json");

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
}

function sendRosstalkCommand(command) {
    if (!allowCommands) return;

    const client = new net.Socket();
    client.connect(config.rosstalk.port, config.rosstalk.host, () => {
        console.log("Running command: " + command);
        client.write(command + "\r\n");
        client.end();
    });

    client.on("error", (err) => console.error("ROSSTALK ERROR: " + err.message));
    client.on("close", () => console.log("Connection closed"));
}

let previousState = { round: null, timeRemaining: null };
let currentGameState = { round: 1, timeRemaining: "00:00" };

app.post("/", (req, res) => {
    let roundNumber = req.body.map?.round;
    if (roundNumber === null || roundNumber === undefined) roundNumber = 1;
    else roundNumber += 1;

    const roundTimeRemaining = req.body.phase_countdowns?.phase_ends_in || null;
    const formattedTime = roundTimeRemaining ? formatTime(parseFloat(roundTimeRemaining)) : "Wrong time";

    const parsedData = { round: roundNumber, timeRemaining: formattedTime };
    currentGameState = parsedData;

    if (parsedData.round !== previousState.round || parsedData.timeRemaining !== previousState.timeRemaining) {
        previousState = { ...parsedData };
        console.log("Round: " + parsedData.round + ", Time: " + parsedData.timeRemaining);

        fs.writeFile(dataFilePath, JSON.stringify(parsedData, null, 2), (err) => {
            if (err) console.error("Error reading data: " + err);
        });

        if (allowCommands && config.triggerConfig[roundNumber] && formattedTime === config.triggerTime) {
            sendRosstalkCommand(config.triggerConfig[roundNumber]);
        }
    }
    res.sendStatus(200);
});

app.get("/state", (req, res) => res.json({ ...currentGameState, allowCommands }));
app.post("/toggle", (req, res) => {
    allowCommands = !allowCommands;
    res.json({ allowCommands });
});

app.listen(port, () => console.log("Server running on port: " + port));