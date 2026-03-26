const express = require("express");
const fs = require("fs");
const WebSocket = require("ws");

const app = express();
app.use(express.json());

let bots = {};
const DB = "uids.json";

// ================= BOT ENGINE =================
function startBot(uid) {
    if (bots[uid]) return;

    function connect() {
        const ws = new WebSocket("wss://echo.websocket.events");
        bots[uid] = ws;

        ws.on("open", () => {
            console.log(uid + " ONLINE");

            setInterval(() => {
                ws.send("heartbeat " + uid);
            }, 5000);
        });

        ws.on("close", () => {
            console.log(uid + " reconnecting...");
            setTimeout(connect, 3000);
        });

        ws.on("error", () => ws.close());
    }

    connect();
}

function stopBot(uid) {
    if (bots[uid]) {
        bots[uid].close();
        delete bots[uid];
    }
}

// ================= ADMIN =================
const ADMIN = { user: "anis", pass: "1234" };

app.post("/login", (req, res) => {
    const { user, pass } = req.body;
    res.send({ ok: user === ADMIN.user && pass === ADMIN.pass });
});

// ================= BOT CONTROL =================
app.post("/start", (req, res) => {
    const { uid } = req.body;

    startBot(uid);

    let data = [];
    if (fs.existsSync(DB)) data = JSON.parse(fs.readFileSync(DB));

    if (!data.includes(uid)) data.push(uid);
    fs.writeFileSync(DB, JSON.stringify(data));

    res.send("STARTED");
});

app.post("/stop", (req, res) => {
    stopBot(req.body.uid);
    res.send("STOPPED");
});

app.get("/list", (req, res) => {
    if (!fs.existsSync(DB)) return res.send([]);
    res.send(JSON.parse(fs.readFileSync(DB)));
});

// ================= FRONTEND =================
app.get("/", (req, res) => {
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ZyTRAx ULTRA+</title>
<style>
body{background:black;color:#00ffcc;text-align:center;font-family:Arial;}
.box{margin-top:100px;}
input{padding:10px;margin:5px;border-radius:10px;border:none;}
button{padding:10px 20px;border:none;border-radius:10px;background:#00ffcc;}
</style>
</head>
<body>

<h1>🔥 ZyTRAx ULTRA+ PANEL 🔥</h1>

<div class="box" id="login">
<input id="user" placeholder="Username">
<input id="pass" type="password" placeholder="Password">
<button onclick="login()">Login</button>
</div>

<div class="box" id="panel" style="display:none;">
<input id="uid" placeholder="Enter UID"><br>
<button onclick="start()">START</button>
<button onclick="stop()">STOP</button>

<h3>Saved UID</h3>
<ul id="list"></ul>
</div>

<script>
function login(){
fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({user:user.value,pass:pass.value})})
.then(r=>r.json())
.then(d=>{
if(d.ok){
login.style.display="none";
panel.style.display="block";
load();
}else alert("Wrong Login");
});
}

function start(){
fetch("/start",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({uid:uid.value})}).then(load);
}

function stop(){
fetch("/stop",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({uid:uid.value})});
}

function load(){
fetch("/list")
.then(r=>r.json())
.then(d=>{
list.innerHTML="";
d.forEach(u=>{
let li=document.createElement("li");
li.innerText=u;
list.appendChild(li);
});
});
}
</script>

</body>
</html>
`);
});

// ================= SERVER =================
app.listen(3000, () => console.log("🚀 ZyTRAx ULTRA+ LIVE"));
